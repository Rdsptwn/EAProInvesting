/* Jumlah saham beredar emiten konglo (dari Yahoo fundamentals-timeseries), dipakai Peta Konglo untuk
   "nilai saham yang dipegang (estimasi)" = persen kepemilikan x jumlah saham x harga live.
   Output: assets/data/idx-shares.json { meta, s: { TICKER: [jumlahSaham, tanggalData] } }.
   Emiten yang gagal diambil tetap memakai nilai lama (tidak dihapus). Belum pernah dites ke Yahoo dari sandbox. */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = 'assets/data/idx-shares.json';
const TYPES = 'quarterlyOrdinaryShareNumber,annualOrdinaryShareNumber,quarterlyShareIssued,annualShareIssued';
const ORDER = TYPES.split(',');

/** Ambil nilai terbaru dari hasil timeseries: kuartalan dulu, lalu tahunan; ShareIssued hanya cadangan. */
export function pickShares(results) {
    const by = {};
    for (const b of results || []) {
        const t = b?.meta?.type?.[0];
        if (t) by[t] = (b[t] || []).filter((x) => x && x.reportedValue && x.reportedValue.raw > 0);
    }
    for (const t of ORDER) {
        const a = by[t];
        if (a && a.length) {
            const last = a.reduce((m, x) => (String(x.asOfDate) > String(m.asOfDate) ? x : m));
            return [Math.round(last.reportedValue.raw), String(last.asOfDate)];
        }
    }
    return null;
}

async function fetchShares(ticker) {
    const sym = `${ticker}.JK`;
    const p1 = Math.floor(new Date('2023-01-01').getTime() / 1000), p2 = Math.floor(Date.now() / 1000) + 86400 * 400;
    const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${sym}?symbol=${encodeURIComponent(sym)}&type=${TYPES}&period1=${p1}&period2=${p2}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return pickShares((await res.json())?.timeseries?.result);
}

async function main() {
    const tickers = Object.keys(JSON.parse(fs.readFileSync('assets/data/konglo-map.json', 'utf8')).m);
    let old = {};
    try { old = JSON.parse(fs.readFileSync(OUT, 'utf8')).s || {}; } catch (_) {}
    const s = { ...old };
    let ok = 0, fail = 0, i = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
        while (i < tickers.length) {
            const t = tickers[i++];
            try { const r = await fetchShares(t); if (r) { s[t] = r; ok++; } else fail++; } catch (_) { fail++; }
            await new Promise((r) => setTimeout(r, 150));
        }
    }));
    console.log(`saham beredar: ${ok} baru, ${fail} gagal/kosong, total tersimpan ${Object.keys(s).length}`);
    if (!ok && !Object.keys(old).length) { console.error('Tidak ada data sama sekali, file tidak ditulis.'); process.exit(1); }
    fs.writeFileSync(OUT, JSON.stringify({ meta: { built: new Date().toISOString(), source: 'Yahoo Finance fundamentals-timeseries (jumlah saham beredar terbaru)', n: Object.keys(s).length }, s }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
