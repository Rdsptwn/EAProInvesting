/**
 * Data mode Global -> assets/data/global-*.json (tanpa API key).
 *   global-screener.json    harga saham & ETF AS (Yahoo chart), dari global-universe.json
 *   global-commodities.json minyak, emas, perak, tembaga, gas, batu bara, USD/IDR, indeks dunia, kripto
 *   global-news.json        judul berita dari RSS (Al Jazeera, BBC, CNBC, MarketWatch, Yahoo Finance, CNBC Indonesia)
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
const MEMBER_PAGES = { spx: [['List_of_S%26P_500_companies'], 450], ndx: [['List_of_Nasdaq-100_companies', 'Nasdaq-100'], 80], dji: [['List_of_Dow_Jones_Industrial_Average_companies', 'Dow_Jones_Industrial_Average'], 25] };
async function buildMembers() {
    let old = {};
    try { old = JSON.parse(fs.readFileSync(D('global-index-members.json'), 'utf8')); } catch (_) {}
    const out = { meta: { source: 'Wikipedia (daftar anggota indeks)', built: new Date().toISOString() }, spx: old.spx || [], ndx: old.ndx || [], dji: old.dji || [], info: old.info || {} };
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
    writeSafe('global-index-members.json', out, changed || out.spx.length > 0, 'members');
}
function loadUniverse() {
    const base = JSON.parse(fs.readFileSync(D('global-universe.json'), 'utf8')).items;
    let mem = null;
    try { mem = JSON.parse(fs.readFileSync(D('global-index-members.json'), 'utf8')); } catch (_) {}
    if (!mem) return base;
    const have = new Set(base.map((x) => x.t));
    const extra = [];
    for (const t of new Set([...(mem.spx || []), ...(mem.ndx || []), ...(mem.dji || [])])) {
        if (have.has(t)) continue;
        const i = mem.info[t] || {};
        extra.push({ t, n: i.n || t, s: i.s || '' });
    }
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
    { id: 'usdidr', g: 'kurs', n: 'USD/IDR', s: 'IDR=X', u: 'Rp' },
    { id: 'dxy', g: 'kurs', n: 'Indeks Dolar (DXY)', s: 'DX-Y.NYB', u: '' },
    { id: 'btc', g: 'kripto', n: 'Bitcoin', s: 'BTC-USD', u: 'USD' },
    { id: 'eth', g: 'kripto', n: 'Ethereum', s: 'ETH-USD', u: 'USD' },
    { id: 'ihsg', g: 'indeks', n: 'IHSG', s: '^JKSE', u: '' },
    { id: 'spx', g: 'indeks', n: 'S&P 500', s: '^GSPC', u: '' },
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
];
const ent = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(+c));
const strip = (s) => ent(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
            const items = parseRss(await res.text(), 12);
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
    let old = {};
    try { old = JSON.parse(fs.readFileSync(D('global-funda.json'), 'utf8')).t || {}; } catch (_) {}
    for (const k of Object.keys(old)) if (!t[k]) t[k] = old[k];
    writeSafe('global-funda.json', { meta: { source: 'Yahoo Finance (fundamentals-timeseries)', built: new Date().toISOString(), years, unit: 'USD miliar (EPS dalam USD)', note: 'Laporan tahunan fiskal; kolom TTM = 12 bulan terakhir. Beberapa emiten tidak punya semua pos.' }, t },
        Object.keys(t).length >= Math.min(30, uni.length * 0.3), 'funda');
}

/* ---------- main ---------- */
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    const want = process.argv.slice(2);
    const all = { screener: buildScreener, commodities: buildCommodities, news: buildNews, ipo: buildIpo, funda: buildFunda, members: buildMembers };
    for (const k of want.length ? want : ['members', 'screener', 'commodities', 'news', 'ipo']) { if (all[k]) await all[k](); }
}
