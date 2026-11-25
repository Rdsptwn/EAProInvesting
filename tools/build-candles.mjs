// Candle statis untuk Tido/BoW supaya tidak bergantung pada Worker/OKX/Binance yang bisa diblokir jaringan pengguna.
// Hasil: assets/data/candles/{crypto,forex,global}-{5m,1h,4h}.json dan idx-1d.json  (disajikan lewat GitHub Pages).
// Format: { asOf, tf, s: { SIMBOL: [high[], low[], close[]] } }  (bar terlama -> terbaru, maks 80 bar)
// Pemakaian: node tools/build-candles.mjs [crypto forex global idx]   (default semua)
import fs from 'node:fs';

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', Accept: 'application/json' };
const KEEP = 80, DIR = 'assets/data/candles/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (f) => JSON.parse(fs.readFileSync('assets/data/' + f, 'utf8'));
const p6 = (x) => Number(Number(x).toPrecision(6));
const STABLE = /^(USDT|USDC|DAI|TUSD|FDUSD|USDE|PYUSD|USDD|BUSD|USDS)$/i;

async function jget(url, tries = 2) {
    for (let i = 0; i < tries; i++) {
        try {
            const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
            if (r.ok) return await r.json();
        } catch (_) {}
        await sleep(600);
    }
    return null;
}
async function yahoo(sym, range, interval) {
    const j = await jget(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`);
    const q = j?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!q) return null;
    const h = [], l = [], c = [];
    q.close.forEach((cl, i) => { if (cl != null && q.high[i] != null && q.low[i] != null) { h.push(q.high[i]); l.push(q.low[i]); c.push(cl); } });
    return c.length ? { h, l, c } : null;
}
function agg4(o) { // gabung per 4 bar (dari akhir, supaya bar terbaru lengkap)
    const n = o.c.length, h = [], l = [], c = [];
    for (let e = n; e > 0; e -= 4) { const s = Math.max(0, e - 4); h.unshift(Math.max(...o.h.slice(s, e))); l.unshift(Math.min(...o.l.slice(s, e))); c.unshift(o.c[e - 1]); }
    return { h, l, c };
}
async function okx(k, bar) {
    const j = await jget(`https://www.okx.com/api/v5/market/candles?instId=${encodeURIComponent(k)}-USDT&bar=${bar}&limit=${KEEP}`);
    const a = (j?.data || []).slice().reverse();
    return a.length >= 55 ? { h: a.map((x) => +x[2]), l: a.map((x) => +x[3]), c: a.map((x) => +x[4]) } : null;
}
async function pool(items, fn, conc = 6) {
    const out = new Array(items.length); let i = 0;
    await Promise.all(Array.from({ length: conc }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); await sleep(120); } }));
    return out;
}
function save(name, tf, map) {
    const s = {};
    for (const [k, o] of Object.entries(map)) {
        if (!o || o.c.length < 55) continue;
        const f = (a) => a.slice(-KEEP).map(p6);
        s[k] = [f(o.h), f(o.l), f(o.c)];
    }
    if (!Object.keys(s).length) { console.log(name, tf, 'kosong, file lama dipertahankan'); return 0; }
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(`${DIR}${name}-${tf}.json`, JSON.stringify({ asOf: new Date().toISOString(), tf, s }));
    console.log(name, tf, Object.keys(s).length, 'simbol');
    return Object.keys(s).length;
}

const want = new Set(process.argv.slice(2).length ? process.argv.slice(2) : ['crypto', 'forex', 'global', 'idx']);
let total = 0;

if (want.has('crypto')) {
    const items = J('crypto.json').items.filter((x) => !STABLE.test(x.k)).slice(0, 50);
    for (const [tf, bar, yr, yi] of [['5m', '5m', '5d', '5m'], ['1h', '1H', '1mo', '60m'], ['4h', '4H', '3mo', '60m']]) {
        const rs = await pool(items, async (it) => (await okx(it.k, bar)) || (await yahoo(it.s || it.k + '-USD', yr, yi).then((o) => (o && tf === '4h' ? agg4(o) : o))));
        total += save('crypto', tf, Object.fromEntries(items.map((it, i) => [it.k, rs[i]])));
    }
}
if (want.has('forex')) {
    const items = J('forex.json').items.filter((x) => x.k !== 'DXY' && x.s);
    for (const [tf, yr, yi] of [['5m', '5d', '5m'], ['1h', '1mo', '60m'], ['4h', '3mo', '60m']]) {
        const rs = await pool(items, (it) => yahoo(it.s, yr, yi).then((o) => (o && tf === '4h' ? agg4(o) : o)));
        total += save('forex', tf, Object.fromEntries(items.map((it, i) => [it.s, rs[i]])));
    }
}
if (want.has('global')) {
    const items = J('global-screener.json').rows.filter((r) => r[1] >= 5 && /^[A-Z]{1,5}$/.test(r[0]))
        .sort((a, b) => b[1] * (b[8] || 0) - a[1] * (a[8] || 0)).slice(0, 40).map((r) => r[0]);
    for (const [tf, yr, yi] of [['5m', '5d', '5m'], ['1h', '1mo', '60m'], ['4h', '3mo', '60m']]) {
        const rs = await pool(items, (s) => yahoo(s, yr, yi).then((o) => (o && tf === '4h' ? agg4(o) : o)));
        total += save('global', tf, Object.fromEntries(items.map((s, i) => [s, rs[i]])));
    }
}
if (want.has('idx')) {
    const items = J('idx-screener.json').rows.slice().sort((a, b) => (b[1] * (b[9] || 0)) - (a[1] * (a[9] || 0))).slice(0, 150).map((r) => r[0]);
    const rs = await pool(items, (c) => yahoo(c + '.JK', '3mo', '1d'));
    total += save('idx', '1d', Object.fromEntries(items.map((c, i) => [c, rs[i]])));
}
if (!total) { console.error('tidak ada candle yang berhasil diambil'); process.exit(1); }
