/**
 * Harga SEMUA emiten BEI untuk Market Screener -> assets/data/idx-screener.json
 * Membaca assets/data/idx-universe.json, mengambil Yahoo Finance (kode.JK) dengan konkurensi terbatas.
 * Kode yang tidak dikenal Yahoo dilewati. Format ringkas (array) supaya file kecil.
 * Jalankan: node tools/build-idx-screener.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const uniPath = path.join(root, 'assets/data/idx-universe.json');
const outPath = path.join(root, 'assets/data/idx-screener.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', Accept: 'application/json' };
const CONCURRENCY = 8;
const BUDGET_MS = 22 * 60 * 1000;
const t0 = Date.now();

const uni = JSON.parse(fs.readFileSync(uniPath, 'utf8')).items || [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const n2 = (v, d = 2) => (Number.isFinite(v) ? +v.toFixed(d) : null);
function roundTick(price) {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return null;
    if (p < 200) return Math.round(p);
    if (p < 500) return Math.round(p / 2) * 2;
    if (p < 2000) return Math.round(p / 5) * 5;
    if (p < 5000) return Math.round(p / 10) * 10;
    return Math.round(p / 25) * 25;
}

async function fetchOne(t) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const url = `https://query2.finance.yahoo.com/v8/finance/chart/${t}.JK?interval=1d&range=3mo`;
            const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
            if (res.status === 404) return { gone: true };
            if (res.status === 429) { await sleep(2500 * (attempt + 1)); continue; }
            if (!res.ok) throw new Error(res.status);
            const r = (await res.json())?.chart?.result?.[0];
            if (!r) return { gone: true };
            const meta = r.meta || {};
            const q = r.indicators?.quote?.[0] || {};
            const closes = (q.close || []).filter((v) => Number.isFinite(v) && v > 0);
            const vols = q.volume || [];
            const price = Number(meta.regularMarketPrice) > 0 ? Number(meta.regularMarketPrice) : closes[closes.length - 1];
            if (!Number.isFinite(price)) return { gone: true };
            const lastClose = closes[closes.length - 1];
            const lastIsToday = Math.abs(lastClose - price) / price < 0.001;
            const prev = lastIsToday ? closes[closes.length - 2] : lastClose;
            const chg = Number.isFinite(prev) && prev > 0 ? (price - prev) / prev * 100 : null;
            const w20 = closes.slice(-20), w50 = closes.slice(-50);
            const vol = Number(meta.regularMarketVolume) || (vols.length ? vols[vols.length - 1] : null);
            const lastDate = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 10) : null;
            return {
                row: [
                    t, n2(price), n2(prev), n2(chg), Number(meta.fiftyTwoWeekLow) || null, Number(meta.fiftyTwoWeekHigh) || null,
                    roundTick(w20.length ? Math.min(...w20) : null), roundTick(w20.length ? Math.max(...w20) : null),
                    roundTick(w50.length ? w50.reduce((a, b) => a + b, 0) / w50.length : null),
                    Number.isFinite(vol) ? Math.round(vol) : null, lastDate, meta.longName || meta.shortName || '',
                ],
            };
        } catch (e) {
            if (attempt === 2) return { err: String(e.message || e) };
            await sleep(800 * (attempt + 1));
        }
    }
    return { err: 'retry' };
}

const rows = [];
let gone = 0, err = 0, i = 0, timedOut = false;
async function worker() {
    while (i < uni.length) {
        if (Date.now() - t0 > BUDGET_MS) { timedOut = true; return; }
        const t = uni[i++].t;
        const r = await fetchOne(t);
        if (r.row) rows.push(r.row); else if (r.gone) gone++; else err++;
        if (i % 100 === 0) console.log(`${i}/${uni.length} ok=${rows.length} gone=${gone} err=${err}`);
        await sleep(60);
    }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

if (rows.length < 100) { console.error(`Hanya ${rows.length} baris — tidak ditulis`); process.exit(1); }
// kalau waktu habis / banyak error, pertahankan baris lama untuk kode yang belum terambil
let old = [];
try { old = JSON.parse(fs.readFileSync(outPath, 'utf8')).rows || []; } catch (_) {}
const have = new Set(rows.map((r) => r[0]));
if (timedOut || err > rows.length * 0.2) for (const r of old) if (!have.has(r[0])) rows.push(r);
rows.sort((a, b) => a[0].localeCompare(b[0]));
const names = {};
for (const u of uni) if (u.name) names[u.t] = u.name;
const meta = {};
for (const u of uni) if (u.board || u.sector) meta[u.t] = [u.board || '', u.sector || ''];
fs.writeFileSync(outPath, JSON.stringify({
    meta: { source: 'Yahoo Finance', built: new Date().toISOString(), count: rows.length, universe: uni.length, gone, err, timedOut,
        cols: ['t', 'price', 'prev', 'chg', 'low52', 'high52', 'support', 'resist', 'avg', 'vol', 'date', 'name'] },
    rows,
    info: meta, names,
}));
console.log(`Wrote ${outPath}: ${rows.length} emiten (universe ${uni.length}, gone ${gone}, err ${err})`);
