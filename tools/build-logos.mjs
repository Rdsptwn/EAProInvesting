// Bangun pemetaan ticker -> domain situs resmi (untuk logo favicon) dari Yahoo assetProfile.website.
// Hasil: assets/data/logos-auto.json. Pemetaan manual di logos.json selalu menang.
// Jalankan di GitHub Actions (workflow "Sync logo emiten"); shell lokal biasanya tak bisa jangkau Yahoo.
import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const OUT = 'assets/data/logos-auto.json';
const RETRY_DAYS = 60; // ticker tanpa website dicoba lagi setelah sekian hari
const MAX = Number(process.env.MAX || 800);
const BAD = /(facebook|instagram|twitter|linkedin|youtube|wikipedia|google|idx\.co\.id|yahoo)\./i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uni = JSON.parse(fs.readFileSync('assets/data/idx-universe.json', 'utf8')).items;
const manual = JSON.parse(fs.readFileSync('assets/data/logos.json', 'utf8')).tickers || {};
const hasFile = new Set(fs.existsSync('assets/img/logos') ? fs.readdirSync('assets/img/logos').filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)) : []);
let out = { asOf: '', note: 'Otomatis dari Yahoo assetProfile.website. Jangan edit; koreksi lewat logos.json.', tickers: {}, tried: {} };
try { out = { ...out, ...JSON.parse(fs.readFileSync(OUT, 'utf8')) }; } catch (_) {}

let sess = null;
async function session() {
    const r1 = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
    const cookie = (r1.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie } });
    const crumb = (await r2.text()).trim();
    if (!r2.ok || !crumb || crumb.length > 40 || crumb.includes('<')) throw new Error('crumb gagal: HTTP ' + r2.status);
    return { cookie, crumb };
}
function domainOf(url) {
    try {
        const h = new URL(/^https?:/i.test(url) ? url : 'http://' + url).hostname.toLowerCase().replace(/^www\./, '');
        return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h) && !BAD.test(h + '.') ? h : '';
    } catch (_) { return ''; }
}
async function website(code, retry = true) {
    const u = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${code}.JK?modules=assetProfile&crumb=${encodeURIComponent(sess.crumb)}`;
    const r = await fetch(u, { headers: { 'User-Agent': UA, Cookie: sess.cookie } });
    if ((r.status === 401 || r.status === 403) && retry) { sess = await session(); return website(code, false); }
    if (r.status === 404) return '';
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    return domainOf(j?.quoteSummary?.result?.[0]?.assetProfile?.website || '');
}

const now = Date.now();
const todo = uni.map((x) => x.t).filter((t) => !manual[t] && !hasFile.has(t) && !out.tickers[t]
    && !(out.tried[t] && now - Date.parse(out.tried[t]) < RETRY_DAYS * 864e5)).slice(0, MAX);
console.log('dicoba:', todo.length);
sess = await session();
let ok = 0, fail = 0, err = 0;
for (const t of todo) {
    try {
        const d = await website(t);
        out.tried[t] = new Date().toISOString().slice(0, 10);
        if (d) { out.tickers[t] = d; ok++; } else fail++;
    } catch (e) {
        if (++err > 25) { console.log('terlalu banyak galat, berhenti:', e.message); break; }
    }
    await sleep(350);
}
out.asOf = new Date().toISOString().slice(0, 10);
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`domain baru: ${ok}, tanpa website: ${fail}, galat: ${err}, total otomatis: ${Object.keys(out.tickers).length}`);
if (!ok && err) process.exit(1);
