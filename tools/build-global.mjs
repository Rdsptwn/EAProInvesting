/**
 * Data mode Global -> assets/data/global-*.json (tanpa API key).
 *   global-screener.json    harga saham & ETF AS (Yahoo chart), dari global-universe.json
 *   global-commodities.json minyak, emas, perak, tembaga, gas, batu bara, USD/IDR, indeks dunia, kripto
 *   global-news.json        judul berita dari RSS (Al Jazeera, BBC, CNBC, MarketWatch, Yahoo Finance, CNBC Indonesia, IDX Channel, Bloomberg Technoz, Antara, Liputan6, Okezone, Detik Finance)
 *   global-ipo.json         kalender IPO AS (Nasdaq)
 * Tiap bagian gagal-aman: kalau sumber tidak bisa diambil, file lama TIDAK ditimpa.
 * Jalankan: node tools/build-global.mjs [screener|commodities|news|ipo ...]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = (f) => path.join(root, 'assets/data', f);
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const n2 = (v, d = 2) => (Number.isFinite(v) ? +v.toFixed(d) : null);

/* ---------- Yahoo chart ---------- */
export function parseChart(json, spark = 0) {
    const r = json?.chart?.result?.[0];
    if (!r) return null;
    const meta = r.meta || {};
    const q = r.indicators?.quote?.[0] || {};
    const closes = (q.close || []).filter((v) => Number.isFinite(v) && v > 0);
    const price = Number(meta.regularMarketPrice) > 0 ? Number(meta.regularMarketPrice) : closes[closes.length - 1];
    if (!Number.isFinite(price)) return null;
    const lastClose = closes[closes.length - 1];
    const lastIsToday = Math.abs(lastClose - price) / price < 0.0005;
    const prev = lastIsToday ? closes[closes.length - 2] : lastClose;
    const chg = Number.isFinite(prev) && prev > 0 ? ((price - prev) / prev) * 100 : null;
    const m1 = closes.length > 21 ? closes[closes.length - 22] : closes[0];
    const chg1m = Number.isFinite(m1) && m1 > 0 ? ((price - m1) / m1) * 100 : null;
    const vols = q.volume || [];
    const v20 = vols.slice(-20).filter((v) => Number.isFinite(v));
    return {
        price, prev, chg, chg1m,
        low52: Number(meta.fiftyTwoWeekLow) || null,
        high52: Number(meta.fiftyTwoWeekHigh) || null,
        vol: Number(meta.regularMarketVolume) || (vols.length ? vols[vols.length - 1] : null),
        avgVol: v20.length ? v20.reduce((a, b) => a + b, 0) / v20.length : null,
        cur: meta.currency || 'USD',
        state: meta.marketState || null,
        time: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
        name: meta.longName || meta.shortName || '',
        spark: spark ? closes.slice(-spark).map((v) => n2(v, 4)) : undefined,
    };
}

async function fetchChart(sym, range = '3mo', spark = 0) {
    for (let a = 0; a < 3; a++) {
        try {
            const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=${range}`;
            const res = await fetch(url, { headers: { ...UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
            if (res.status === 404) return null;
            if (res.status === 429) { await sleep(2500 * (a + 1)); continue; }
            if (!res.ok) throw new Error(res.status);
            return parseChart(await res.json(), spark);
        } catch (e) {
            if (a === 2) return null;
            await sleep(700 * (a + 1));
        }
    }
    return null;
}

async function pool(items, fn, conc = 8) {
    let i = 0;
    const out = new Array(items.length);
    await Promise.all(Array.from({ length: conc }, async () => {
        while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); await sleep(60); }
    }));
    return out;
}

function writeSafe(file, obj, ok, label) {
    if (!ok) { console.error(`${label}: hasil tidak layak — file lama dipertahankan`); return false; }
    fs.writeFileSync(D(file), JSON.stringify(obj));
    console.log(`${label}: ditulis ${file}`);
    return true;
}


/* ---------- 0. Anggota indeks (S&P 500, Nasdaq-100, Dow 30) dari Wikipedia ---------- */
const SECTOR_ID = { 'information technology': 'Teknologi', financials: 'Keuangan', 'health care': 'Kesehatan', 'consumer discretionary': 'Konsumer', 'consumer staples': 'Konsumer', industrials: 'Industri', energy: 'Energi', utilities: 'Utilitas', 'real estate': 'Properti', materials: 'Bahan Baku', 'communication services': 'Komunikasi', technology: 'Teknologi', 'consumer services': 'Konsumer', 'telecommunications': 'Komunikasi', 'basic materials': 'Bahan Baku' };
const sectorId = (x) => { const k = String(x || '').toLowerCase().replace(/\s+/g, ' ').trim(); return SECTOR_ID[k] || (x ? String(x).trim() : ''); };
export function parseConstituents(html) {
    const tables = String(html || '').match(/<table[\s\S]*?<\/table>/gi) || [];
    let best = [];
    for (const t of tables) { const r = parseTable(t); if (r.length > best.length) best = r; }
    return best;
}
function parseTable(tblHtml) {
    const rows = tblHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const clean = (c) => strip(c).replace(/\[[\w ]+\]/g, '').trim();
    let idx = null; const out = []; const seen = new Set();
    for (const row of rows) {
        const cells = row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
        if (cells.length < 2) continue;
        if (!idx) {
            const names = cells.map((x) => clean(x).toLowerCase());
            const sym = names.findIndex((n) => /^(symbol|ticker)/.test(n));
            if (sym < 0) continue;
            idx = { sym, name: names.findIndex((n) => /^(security|company|name)/.test(n)), sector: names.findIndex((n) => /gics sector|^industry|^sector/.test(n)) };
            continue;
        }
        let t = clean(cells[idx.sym] || '').toUpperCase().replace(/^.*:\s*/, '').replace(/\./g, '-');
        if (!/^[A-Z0-9-]{1,7}$/.test(t) || seen.has(t)) continue;
        seen.add(t);
        out.push({ t, n: idx.name >= 0 ? clean(cells[idx.name] || '') : '', s: idx.sector >= 0 ? sectorId(clean(cells[idx.sector] || '')) : '' });
    }
    return out;
}
function parseCsv(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
        else if (c === '"') q = true;
        else if (c === ',') { row.push(cur); cur = ''; }
        else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
        else if (c !== '\r') cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
}
export function parseIsharesHoldings(text) {
    const rows = parseCsv(String(text || '').replace(/^\uFEFF/, ''));
    const hi = rows.findIndex((r) => r.some((x) => x.trim() === 'Ticker') && r.some((x) => x.trim() === 'Name'));
    if (hi < 0) return [];
    const H = rows[hi].map((x) => x.trim());
    const it = H.indexOf('Ticker'), inm = H.indexOf('Name'), isec = H.indexOf('Sector'), iac = H.indexOf('Asset Class');
    const out = [], seen = new Set();
    for (const r of rows.slice(hi + 1)) {
        if (iac >= 0 && (r[iac] || '').trim() !== 'Equity') continue;
        const t = String(r[it] || '').trim().toUpperCase().replace(/\./g, '-');
        if (!/^[A-Z][A-Z0-9-]{0,6}$/.test(t) || seen.has(t)) continue;
        seen.add(t);
        out.push({ t, n: (r[inm] || '').trim(), s: sectorId((r[isec] || '').trim()) });
    }
    return out;
}
const MEMBER_PAGES = { spx: [['List_of_S%26P_500_companies'], 450], ndx: [['List_of_Nasdaq-100_companies', 'Nasdaq-100'], 80], dji: [['List_of_Dow_Jones_Industrial_Average_companies', 'Dow_Jones_Industrial_Average'], 25] };
async function buildMembers() {
    let old = {};
    try { old = JSON.parse(fs.readFileSync(D('global-index-members.json'), 'utf8')); } catch (_) {}
    const out = { meta: { source: 'Wikipedia (daftar anggota indeks)', built: new Date().toISOString() }, spx: old.spx || [], ndx: old.ndx || [], dji: old.dji || [], rut: old.rut || [], info: old.info || {} };
    let changed = false;
    for (const [k, [pages, min]] of Object.entries(MEMBER_PAGES)) {
        let ok = false;
        for (const page of pages) {
            try {
                const res = await fetch(`https://en.wikipedia.org/wiki/${page}`, { headers: { ...UA, Accept: 'text/html' }, signal: AbortSignal.timeout(30000) });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const list = parseConstituents(await res.text());
                if (list.length < min) throw new Error('hanya ' + list.length + ' baris (min ' + min + ')');
                out[k] = list.map((x) => x.t);
                list.forEach((x) => { out.info[x.t] = { n: x.n || (out.info[x.t] || {}).n || '', s: x.s || (out.info[x.t] || {}).s || '' }; });
                changed = true; ok = true; console.log('members', k, page, list.length);
                break;
            } catch (e) { console.error('members', k, page, e.message); }
        }
        if (!ok && k === 'ndx') {
            try {
                const res = await fetch('https://api.nasdaq.com/api/quote/list-type/nasdaq100', { headers: { ...UA, Accept: 'application/json, text/plain, */*', Origin: 'https://www.nasdaq.com', Referer: 'https://www.nasdaq.com/' }, signal: AbortSignal.timeout(30000) });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const j = await res.json();
                const rows = j?.data?.data?.rows || [];
                const list = rows.map((r) => ({ t: String(r.symbol || '').toUpperCase().replace(/\./g, '-'), n: r.companyName || '' })).filter((x) => /^[A-Z0-9-]{1,7}$/.test(x.t));
                if (list.length < min) throw new Error('hanya ' + list.length);
                out.ndx = list.map((x) => x.t);
                list.forEach((x) => { const o = out.info[x.t] || {}; out.info[x.t] = { n: o.n || x.n, s: o.s || '' }; });
                changed = true; ok = true; console.log('members ndx nasdaq.com', list.length);
            } catch (e) { console.error('members ndx nasdaq.com', e.message); }
        }
        if (!ok) console.error('members', k, '— pakai data lama');
    }
    let rutOk = false, rutNote = '';
    try {
        const res = await fetch('https://www.ishares.com/us/products/239710/ishares-russell-2000-etf/1467271812596.ajax?fileType=csv&fileName=IWM_holdings&dataType=fund', { headers: { ...UA, Accept: 'text/csv,*/*', Referer: 'https://www.ishares.com/' }, signal: AbortSignal.timeout(40000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const txt = await res.text();
        const list = parseIsharesHoldings(txt);
        if (list.length < 1200) throw new Error('hanya ' + list.length + ' baris; awal respons: ' + JSON.stringify(txt.slice(0, 160)));
        out.rut = list.map((x) => x.t);
        list.forEach((x) => { const o = out.info[x.t] || {}; out.info[x.t] = { n: o.n || x.n, s: o.s || x.s }; });
        changed = true; rutOk = true; rutNote = 'iShares IWM (daftar resmi ETF Russell 2000)'; console.log('members rut iShares', list.length);
    } catch (e) { console.error('members rut iShares', e.message); }
    if (!rutOk) {
        // Cadangan: saham AS kapitalisasi peringkat ±1001–3000 (nasdaq.com), mendekati Russell 2000 tetapi BUKAN daftar resmi
        try {
            const res = await fetch('https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&offset=0&download=true', { headers: { ...UA, Accept: 'application/json, text/plain, */*', Origin: 'https://www.nasdaq.com', Referer: 'https://www.nasdaq.com/' }, signal: AbortSignal.timeout(60000) });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const j = await res.json();
            const rows = (j?.data?.rows || j?.data?.table?.rows || [])
                .map((r) => ({ t: String(r.symbol || '').trim().toUpperCase().replace(/\./g, '-'), n: r.name || '', s: sectorId(r.sector || ''), cap: Number(String(r.marketCap || '').replace(/[^0-9.]/g, '')), c: String(r.country || '') }))
                .filter((r) => /^[A-Z]{1,5}(-[A-Z])?$/.test(r.t) && r.cap > 0 && /united states/i.test(r.c) && !/ETF|Fund|Trust|Warrant|Unit|Preferred/i.test(r.n))
                .sort((a, b) => b.cap - a.cap);
            if (rows.length < 2500) throw new Error('hanya ' + rows.length + ' baris');
            const list = rows.slice(1000, 3000);
            out.rut = list.map((x) => x.t);
            list.forEach((x) => { const o = out.info[x.t] || {}; out.info[x.t] = { n: o.n || x.n, s: o.s || x.s }; });
            changed = true; rutNote = 'Perkiraan: saham AS kapitalisasi peringkat 1.001–3.000 (nasdaq.com). Bukan daftar resmi Russell 2000.'; console.log('members rut perkiraan nasdaq.com', list.length);
        } catch (e) { console.error('members rut nasdaq.com', e.message, '— pakai data lama'); out.rut = old.rut || []; rutNote = old.meta?.rutNote || ''; }
    }
    out.meta.rutNote = rutNote;
    writeSafe('global-index-members.json', out, changed || out.spx.length > 0, 'members');
}
function loadUniverse() {
    const base = JSON.parse(fs.readFileSync(D('global-universe.json'), 'utf8')).items;
    let mem = null;
    try { mem = JSON.parse(fs.readFileSync(D('global-index-members.json'), 'utf8')); } catch (_) {}
    if (!mem) return base;
    const have = new Set(base.map((x) => x.t));
    const extra = [];
    for (const t of new Set([...(mem.spx || []), ...(mem.ndx || []), ...(mem.dji || []), ...(mem.rut || [])])) {
        if (have.has(t)) continue;
        const i = mem.info[t] || {};
        extra.push({ t, n: i.n || t, s: i.s || '' });
    }
    // Tambahan manual (mis. kolam bot WA): ticker tak valid otomatis terbuang karena Yahoo tidak punya datanya.
    try {
        const man = JSON.parse(fs.readFileSync(D('global-extra.json'), 'utf8')).items || [];
        const seen = new Set([...base, ...extra].map((x) => x.t));
        for (const t0 of man) { const t = String(t0).toUpperCase().replace(/\./g, '-'); if (!seen.has(t)) { seen.add(t); extra.push({ t, n: t, s: '' }); } }
    } catch (_) {}
    return [...base, ...extra];
}

/* ---------- 1. Screener ---------- */
async function buildScreener() {
    const uni = loadUniverse();
    const res = await pool(uni, (u) => fetchChart(u.t, '3mo'), 8);
    const rows = [];
    uni.forEach((u, i) => {
        const r = res[i];
        if (!r) return;
        rows.push([u.t, n2(r.price), n2(r.prev), n2(r.chg), n2(r.chg1m), n2(r.low52), n2(r.high52), r.vol ? Math.round(r.vol) : null, r.avgVol ? Math.round(r.avgVol) : null, r.time ? r.time.slice(0, 10) : null, u.n || r.name, u.s || '']);
    });
    writeSafe('global-screener.json', {
        meta: { source: 'Yahoo Finance', built: new Date().toISOString(), count: rows.length, universe: uni.length, cols: ['t', 'price', 'prev', 'chg', 'chg1m', 'low52', 'high52', 'vol', 'avgVol', 'date', 'name', 'sector'] },
        rows,
    }, rows.length >= Math.min(60, uni.length * 0.5), 'screener');
}

/* ---------- 2. Komoditas & indeks ---------- */
export const MARKETS = [
    { id: 'brent', g: 'komoditas', n: 'Minyak Brent', s: 'BZ=F', u: 'USD/barel' },
    { id: 'wti', g: 'komoditas', n: 'Minyak WTI', s: 'CL=F', u: 'USD/barel' },
    { id: 'gold', g: 'komoditas', n: 'Emas', s: 'GC=F', u: 'USD/oz' },
    { id: 'silver', g: 'komoditas', n: 'Perak', s: 'SI=F', u: 'USD/oz' },
    { id: 'copper', g: 'komoditas', n: 'Tembaga', s: 'HG=F', u: 'USD/lb' },
    { id: 'gas', g: 'komoditas', n: 'Gas Alam', s: 'NG=F', u: 'USD/MMBtu' },
    { id: 'coal', g: 'komoditas', n: 'Batu Bara Newcastle', s: 'MTF=F', u: 'USD/ton' },
    { id: 'platinum', g: 'komoditas', n: 'Platina', s: 'PL=F', u: 'USD/oz' },
    { id: 'palladium', g: 'komoditas', n: 'Paladium', s: 'PA=F', u: 'USD/oz' },
    { id: 'wheat', g: 'komoditas', n: 'Gandum', s: 'ZW=F', u: 'USc/bushel' },
    { id: 'corn', g: 'komoditas', n: 'Jagung', s: 'ZC=F', u: 'USc/bushel' },
    { id: 'soy', g: 'komoditas', n: 'Kedelai', s: 'ZS=F', u: 'USc/bushel' },
    { id: 'sugar', g: 'komoditas', n: 'Gula', s: 'SB=F', u: 'USc/lb' },
    { id: 'coffee', g: 'komoditas', n: 'Kopi', s: 'KC=F', u: 'USc/lb' },
    { id: 'cocoa', g: 'komoditas', n: 'Kakao', s: 'CC=F', u: 'USD/ton' },
    { id: 'usdidr', g: 'kurs', n: 'USD/IDR', s: 'IDR=X', u: 'Rp' },
    { id: 'dxy', g: 'kurs', n: 'Indeks Dolar (DXY)', s: 'DX-Y.NYB', u: '' },
    { id: 'aluminium', g: 'komoditas', n: 'Aluminium', s: 'ALI=F', u: 'USD/ton', opt: true },
    { id: 'zinc', g: 'komoditas', n: 'Seng', s: 'ZNC=F', u: 'USD/ton', opt: true },
    { id: 'nickel', g: 'komoditas', n: 'Nikel', s: 'NI=F', u: 'USD/ton', opt: true },
    { id: 'tin', g: 'komoditas', n: 'Timah', s: 'TIN=F', u: 'USD/ton', opt: true },
    { id: 'cpo', g: 'komoditas', n: 'CPO (Minyak Sawit)', s: 'FCPO=F', u: 'MYR/ton', opt: true },
    { id: 'rubber', g: 'komoditas', n: 'Karet', s: 'JRU=F', u: 'JPY/kg', opt: true },
    { id: 'heating', g: 'komoditas', n: 'Heating Oil', s: 'HO=F', u: 'USD/galon', opt: true },
    { id: 'gasoline', g: 'komoditas', n: 'Bensin RBOB', s: 'RB=F', u: 'USD/galon', opt: true },
    { id: 'cotton', g: 'komoditas', n: 'Kapas', s: 'CT=F', u: 'USc/lb', opt: true },
    { id: 'rice', g: 'komoditas', n: 'Beras', s: 'ZR=F', u: 'USD/cwt', opt: true },
    { id: 'lumber', g: 'komoditas', n: 'Kayu Lapis', s: 'LBS=F', u: 'USD/mbf', opt: true },
    { id: 'sgdidr', g: 'kurs', n: 'SGD/IDR · Dolar Singapura', s: 'SGDIDR=X', u: '' },
    { id: 'euridr', g: 'kurs', n: 'EUR/IDR · Euro', s: 'EURIDR=X', u: '' },
    { id: 'audidr', g: 'kurs', n: 'AUD/IDR · Dolar Australia', s: 'AUDIDR=X', u: '' },
    { id: 'cnyidr', g: 'kurs', n: 'CNY/IDR · Yuan China', s: 'CNYIDR=X', u: '' },
    { id: 'jpyidr', g: 'kurs', n: 'JPY/IDR · Yen Jepang', s: 'JPYIDR=X', u: '' },
    { id: 'gbpidr', g: 'kurs', n: 'GBP/IDR · Poundsterling', s: 'GBPIDR=X', u: '' },
    { id: 'myridr', g: 'kurs', n: 'MYR/IDR · Ringgit Malaysia', s: 'MYRIDR=X', u: '' },
    { id: 'hkdidr', g: 'kurs', n: 'HKD/IDR · Dolar Hong Kong', s: 'HKDIDR=X', u: '' },
    { id: 'sar', g: 'kurs', n: 'SAR/IDR · Riyal Saudi', s: 'SARIDR=X', u: '' },
    { id: 'krwidr', g: 'kurs', n: 'KRW/IDR · Won Korea', s: 'KRWIDR=X', u: '' },
    { id: 'thbidr', g: 'kurs', n: 'THB/IDR · Baht Thailand', s: 'THBIDR=X', u: '' },
    { id: 'inridr', g: 'kurs', n: 'INR/IDR · Rupee India', s: 'INRIDR=X', u: '' },
    { id: 'nzdidr', g: 'kurs', n: 'NZD/IDR · Dolar Selandia Baru', s: 'NZDIDR=X', u: '' },
    { id: 'chfidr', g: 'kurs', n: 'CHF/IDR · Franc Swiss', s: 'CHFIDR=X', u: '' },
    { id: 'eurusd', g: 'kurs', n: 'EUR/USD', s: 'EURUSD=X', u: '' },
    { id: 'gbpusd', g: 'kurs', n: 'GBP/USD', s: 'GBPUSD=X', u: '' },
    { id: 'usdjpy', g: 'kurs', n: 'USD/JPY', s: 'JPY=X', u: '' },
    { id: 'audusd', g: 'kurs', n: 'AUD/USD', s: 'AUDUSD=X', u: '' },
    { id: 'usdcny', g: 'kurs', n: 'USD/CNY', s: 'CNY=X', u: '' },
    { id: 'usdsgd', g: 'kurs', n: 'USD/SGD', s: 'SGD=X', u: '' },
    { id: 'kospi', g: 'indeks', n: 'KOSPI Korea Selatan', s: '^KS11', u: '' },
    { id: 'sse', g: 'indeks', n: 'Shanghai Composite', s: '000001.SS', u: '' },
    { id: 'szse', g: 'indeks', n: 'Shenzhen Component', s: '399001.SZ', u: '' },
    { id: 'cac', g: 'indeks', n: 'CAC 40 Prancis', s: '^FCHI', u: '' },
    { id: 'stoxx', g: 'indeks', n: 'Euro Stoxx 50', s: '^STOXX50E', u: '' },
    { id: 'asx', g: 'indeks', n: 'ASX 200 Australia', s: '^AXJO', u: '' },
    { id: 'twii', g: 'indeks', n: 'TAIEX Taiwan', s: '^TWII', u: '' },
    { id: 'sensex', g: 'indeks', n: 'BSE Sensex India', s: '^BSESN', u: '' },
    { id: 'nifty', g: 'indeks', n: 'Nifty 50 India', s: '^NSEI', u: '' },
    { id: 'klci', g: 'indeks', n: 'KLCI Malaysia', s: '^KLSE', u: '' },
    { id: 'set', g: 'indeks', n: 'SET Thailand', s: '^SET.BK', u: '' },
    { id: 'bvsp', g: 'indeks', n: 'Bovespa Brasil', s: '^BVSP', u: '' },
    { id: 'tsx', g: 'indeks', n: 'TSX Kanada', s: '^GSPTSE', u: '' },
    { id: 'btc', g: 'kripto', n: 'Bitcoin', s: 'BTC-USD', u: 'USD' },
    { id: 'eth', g: 'kripto', n: 'Ethereum', s: 'ETH-USD', u: 'USD' },
    { id: 'sol', g: 'kripto', n: 'Solana', s: 'SOL-USD', u: 'USD' },
    { id: 'bnb', g: 'kripto', n: 'BNB', s: 'BNB-USD', u: 'USD' },
    { id: 'xrp', g: 'kripto', n: 'XRP', s: 'XRP-USD', u: 'USD' },
    { id: 'ihsg', g: 'indeks', n: 'IHSG', s: '^JKSE', u: '' },
    { id: 'spx', g: 'indeks', n: 'S&P 500', s: '^GSPC', u: '' },
    { id: 'rut', g: 'indeks', n: 'Russell 2000', s: '^RUT', u: '' },
    { id: 'ndx', g: 'indeks', n: 'Nasdaq Composite', s: '^IXIC', u: '' },
    { id: 'dji', g: 'indeks', n: 'Dow Jones', s: '^DJI', u: '' },
    { id: 'n225', g: 'indeks', n: 'Nikkei 225', s: '^N225', u: '' },
    { id: 'hsi', g: 'indeks', n: 'Hang Seng', s: '^HSI', u: '' },
    { id: 'sti', g: 'indeks', n: 'STI Singapura', s: '^STI', u: '' },
    { id: 'ftse', g: 'indeks', n: 'FTSE 100', s: '^FTSE', u: '' },
    { id: 'dax', g: 'indeks', n: 'DAX', s: '^GDAXI', u: '' },
    { id: 'vix', g: 'indeks', n: 'VIX (indeks ketakutan)', s: '^VIX', u: '' },
    { id: 'ust10', g: 'indeks', n: 'Yield US Treasury 10Y', s: '^TNX', u: '%' },
];

async function buildCommodities() {
    const res = await pool(MARKETS, (m) => fetchChart(m.s, '1mo', 30), 6);
    const items = [];
    const missing = MARKETS.filter((m, i) => !res[i]).map((m) => m.s);
    if (missing.length) console.log('simbol tanpa data (dilewati):', missing.join(', '));
    MARKETS.forEach((m, i) => { const r = res[i]; if (r) items.push({ id: m.id, g: m.g, n: m.n, u: m.u, s: m.s, price: n2(r.price, 4), chg: n2(r.chg), chg1m: n2(r.chg1m), spark: r.spark, time: r.time }); });
    const by = Object.fromEntries(items.map((x) => [x.id, x]));
    // Emas dalam rupiah per gram = USD/oz × kurs ÷ 31,1035
    const derived = {};
    if (by.gold && by.usdidr) derived.goldIdrGram = Math.round((by.gold.price * by.usdidr.price) / 31.1034768);
    writeSafe('global-commodities.json', { meta: { source: 'Yahoo Finance', built: new Date().toISOString(), note: 'Harga futures/indeks, tertunda. Emas Rp/gram = harga emas dunia × kurs ÷ 31,1035 (bukan harga toko/Antam).' }, derived, items },
        items.length >= 8 && by.gold && by.brent, 'commodities');
}

/* ---------- 3. Berita (RSS) ---------- */
export const FEEDS = [
    { id: 'aljazeera', n: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', lang: 'en', topic: 'dunia' },
    { id: 'bbc-biz', n: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', lang: 'en', topic: 'bisnis' },
    { id: 'cnbc', n: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', lang: 'en', topic: 'pasar' },
    { id: 'mw', n: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', lang: 'en', topic: 'pasar' },
    { id: 'guardian', n: 'The Guardian Business', url: 'https://www.theguardian.com/business/rss', lang: 'en', topic: 'bisnis' },
    { id: 'cnbcid', n: 'CNBC Indonesia', url: 'https://www.cnbcindonesia.com/market/rss', lang: 'id', topic: 'pasar' },
    // Berita Indonesia tambahan (RSS publik, sudah dites bisa dibaca 27 Nov 2026). Kompas, Tempo, Kontan, Bisnis, Suara, iNews tidak bisa dites dari sini, jadi belum dipakai.
    { id: 'idxch', n: 'IDX Channel', url: 'https://www.idxchannel.com/rss', lang: 'id', topic: 'pasar', max: 20 },
    { id: 'btz', n: 'Bloomberg Technoz', url: 'https://www.bloombergtechnoz.com/rss', lang: 'id', topic: 'pasar', max: 20 },
    { id: 'antara', n: 'Antara Ekonomi', url: 'https://www.antaranews.com/rss/ekonomi-bisnis.xml', lang: 'id', topic: 'bisnis', max: 20 },
    { id: 'lip6', n: 'Liputan6 Bisnis', url: 'https://feed.liputan6.com/rss/bisnis', lang: 'id', topic: 'bisnis', max: 20 },
    { id: 'okz', n: 'Okezone Ekonomi', url: 'https://sindikasi.okezone.com/index.php/rss/11/RSS2.0', lang: 'id', topic: 'bisnis', max: 20 },
    { id: 'detikfin', n: 'Detik Finance', url: 'https://finance.detik.com/rss', lang: 'id', topic: 'bisnis', max: 20 },
    // Tanpa RSS: dibaca dari HTML (parseLinks). Struktur HTML belum pernah dilihat langsung dari sini, jadi cek `status` di global-news.json setelah run pertama.
    { id: 'stockbit', n: 'Stockbit Snips', url: 'https://snips.stockbit.com/', lang: 'id', topic: 'pasar', max: 15, html: /^https:\/\/snips\.stockbit\.com\/[^?#]+/ },
    { id: 'bibit', n: 'Bibit', url: 'https://blog.bibit.id/blog-1/category/News', lang: 'id', topic: 'pasar', max: 10, html: /^https:\/\/blog\.bibit\.id\/blog-1\/(?!category|tag)[^?#]+/ },
    { id: 'mirae', n: 'Mirae Asset', url: 'https://sekuritas.miraeasset.co.id/id/news', lang: 'id', topic: 'pasar', max: 15, html: /^https:\/\/sekuritas\.miraeasset\.co\.id\/id\/news\/[^?#]+/ },
];
const BLN = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, agt: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11, januari: 0, februari: 1, maret: 2, april: 3, juni: 5, juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11, january: 0, february: 1, march: 2, june: 5, july: 6, august: 7, october: 9, december: 11 };
/* Tanggal "26 Nov 2026" atau "November 25, 2026" di teks; hasilnya jam 00:00 WIB (17:00 UTC hari sebelumnya), atau null. */
export function findDate(txt) {
    const r = /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d\d)\b|\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(20\d\d)\b/g;
    let m;
    while ((m = r.exec(txt))) {
        const d = m[1] ? +m[1] : +m[5], mo = BLN[(m[2] || m[4]).toLowerCase()], y = +(m[3] || m[6]);
        if (mo !== undefined && d >= 1 && d <= 31) return new Date(Date.UTC(y, mo, d) - 7 * 36e5).toISOString();
    }
    return null;
}
/* Ambil tautan artikel dari HTML: <a href> yang cocok `re`, judul ≥ 25 huruf, dan ada tanggal di teks sekitarnya (kalau tidak ada tanggal, dibuang). */
export function parseLinks(html, base, re, max = 12) {
    const out = [], seen = new Set(), src = String(html || '');
    const rx = /<a\b[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = rx.exec(src))) {
        let link; try { link = new URL(m[1].replace(/&amp;/g, '&'), base).href; } catch { continue; }
        if (!re.test(link) || seen.has(link)) continue;
        const title = strip(m[2]);
        if (title.length < 25) continue;
        const after = src.slice(m.index + m[0].length, m.index + m[0].length + 600), nx = after.search(/<a\b/i);
        const ts = findDate(title + ' ' + strip(nx < 0 ? after : after.slice(0, nx)).slice(0, 200));
        if (!ts) continue;
        seen.add(link); out.push({ title: title.replace(/^(?:[^\p{L}\p{N}]+)/u, ''), link, ts, desc: '' });
        if (out.length >= max) break;
    }
    return out;
}
const ent = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(+c));
const strip = (s) => ent(s).replace(/(?:&)?amp;nbsp;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
export function parseRss(xml, max = 12) {
    const out = [];
    const blocks = String(xml || '').match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/g) || [];
    for (const b of blocks) {
        const tag = (t) => (b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')) || [])[1];
        const title = strip(tag('title') || '');
        let link = strip(tag('link') || '');
        if (!link) link = ((b.match(/<link[^>]+href="([^"]+)"/i) || [])[1]) || '';
        const dateRaw = strip(tag('pubDate') || tag('published') || tag('updated') || tag('dc:date') || '');
        const t = Date.parse(dateRaw);
        let desc = strip(tag('description') || tag('summary') || '');
        if (desc.length > 200) desc = desc.slice(0, 197).replace(/\s+\S*$/, '') + '…';
        if (!title || !/^https?:\/\//.test(link)) continue;
        out.push({ title, link, ts: Number.isFinite(t) ? new Date(t).toISOString() : null, desc: desc === title ? '' : desc });
        if (out.length >= max) break;
    }
    return out;
}
async function buildNews() {
    const all = [];
    const status = {};
    await Promise.all(FEEDS.map(async (f) => {
        try {
            const res = await fetch(f.url, { headers: { ...UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(15000) });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const body = await res.text();
            const items = f.html ? parseLinks(body, f.url, f.html, f.max || 12) : parseRss(body, f.max || 12);
            status[f.id] = items.length;
            for (const it of items) all.push({ ...it, src: f.n, sid: f.id, lang: f.lang, topic: f.topic });
        } catch (e) { status[f.id] = 'gagal: ' + e.message; }
    }));
    const seen = new Set();
    const items = all.filter((x) => { const k = x.link; if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    console.log('news', status);
    writeSafe('global-news.json', { meta: { built: new Date().toISOString(), status, note: 'Hanya judul, ringkasan singkat, dan tautan ke sumber asli; hak cipta tetap milik penerbit.' }, items }, items.length >= 10, 'news');
}

/* ---------- 4. IPO AS (Nasdaq) ---------- */
export function parseNasdaqIpo(json) {
    const d = json?.data || {};
    const pick = (rows, status) => (rows || []).map((r) => ({
        status,
        t: r.proposedTickerSymbol || r.dealSymbol || '',
        name: r.companyName || r.dealName || '',
        exch: r.proposedExchange || '',
        price: r.proposedSharePrice || r.dealPrice || '',
        shares: r.sharesOffered || r.dealSharesOffered || '',
        value: r.dollarValueOfSharesOffered || r.dealValue || '',
        date: r.expectedPriceDate || r.pricedDate || r.dealDate || r.filedDate || '',
    })).filter((x) => x.name);
    return [
        ...pick(d.upcoming?.upcomingTable?.rows, 'upcoming'),
        ...pick(d.priced?.rows, 'priced'),
        ...pick(d.filed?.rows, 'filed'),
    ];
}
async function buildIpo() {
    const now = new Date();
    const months = [0, 1].map((k) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + (k === 0 ? 0 : -1), 1)); return d.toISOString().slice(0, 7); });
    months.unshift(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 7));
    const items = [];
    for (const m of months) {
        try {
            const res = await fetch(`https://api.nasdaq.com/api/ipo/calendar?date=${m}`, { headers: { ...UA, Accept: 'application/json, text/plain, */*', Origin: 'https://www.nasdaq.com', Referer: 'https://www.nasdaq.com/' }, signal: AbortSignal.timeout(20000) });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            items.push(...parseNasdaqIpo(await res.json()));
        } catch (e) { console.error('ipo', m, e.message); }
    }
    writeSafe('global-ipo.json', { meta: { source: 'Nasdaq IPO Calendar', built: new Date().toISOString(), months, note: 'Jadwal bisa berubah; cek prospektus (SEC EDGAR) sebelum membeli.' }, items }, items.length >= 1, 'ipo');
}


/* ---------- 5. Funda saham AS (Yahoo fundamentals-timeseries) ---------- */
export const FUNDA_TYPES = ['TotalRevenue', 'GrossProfit', 'OperatingIncome', 'NetIncome', 'TotalAssets', 'StockholdersEquity', 'FreeCashFlow', 'OperatingCashFlow', 'DilutedEPS', 'TotalDebt'];
export function parseTimeseries(json) {
    const by = {};
    for (const block of json?.timeseries?.result || []) {
        const type = block?.meta?.type?.[0];
        if (type) by[type] = block[type] || [];
    }
    return by;
}
async function fetchFunda(sym) {
    const types = [...FUNDA_TYPES.map((t) => 'annual' + t), 'trailingTotalRevenue', 'trailingNetIncome', 'trailingDilutedEPS', 'trailingFreeCashFlow'].join(',');
    const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(sym)}?symbol=${encodeURIComponent(sym)}&type=${types}&period1=${Math.floor(Date.UTC(2020, 0, 1) / 1000)}&period2=${Math.floor(Date.now() / 1000) + 86400 * 400}`;
    for (let a = 0; a < 3; a++) {
        try {
            const res = await fetch(url, { headers: { ...UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
            if (res.status === 429) { await sleep(2500 * (a + 1)); continue; }
            if (!res.ok) return null;
            return parseTimeseries(await res.json());
        } catch (e) { await sleep(700 * (a + 1)); }
    }
    return null;
}
const rawv = (r) => (r && r.reportedValue && Number.isFinite(Number(r.reportedValue.raw)) ? Number(r.reportedValue.raw) : null);
export function shapeFunda(by, years) {
    const ser = (type, div = 1e9, d = 2) => years.map((y) => {
        const row = (by['annual' + type] || []).find((r) => String(r.asOfDate).slice(0, 4) === String(y));
        const v = rawv(row); return v == null ? null : +(v / div).toFixed(d);
    });
    const ttm = (type, div = 1e9, d = 2) => { const rows = (by['trailing' + type] || []).slice().sort((a, b) => String(b.asOfDate).localeCompare(String(a.asOfDate))); const v = rawv(rows[0]); return v == null ? null : +(v / div).toFixed(d); };
    const out = { rev: ser('TotalRevenue'), gp: ser('GrossProfit'), op: ser('OperatingIncome'), ni: ser('NetIncome'), asset: ser('TotalAssets'), eq: ser('StockholdersEquity'), fcf: ser('FreeCashFlow'), ocf: ser('OperatingCashFlow'), debt: ser('TotalDebt'), eps: ser('DilutedEPS', 1, 2), ttm: { rev: ttm('TotalRevenue'), ni: ttm('NetIncome'), eps: ttm('DilutedEPS', 1, 2), fcf: ttm('FreeCashFlow') } };
    return out;
}
async function buildFunda() {
    const uni = loadUniverse().filter((u) => u.s !== 'ETF');
    const nowY = new Date().getUTCFullYear();
    const years = [nowY - 5, nowY - 4, nowY - 3, nowY - 2, nowY - 1, nowY].filter((y) => y >= 2020);
    const res = await pool(uni, (u) => fetchFunda(u.t), 5);
    const t = {};
    uni.forEach((u, i) => { const by = res[i]; if (!by) return; const f = shapeFunda(by, years); if (f.rev.some((v) => v != null) || f.ni.some((v) => v != null)) t[u.t] = { n: u.n, s: u.s, ...f }; });
    const shardOf = (t) => (/^[A-Z]/.test(t) ? t[0] : '0');
    fs.mkdirSync(D('global-funda'), { recursive: true });
    const old = {};
    for (const f of fs.existsSync(D('global-funda')) ? fs.readdirSync(D('global-funda')) : []) { try { Object.assign(old, JSON.parse(fs.readFileSync(D('global-funda/' + f), 'utf8')).t || {}); } catch (_) {} }
    for (const k of Object.keys(old)) if (!t[k]) t[k] = old[k];
    if (Object.keys(t).length < Math.min(30, uni.length * 0.3)) { console.error('funda: hasil tidak layak — file lama dipertahankan'); return; }
    const shards = {};
    for (const [k, v] of Object.entries(t)) (shards[shardOf(k)] ||= {})[k] = v;
    const meta = { source: 'Yahoo Finance (fundamentals-timeseries)', built: new Date().toISOString(), years, unit: 'USD miliar (EPS dalam USD)', note: 'Laporan tahunan fiskal; kolom TTM = 12 bulan terakhir. Beberapa emiten tidak punya semua pos.' };
    for (const [sh, obj] of Object.entries(shards)) fs.writeFileSync(D('global-funda/' + sh + '.json'), JSON.stringify({ meta, t: obj }));
    console.log('funda: ' + Object.keys(t).length + ' emiten dalam ' + Object.keys(shards).length + ' file');
}

/* ---------- main ---------- */

/* ---------- Mode Bitcoin & Forex ---------- */
export const CRYPTO = [["BTC","Bitcoin"], ["ETH","Ethereum"], ["BNB","BNB"], ["SOL","Solana"], ["XRP","XRP"], ["ADA","Cardano"], ["DOGE","Dogecoin"], ["TRX","TRON"], ["AVAX","Avalanche"], ["LINK","Chainlink"], ["DOT","Polkadot"], ["LTC","Litecoin"], ["BCH","Bitcoin Cash"], ["SHIB","Shiba Inu"], ["ATOM","Cosmos"], ["XLM","Stellar"], ["ETC","Ethereum Classic"], ["XMR","Monero"], ["NEAR","NEAR Protocol"], ["ICP","Internet Computer"], ["FIL","Filecoin"], ["HBAR","Hedera"], ["AAVE","Aave"], ["UNI7083","Uniswap"], ["TON11419","Toncoin"], ["SUI20947","Sui"], ["APT21794","Aptos"], ["ARB11841","Arbitrum"], ["OP","Optimism"], ["INJ","Injective"], ["PEPE24478","Pepe"], ["PAXG","PAX Gold (emas digital)"], ["XAUT","Tether Gold (emas digital)"], ["USDT","Tether"], ["USDC","USD Coin"], ["VET","VeChain"], ["ALGO","Algorand"], ["QNT","Quant"], ["EGLD","MultiversX"], ["SAND","The Sandbox"], ["MANA","Decentraland"], ["AXS","Axie Infinity"], ["GRT","The Graph"], ["THETA","Theta Network"], ["XTZ","Tezos"], ["EOS","EOS"], ["FLOW","Flow"], ["CHZ","Chiliz"], ["CRV","Curve DAO"], ["MKR","Maker"], ["SNX","Synthetix"], ["COMP","Compound"], ["LDO","Lido DAO"], ["RUNE","THORChain"], ["KAS","Kaspa"], ["TAO22974","Bittensor"], ["RENDER","Render"], ["IMX10603","Immutable"], ["SEI","Sei"], ["STX4847","Stacks"], ["WLD","Worldcoin"], ["FET","Fetch.ai"], ["BONK","Bonk"], ["WIF","dogwifhat"], ["FLOKI","Floki"], ["JUP29210","Jupiter"], ["PYTH","Pyth Network"], ["ONDO","Ondo"], ["ENA","Ethena"], ["TIA22861","Celestia"], ["CAKE","PancakeSwap"], ["GALA","Gala"], ["APE","ApeCoin"], ["1INCH","1inch"], ["ZEC","Zcash"], ["DASH","Dash"], ["NEO","Neo"], ["IOTA","IOTA"], ["KAVA","Kava"], ["RVN","Ravencoin"], ["ENJ","Enjin"], ["BAT","Basic Attention"], ["ZIL","Zilliqa"], ["ROSE","Oasis Network"], ["CELO","Celo"], ["MINA","Mina"], ["SUSHI","SushiSwap"], ["YFI","yearn.finance"], ["LRC","Loopring"], ["AR","Arweave"], ["JASMY","JasmyCoin"], ["PENDLE","Pendle"], ["TRUMP","Official Trump"], ["POL28321","POL (ex-MATIC)"], ["FTM","Fantom"], ["CRO","Cronos"], ["OKB","OKB"], ["LEO","UNUS SED LEO"], ["WBTC","Wrapped Bitcoin"], ["DAI","Dai"], ["MNT","Mantle"], ["AKT","Akash Network"], ["BOME","Book of Meme"], ["MEW","cat in a dogs world"], ["POPCAT","Popcat"], ["BEAM","Beam"], ["JTO","Jito"], ["HYPE","Hyperliquid"], ["PENGU","Pudgy Penguins"], ["VIRTUAL","Virtuals Protocol"], ["FARTCOIN","Fartcoin"], ["GRASS","Grass"], ["MOVE","Movement"], ["W","Wormhole"], ["STRK","Starknet"], ["ZRO","LayerZero"], ["ETHFI","Ether.fi"], ["EIGEN","EigenLayer"], ["BLUR","Blur"], ["DYDX","dYdX"], ["GMX","GMX"], ["RPL","Rocket Pool"], ["ENS","Ethereum Name Service"], ["GNO","Gnosis"], ["CVX","Convex Finance"], ["FXS","Frax Share"], ["BAL","Balancer"], ["ANKR","Ankr"], ["KSM","Kusama"], ["XDC","XDC Network"], ["IOTX","IoTeX"], ["ICX","ICON"], ["ONT","Ontology"], ["QTUM","Qtum"], ["HOT","Holo"], ["BTT","BitTorrent"], ["SC","Siacoin"], ["DGB","DigiByte"], ["CFX","Conflux"], ["ASTR","Astar"], ["OSMO","Osmosis"], ["RON","Ronin"], ["FLR","Flare"], ["S","Sonic"], ["BERA","Berachain"], ["IP","Story"], ["PUMP","Pump.fun"], ["WLFI","World Liberty Financial"], ["TWT","Trust Wallet Token"], ["GLM","Golem"], ["AUDIO","Audius"], ["SKL","SKALE"], ["MASK","Mask Network"], ["API3","API3"], ["BAND","Band Protocol"], ["STORJ","Storj"], ["CKB","Nervos Network"], ["XEM","NEM"], ["ZRX","0x"], ["UMA","UMA"], ["LPT","Livepeer"], ["PEOPLE","ConstitutionDAO"], ["AIOZ","AIOZ Network"], ["NEXO","Nexo"], ["GT","Gate"], ["KCS","KuCoin Token"], ["BGB","Bitget Token"], ["TUSD","TrueUSD"], ["FDUSD","First Digital USD"], ["USDE","Ethena USDe"], ["STETH","Lido Staked Ether"]];
export const FOREX = [["EURUSD", "EUR/USD", "EURUSD=X", "major"], ["GBPUSD", "GBP/USD", "GBPUSD=X", "major"], ["USDJPY", "USD/JPY", "JPY=X", "major"], ["AUDUSD", "AUD/USD", "AUDUSD=X", "major"], ["NZDUSD", "NZD/USD", "NZDUSD=X", "major"], ["USDCAD", "USD/CAD", "CAD=X", "major"], ["USDCHF", "USD/CHF", "CHF=X", "major"], ["EURJPY", "EUR/JPY", "EURJPY=X", "cross"], ["GBPJPY", "GBP/JPY", "GBPJPY=X", "cross"], ["EURGBP", "EUR/GBP", "EURGBP=X", "cross"], ["AUDJPY", "AUD/JPY", "AUDJPY=X", "cross"], ["EURCHF", "EUR/CHF", "EURCHF=X", "cross"], ["AUDNZD", "AUD/NZD", "AUDNZD=X", "cross"], ["CADJPY", "CAD/JPY", "CADJPY=X", "cross"], ["CHFJPY", "CHF/JPY", "CHFJPY=X", "cross"], ["EURAUD", "EUR/AUD", "EURAUD=X", "cross"], ["GBPAUD", "GBP/AUD", "GBPAUD=X", "cross"], ["USDIDR", "USD/IDR", "IDR=X", "asia"], ["USDSGD", "USD/SGD", "SGD=X", "asia"], ["USDCNY", "USD/CNY", "CNY=X", "asia"], ["USDHKD", "USD/HKD", "HKD=X", "asia"], ["USDMYR", "USD/MYR", "MYR=X", "asia"], ["USDTHB", "USD/THB", "THB=X", "asia"], ["USDINR", "USD/INR", "INR=X", "asia"], ["USDKRW", "USD/KRW", "KRW=X", "asia"], ["USDTRY", "USD/TRY", "TRY=X", "exotic"], ["USDZAR", "USD/ZAR", "ZAR=X", "exotic"], ["USDMXN", "USD/MXN", "MXN=X", "exotic"], ["XAUUSD", "XAU/USD · Emas", "XAUUSD=X", "metal"], ["XAGUSD", "XAG/USD · Perak", "XAGUSD=X", "metal"], ["DXY", "Indeks Dolar (DXY)", "DX-Y.NYB", "index"]];
const INTL = {"kospi": {"n": "KOSPI Korea Selatan", "d": "Saham besar di bursa Korea Selatan.", "t": [["005930.KS", "Samsung Electronics"], ["000660.KS", "SK Hynix"], ["373220.KS", "LG Energy Solution"], ["207940.KS", "Samsung Biologics"], ["005380.KS", "Hyundai Motor"], ["000270.KS", "Kia"], ["068270.KS", "Celltrion"], ["105560.KS", "KB Financial"], ["055550.KS", "Shinhan Financial"], ["035420.KS", "Naver"], ["005490.KS", "POSCO Holdings"], ["035720.KS", "Kakao"], ["012330.KS", "Hyundai Mobis"], ["051910.KS", "LG Chem"], ["028260.KS", "Samsung C&T"], ["086790.KS", "Hana Financial"], ["066570.KS", "LG Electronics"], ["034730.KS", "SK Inc"], ["015760.KS", "KEPCO"], ["003550.KS", "LG Corp"]]}, "sse": {"n": "Shanghai Composite", "d": "Saham besar di bursa Shanghai.", "t": [["600519.SS", "Kweichow Moutai"], ["601318.SS", "Ping An Insurance"], ["600036.SS", "China Merchants Bank"], ["601398.SS", "ICBC"], ["601288.SS", "Agricultural Bank of China"], ["600900.SS", "China Yangtze Power"], ["601857.SS", "PetroChina"], ["600030.SS", "CITIC Securities"], ["601166.SS", "Industrial Bank"], ["600276.SS", "Jiangsu Hengrui"], ["601888.SS", "China Tourism Group"], ["601012.SS", "LONGi Green Energy"], ["600028.SS", "Sinopec"], ["601628.SS", "China Life"], ["600887.SS", "Inner Mongolia Yili"], ["601088.SS", "China Shenhua"], ["600031.SS", "Sany Heavy"], ["601899.SS", "Zijin Mining"], ["600809.SS", "Shanxi Xinghuacun"], ["603259.SS", "WuXi AppTec"]]}, "szse": {"n": "Shenzhen Component", "d": "Saham besar di bursa Shenzhen.", "t": [["000858.SZ", "Wuliangye"], ["300750.SZ", "CATL"], ["002594.SZ", "BYD"], ["000333.SZ", "Midea Group"], ["000651.SZ", "Gree Electric"], ["300059.SZ", "East Money"], ["002415.SZ", "Hikvision"], ["000001.SZ", "Ping An Bank"], ["002475.SZ", "Luxshare"], ["300760.SZ", "Mindray"], ["000725.SZ", "BOE Technology"], ["002714.SZ", "Muyuan Foods"], ["000568.SZ", "Luzhou Laojiao"], ["300015.SZ", "Aier Eye"], ["002230.SZ", "iFlytek"], ["000063.SZ", "ZTE"], ["002352.SZ", "SF Holding"], ["300124.SZ", "Inovance"], ["000002.SZ", "China Vanke"], ["002304.SZ", "Yanghe"]]}, "cac": {"n": "CAC 40 Prancis", "d": "Saham besar di bursa Paris.", "t": [["MC.PA", "LVMH"], ["OR.PA", "L'Oréal"], ["RMS.PA", "Hermès"], ["TTE.PA", "TotalEnergies"], ["SAN.PA", "Sanofi"], ["AIR.PA", "Airbus"], ["SU.PA", "Schneider Electric"], ["AI.PA", "Air Liquide"], ["BNP.PA", "BNP Paribas"], ["CS.PA", "AXA"], ["EL.PA", "EssilorLuxottica"], ["KER.PA", "Kering"], ["DG.PA", "Vinci"], ["SAF.PA", "Safran"], ["DSY.PA", "Dassault Systèmes"], ["CAP.PA", "Capgemini"], ["RI.PA", "Pernod Ricard"], ["ORA.PA", "Orange"], ["STLAP.PA", "Stellantis"], ["GLE.PA", "Société Générale"]]}, "stoxx": {"n": "Euro Stoxx 50", "d": "Saham besar zona euro.", "t": [["ASML.AS", "ASML"], ["SAP.DE", "SAP"], ["MC.PA", "LVMH"], ["SIE.DE", "Siemens"], ["TTE.PA", "TotalEnergies"], ["OR.PA", "L'Oréal"], ["SAN.PA", "Sanofi"], ["AIR.PA", "Airbus"], ["ALV.DE", "Allianz"], ["IBE.MC", "Iberdrola"], ["SU.PA", "Schneider Electric"], ["DTE.DE", "Deutsche Telekom"], ["AI.PA", "Air Liquide"], ["BNP.PA", "BNP Paribas"], ["INGA.AS", "ING"], ["ENEL.MI", "Enel"], ["SAN.MC", "Santander"], ["ITX.MC", "Inditex"], ["MBG.DE", "Mercedes-Benz"], ["ADS.DE", "Adidas"], ["MUV2.DE", "Munich Re"], ["BBVA.MC", "BBVA"], ["ISP.MI", "Intesa Sanpaolo"], ["UCG.MI", "UniCredit"]]}, "asx": {"n": "ASX 200 Australia", "d": "Saham besar di bursa Australia.", "t": [["CBA.AX", "Commonwealth Bank"], ["BHP.AX", "BHP"], ["CSL.AX", "CSL"], ["NAB.AX", "National Australia Bank"], ["WBC.AX", "Westpac"], ["ANZ.AX", "ANZ"], ["FMG.AX", "Fortescue"], ["WES.AX", "Wesfarmers"], ["MQG.AX", "Macquarie"], ["GMG.AX", "Goodman Group"], ["TLS.AX", "Telstra"], ["WOW.AX", "Woolworths"], ["RIO.AX", "Rio Tinto"], ["TCL.AX", "Transurban"], ["WDS.AX", "Woodside"], ["ALL.AX", "Aristocrat"], ["STO.AX", "Santos"], ["COL.AX", "Coles"], ["XRO.AX", "Xero"], ["NST.AX", "Northern Star"]]}, "twii": {"n": "TAIEX Taiwan", "d": "Saham besar di bursa Taiwan.", "t": [["2330.TW", "TSMC"], ["2317.TW", "Hon Hai (Foxconn)"], ["2454.TW", "MediaTek"], ["2308.TW", "Delta Electronics"], ["2412.TW", "Chunghwa Telecom"], ["2882.TW", "Cathay Financial"], ["2881.TW", "Fubon Financial"], ["2891.TW", "CTBC Financial"], ["1301.TW", "Formosa Plastics"], ["2303.TW", "UMC"], ["3711.TW", "ASE Technology"], ["2002.TW", "China Steel"], ["2886.TW", "Mega Financial"], ["1303.TW", "Nan Ya Plastics"], ["2884.TW", "E.Sun Financial"], ["3008.TW", "Largan"], ["2357.TW", "Asustek"], ["2382.TW", "Quanta Computer"], ["1216.TW", "Uni-President"], ["2603.TW", "Evergreen Marine"]]}, "sensex": {"n": "BSE Sensex India", "d": "Saham besar India (kode NSE).", "t": [["RELIANCE.NS", "Reliance Industries"], ["HDFCBANK.NS", "HDFC Bank"], ["ICICIBANK.NS", "ICICI Bank"], ["INFY.NS", "Infosys"], ["TCS.NS", "TCS"], ["BHARTIARTL.NS", "Bharti Airtel"], ["ITC.NS", "ITC"], ["LT.NS", "Larsen & Toubro"], ["SBIN.NS", "State Bank of India"], ["KOTAKBANK.NS", "Kotak Mahindra Bank"], ["AXISBANK.NS", "Axis Bank"], ["HINDUNILVR.NS", "Hindustan Unilever"], ["BAJFINANCE.NS", "Bajaj Finance"], ["MARUTI.NS", "Maruti Suzuki"], ["SUNPHARMA.NS", "Sun Pharma"], ["TITAN.NS", "Titan"], ["NTPC.NS", "NTPC"], ["ULTRACEMCO.NS", "UltraTech Cement"], ["TATAMOTORS.NS", "Tata Motors"], ["ASIANPAINT.NS", "Asian Paints"]]}, "nifty": {"n": "Nifty 50 India", "d": "Saham besar India (kode NSE).", "t": [["RELIANCE.NS", "Reliance Industries"], ["HDFCBANK.NS", "HDFC Bank"], ["ICICIBANK.NS", "ICICI Bank"], ["INFY.NS", "Infosys"], ["TCS.NS", "TCS"], ["BHARTIARTL.NS", "Bharti Airtel"], ["ITC.NS", "ITC"], ["LT.NS", "Larsen & Toubro"], ["SBIN.NS", "State Bank of India"], ["ADANIENT.NS", "Adani Enterprises"], ["POWERGRID.NS", "Power Grid"], ["ONGC.NS", "ONGC"], ["TATASTEEL.NS", "Tata Steel"], ["WIPRO.NS", "Wipro"], ["HCLTECH.NS", "HCL Tech"], ["NESTLEIND.NS", "Nestle India"], ["JSWSTEEL.NS", "JSW Steel"], ["COALINDIA.NS", "Coal India"], ["BAJAJFINSV.NS", "Bajaj Finserv"], ["TECHM.NS", "Tech Mahindra"]]}, "klci": {"n": "KLCI Malaysia", "d": "Saham besar di bursa Malaysia.", "t": [["1155.KL", "Maybank"], ["1295.KL", "Public Bank"], ["1023.KL", "CIMB"], ["5347.KL", "Tenaga Nasional"], ["5819.KL", "Hong Leong Bank"], ["5225.KL", "IHH Healthcare"], ["4863.KL", "Telekom Malaysia"], ["6888.KL", "Axiata"], ["1961.KL", "IOI Corp"], ["2445.KL", "Kuala Lumpur Kepong"], ["5183.KL", "Petronas Chemicals"], ["6033.KL", "Petronas Gas"], ["5681.KL", "Petronas Dagangan"], ["4707.KL", "Nestle Malaysia"], ["3182.KL", "Genting"], ["4065.KL", "PPB Group"], ["6947.KL", "CelcomDigi"], ["8869.KL", "Press Metal"], ["5168.KL", "Hartalega"], ["7113.KL", "Top Glove"]]}, "set": {"n": "SET Thailand", "d": "Saham besar di bursa Thailand.", "t": [["PTT.BK", "PTT"], ["CPALL.BK", "CP All"], ["AOT.BK", "Airports of Thailand"], ["ADVANC.BK", "Advanced Info Service"], ["GULF.BK", "Gulf Energy"], ["SCB.BK", "SCB X"], ["KBANK.BK", "Kasikornbank"], ["BDMS.BK", "Bangkok Dusit Medical"], ["PTTEP.BK", "PTT Exploration"], ["SCC.BK", "Siam Cement"], ["CPN.BK", "Central Pattana"], ["DELTA.BK", "Delta Electronics Thailand"], ["TRUE.BK", "True Corp"], ["BBL.BK", "Bangkok Bank"], ["INTUCH.BK", "Intouch Holdings"], ["GPSC.BK", "Global Power Synergy"], ["CRC.BK", "Central Retail"], ["OR.BK", "PTT Oil & Retail"], ["MINT.BK", "Minor International"], ["EGCO.BK", "Electricity Generating"]]}, "bvsp": {"n": "Bovespa Brasil", "d": "Saham besar di bursa Brasil.", "t": [["VALE3.SA", "Vale"], ["PETR4.SA", "Petrobras"], ["ITUB4.SA", "Itaú Unibanco"], ["BBDC4.SA", "Bradesco"], ["ABEV3.SA", "Ambev"], ["B3SA3.SA", "B3"], ["WEGE3.SA", "WEG"], ["BBAS3.SA", "Banco do Brasil"], ["SUZB3.SA", "Suzano"], ["RENT3.SA", "Localiza"], ["PRIO3.SA", "PRIO"], ["ELET3.SA", "Eletrobras"], ["RDOR3.SA", "Rede D'Or"], ["JBSS3.SA", "JBS"], ["EQTL3.SA", "Equatorial"], ["LREN3.SA", "Lojas Renner"], ["GGBR4.SA", "Gerdau"], ["RADL3.SA", "RaiaDrogasil"], ["CSAN3.SA", "Cosan"], ["SBSP3.SA", "Sabesp"]]}, "tsx": {"n": "TSX Kanada", "d": "Saham besar di bursa Toronto.", "t": [["RY.TO", "Royal Bank of Canada"], ["TD.TO", "TD Bank"], ["SHOP.TO", "Shopify"], ["ENB.TO", "Enbridge"], ["CNQ.TO", "Canadian Natural Resources"], ["BN.TO", "Brookfield"], ["CP.TO", "Canadian Pacific Kansas City"], ["CNR.TO", "Canadian National Railway"], ["BMO.TO", "Bank of Montreal"], ["BNS.TO", "Scotiabank"], ["SU.TO", "Suncor"], ["TRP.TO", "TC Energy"], ["ATD.TO", "Couche-Tard"], ["CSU.TO", "Constellation Software"], ["CM.TO", "CIBC"], ["MFC.TO", "Manulife"], ["NTR.TO", "Nutrien"], ["WCN.TO", "Waste Connections"], ["FNV.TO", "Franco-Nevada"], ["AEM.TO", "Agnico Eagle"]]}, "n225": {"n": "Nikkei 225", "d": "Saham besar di bursa Tokyo.", "t": [["7203.T", "Toyota"], ["6758.T", "Sony"], ["9984.T", "SoftBank Group"], ["8306.T", "Mitsubishi UFJ"], ["6861.T", "Keyence"], ["9432.T", "NTT"], ["6098.T", "Recruit"], ["8035.T", "Tokyo Electron"], ["7974.T", "Nintendo"], ["4063.T", "Shin-Etsu Chemical"], ["9983.T", "Fast Retailing"], ["8316.T", "Sumitomo Mitsui"], ["6501.T", "Hitachi"], ["7267.T", "Honda"], ["4519.T", "Chugai Pharma"], ["6902.T", "Denso"], ["8058.T", "Mitsubishi Corp"], ["8001.T", "Itochu"], ["9433.T", "KDDI"], ["6367.T", "Daikin"]]}, "hsi": {"n": "Hang Seng", "d": "Saham besar di bursa Hong Kong.", "t": [["0700.HK", "Tencent"], ["9988.HK", "Alibaba"], ["3690.HK", "Meituan"], ["1299.HK", "AIA"], ["0939.HK", "China Construction Bank"], ["0941.HK", "China Mobile"], ["1810.HK", "Xiaomi"], ["0005.HK", "HSBC"], ["1398.HK", "ICBC"], ["2318.HK", "Ping An"], ["0388.HK", "HKEX"], ["9618.HK", "JD.com"], ["1211.HK", "BYD"], ["0883.HK", "CNOOC"], ["0027.HK", "Galaxy Entertainment"], ["2020.HK", "Anta Sports"], ["9999.HK", "NetEase"], ["0001.HK", "CK Hutchison"], ["0016.HK", "Sun Hung Kai Properties"], ["9961.HK", "Trip.com"]]}, "sti": {"n": "STI Singapura", "d": "Saham besar di bursa Singapura.", "t": [["D05.SI", "DBS"], ["O39.SI", "OCBC"], ["U11.SI", "UOB"], ["Z74.SI", "Singtel"], ["C6L.SI", "Singapore Airlines"], ["C38U.SI", "CapitaLand Integrated Commercial Trust"], ["A17U.SI", "CapitaLand Ascendas REIT"], ["BN4.SI", "Keppel"], ["S68.SI", "SGX"], ["F34.SI", "Wilmar"], ["C52.SI", "ComfortDelGro"], ["G13.SI", "Genting Singapore"], ["U96.SI", "Sembcorp"], ["S63.SI", "ST Engineering"], ["Y92.SI", "Thai Beverage"], ["9CI.SI", "CapitaLand Investment"], ["M44U.SI", "Mapletree Logistics"], ["BS6.SI", "Yangzijiang Shipbuilding"], ["V03.SI", "Venture Corp"], ["ME8U.SI", "Mapletree Industrial"]]}, "ftse": {"n": "FTSE 100 Inggris", "d": "Saham besar di bursa London (harga dalam pence).", "t": [["SHEL.L", "Shell"], ["AZN.L", "AstraZeneca"], ["HSBA.L", "HSBC"], ["ULVR.L", "Unilever"], ["BP.L", "BP"], ["RIO.L", "Rio Tinto"], ["GSK.L", "GSK"], ["BATS.L", "British American Tobacco"], ["DGE.L", "Diageo"], ["REL.L", "RELX"], ["LSEG.L", "London Stock Exchange"], ["BARC.L", "Barclays"], ["LLOY.L", "Lloyds"], ["NG.L", "National Grid"], ["VOD.L", "Vodafone"], ["GLEN.L", "Glencore"], ["AAL.L", "Anglo American"], ["CPG.L", "Compass Group"], ["RR.L", "Rolls-Royce"], ["BA.L", "BAE Systems"], ["TSCO.L", "Tesco"], ["PRU.L", "Prudential"], ["NWG.L", "NatWest"], ["STAN.L", "Standard Chartered"]]}, "dax": {"n": "DAX Jerman", "d": "Saham besar di bursa Frankfurt.", "t": [["SAP.DE", "SAP"], ["SIE.DE", "Siemens"], ["ALV.DE", "Allianz"], ["DTE.DE", "Deutsche Telekom"], ["AIR.DE", "Airbus"], ["MUV2.DE", "Munich Re"], ["MBG.DE", "Mercedes-Benz"], ["BMW.DE", "BMW"], ["VOW3.DE", "Volkswagen"], ["BAS.DE", "BASF"], ["IFX.DE", "Infineon"], ["ADS.DE", "Adidas"], ["DHL.DE", "DHL Group"], ["DB1.DE", "Deutsche Börse"], ["RHM.DE", "Rheinmetall"], ["BAYN.DE", "Bayer"], ["EOAN.DE", "E.ON"], ["HEI.DE", "Heidelberg Materials"], ["DBK.DE", "Deutsche Bank"], ["MRK.DE", "Merck KGaA"], ["CBK.DE", "Commerzbank"], ["ENR.DE", "Siemens Energy"]]}};
const INTL_CUR = { KS: 'KRW', SS: 'CNY', SZ: 'CNY', PA: 'EUR', AS: 'EUR', DE: 'EUR', MC: 'EUR', MI: 'EUR', AX: 'AUD', TW: 'TWD', NS: 'INR', KL: 'MYR', BK: 'THB', SA: 'BRL', TO: 'CAD', T: 'JPY', HK: 'HKD', SI: 'SGD', L: 'GBp' };
async function buildIntl() {
    const out = {};
    let groups = 0;
    for (const [id, g] of Object.entries(INTL)) {
        const res = await pool(g.t, (x) => fetchChart(x[0], '1mo'), 6);
        const items = [];
        g.t.forEach((x, i) => { const r = res[i]; if (r && r.price > 0) items.push({ t: x[0], n: x[1], p: n2(r.price, r.price < 10 ? 3 : 2), c: n2(r.chg), cur: INTL_CUR[x[0].split('.').pop()] || '' }); });
        if (items.length < 5) { console.log('intl', id, 'hanya', items.length, '— dilewati'); continue; }
        out[id] = { n: g.n, d: g.d + ' Bukan seluruh anggota indeks, hanya perusahaan terbesar.', items };
        groups++;
        console.log('intl', id, items.length + '/' + g.t.length);
    }
    writeSafe('global-intl.json', { meta: { source: 'Yahoo Finance', built: new Date().toISOString() }, groups: out }, groups >= 8, 'intl');
}
// Yahoo memberi kode koin dengan akhiran angka (mis. SUI20947-USD). Untuk yang gagal, cari lewat endpoint search.
async function resolveCrypto(m) {
    try {
        const sym = m.k;
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(sym + '-USD')}&quotesCount=10&newsCount=0`;
        const res = await fetch(url, { headers: { ...UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
        if (!res.ok) return null;
        const q = ((await res.json()).quotes || []).filter((x) => x.quoteType === 'CRYPTOCURRENCY' && new RegExp('^' + sym.replace(/[^A-Z0-9]/gi, '') + '\\d*-USD$', 'i').test(x.symbol || ''));
        if (!q.length) return null;
        const first = String(m.n || '').toLowerCase().split(/[\s.]+/)[0];
        const best = q.find((x) => (String(x.shortname || '') + ' ' + String(x.longname || '')).toLowerCase().includes(first)) || q[0];
        const r = await fetchChart(best.symbol, '1y', 30);
        if (r && r.vol > 0) { m.s = best.symbol; return r; }
    } catch (_) {}
    return null;
}
async function buildCrypto() {
    const seen = new Set();
    const list = CRYPTO.map(([k, n]) => ({ k: k.replace(/\d+$/, ''), n, s: k + '-USD' })).filter((m) => (seen.has(m.k) ? false : (seen.add(m.k), true)));
    const res = await pool(list, async (m) => (await fetchChart(m.s, '1y', 30)) || (await resolveCrypto(m)), 6);
    const items = [];
    list.forEach((m, i) => { const r = res[i]; if (r) items.push({ k: m.k, n: m.n, s: m.s, price: n2(r.price, r.price < 1 ? 8 : 4), chg: n2(r.chg), chg1m: n2(r.chg1m), low52: n2(r.low52, 6), high52: n2(r.high52, 6), vol: r.vol, spark: r.spark, time: r.time }); });
    const miss = list.filter((m, i) => !res[i]).map((m) => m.s);
    if (miss.length) console.log('kripto tanpa data (dilewati):', miss.join(', '));
    writeSafe('crypto.json', { meta: { built: new Date().toISOString() }, items }, items.length >= 12 && items.some((x) => x.k === 'BTC'), 'crypto');
}
async function buildForex() {
    const ALT = { 'XAUUSD=X': 'GC=F', 'XAGUSD=X': 'SI=F' }; // emas/perak spot tak ada di Yahoo -> pakai futures
    const res = await pool(FOREX, async (m) => (await fetchChart(m[2], '1y', 30)) || (ALT[m[2]] ? ((m[2] = ALT[m[2]]), await fetchChart(m[2], '1y', 30)) : null), 6);
    const items = [];
    FOREX.forEach((m, i) => { const r = res[i]; if (r) items.push({ k: m[0], n: m[1], s: m[2], g: m[3], price: n2(r.price, r.price < 10 ? 5 : 3), chg: n2(r.chg), chg1m: n2(r.chg1m), low52: n2(r.low52, 5), high52: n2(r.high52, 5), spark: r.spark, time: r.time }); });
    const miss = FOREX.filter((m, i) => !res[i]).map((m) => m[2]);
    if (miss.length) console.log('forex tanpa data (dilewati):', miss.join(', '));
    writeSafe('forex.json', { meta: { built: new Date().toISOString() }, items }, items.length >= 15 && items.some((x) => x.k === 'EURUSD'), 'forex');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    const want = process.argv.slice(2);
    const all = { screener: buildScreener, commodities: buildCommodities, news: buildNews, ipo: buildIpo, funda: buildFunda, members: buildMembers, crypto: buildCrypto, forex: buildForex, intl: buildIntl };
    for (const k of want.length ? want : ['members', 'screener', 'commodities', 'crypto', 'forex', 'intl', 'news', 'ipo']) { if (all[k]) await all[k](); }
}
