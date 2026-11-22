/**
 * Lengkapi arus kas (OCF, FCF) dan dividend yield untuk emiten yang sumber lapkeu-nya BEI (source "bei") di funda-idx.json.
 * Sumber BEI "Financial Data and Ratio" tidak memuat arus kas dan dividen, jadi dicoba dari Yahoo Finance (.JK).
 * Emiten yang tidak ada di Yahoo tetap 0 (tidak ditimpa). Data Yahoo emiten lain tidak disentuh.
 * Jalankan: node tools/build-funda-cf.mjs   (GitHub Actions: Sync funda cash flow)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'assets/data/funda-idx.json');
export const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
const IDX_Q1 = 6;
const TYPES = ['annualFreeCashFlow', 'annualOperatingCashFlow', 'annualCapitalExpenditure'].join(',');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Nilai laporan Yahoo -> triliun rupiah (3 desimal; USD dikonversi). */
export function toTril(row, fx) {
    const raw = Number(row?.reportedValue?.raw);
    if (!Number.isFinite(raw)) return null;
    const idr = String(row.currencyCode || 'IDR').toUpperCase() === 'USD' ? raw * fx : raw;
    return +(idr / 1e12).toFixed(3);
}
export function byYear(rows, fx) {
    const m = {};
    for (const r of rows || []) { const y = parseInt(String(r.asOfDate).slice(0, 4), 10); if (YEARS.includes(y) && y !== 2026) m[y] = toTril(r, fx); }
    return YEARS.map((y) => (y === 2026 ? null : m[y] ?? null));
}
/** Gabungkan arus kas Yahoo ke satu rekaman funda; hanya mengisi slot yang masih 0/kosong. Mengembalikan jumlah slot terisi. */
export function mergeCf(rec, byType, fx) {
    const ocf = byYear(byType.annualOperatingCashFlow, fx), fcf = byYear(byType.annualFreeCashFlow, fx), capex = byYear(byType.annualCapitalExpenditure, fx);
    let n = 0;
    for (let i = 0; i < 6; i++) {
        const f = fcf[i] != null ? fcf[i] : ocf[i] != null ? +(ocf[i] + (capex[i] || 0)).toFixed(3) : null;
        if (ocf[i] != null && !rec.ocf[i]) { rec.ocf[i] = ocf[i]; n++; }
        if (f != null && !rec.fcf[i]) { rec.fcf[i] = f; n++; }
    }
    return n;
}
export function divYields(json) {
    const y = YEARS.map(() => 0), r = json?.chart?.result?.[0]; if (!r) return y;
    const divs = r.events?.dividends || {}, ts = r.timestamp || [], cl = r.indicators?.quote?.[0]?.close || [], now = r.meta?.regularMarketPrice, by = {};
    for (const [t, d] of Object.entries(divs)) { const yr = new Date(Number(t) * 1000).getFullYear(); if (YEARS.includes(yr)) by[yr] = (by[yr] || 0) + (d.amount || 0); }
    for (let i = 0; i < 6; i++) {
        let best = null, bt = 0;
        for (let k = 0; k < ts.length; k++) if (ts[k] && new Date(ts[k] * 1000).getFullYear() === YEARS[i] && Number.isFinite(cl[k]) && ts[k] >= bt) { bt = ts[k]; best = cl[k]; }
        if (by[YEARS[i]] > 0 && best > 0) y[i] = +((by[YEARS[i]] / best) * 100).toFixed(1);
    }
    const ttm = Object.entries(divs).filter(([t]) => Number(t) * 1000 >= Date.now() - 365 * 864e5).reduce((s, [, d]) => s + (d.amount || 0), 0);
    if (ttm > 0 && now > 0) y[IDX_Q1] = +((ttm / now) * 100).toFixed(1);
    return y;
}

async function getJson(url) { const res = await fetch(url, { headers: UA }); if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); }
async function fxRate() { try { const j = await getJson('https://query2.finance.yahoo.com/v8/finance/chart/USDIDR=X?interval=1d&range=5d'); const p = j?.chart?.result?.[0]?.meta?.regularMarketPrice; return p > 0 ? p : 16000; } catch { return 16000; } }
async function timeseries(t) {
    const p1 = Math.floor(new Date('2019-01-01').getTime() / 1000), p2 = Math.floor(Date.now() / 1000) + 86400 * 400, s = t + '.JK';
    const j = await getJson(`https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${s}?symbol=${s}&type=${TYPES}&period1=${p1}&period2=${p2}`);
    const res = j?.timeseries?.result; if (!res?.length) throw new Error('no timeseries');
    const by = {}; for (const b of res) { const ty = b?.meta?.type?.[0]; if (ty) by[ty] = b[ty] || []; } return by;
}

async function main() {
    const j = JSON.parse(fs.readFileSync(outPath, 'utf8')), T = j.tickers, fx = await fxRate();
    const list = Object.keys(T).filter((k) => T[k].source === 'bei'); let ok = 0, miss = 0, slots = 0, dv = 0;
    console.log('emiten BEI:', list.length, 'USD/IDR', fx.toFixed(0));
    for (const k of list) {
        try {
            const n = mergeCf(T[k], await timeseries(k), fx); slots += n; if (n) { ok++; T[k].cfSource = 'yahoo'; }
            const y = divYields(await getJson(`https://query2.finance.yahoo.com/v8/finance/chart/${k}.JK?interval=1d&range=5y&events=div`));
            if (y.some((v) => v > 0)) { for (let i = 0; i < 7; i++) if (!T[k].divYield[i] && y[i]) T[k].divYield[i] = y[i]; dv++; }
        } catch (e) { miss++; }
        await sleep(320);
    }
    j.meta.cf = `Arus kas dan dividend yield emiten BEI dicoba dari Yahoo (${new Date().toISOString().slice(0, 10)}); yang tidak tersedia tetap 0.`;
    fs.writeFileSync(outPath, JSON.stringify(j, null, 2));
    console.log(`Selesai. arus kas terisi: ${ok} emiten (${slots} slot), dividen: ${dv}, tidak ada data: ${miss}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
