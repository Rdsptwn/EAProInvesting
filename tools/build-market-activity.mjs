/**
 * Aktivitas perdagangan seluruh pasar: All Market, Regular, Nego (nilai, volume, frekuensi) — data penutupan harian BEI.
 * Sumber: API ringkasan perdagangan BEI (idx.id), dipanggil dari dalam halaman lewat browser headless (Playwright)
 * karena WAF BEI menolak permintaan langsung:
 *   GetStockSummary : per saham; Volume/Value/Frequency = pasar REGULER, NonRegular* = negosiasi + tunai
 *   GetIndexSummary : baris COMPOSITE = total pasar (dipakai untuk validasi silang: reguler + non-reguler harus = total)
 * Satuan: Rupiah, lembar saham, kali. Data terbit setelah bursa tutup (16:00 WIB); field Date menunjukkan hari datanya.
 * Bila gagal, file lama dipertahankan (web menampilkan tanggalnya).
 * Jalankan: node tools/build-market-activity.mjs   (butuh: npm i --no-save playwright && npx playwright install chromium)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'assets/data/market-activity.json');
const PAGE = 'https://www.idx.id/en/market-data/trading-summary/stock-summary/';
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** baris GetStockSummary -> {asOf, all, regular, nego} */
export function aggregate(rows) {
    const reg = { value: 0, volume: 0, freq: 0 }, nego = { value: 0, volume: 0, freq: 0 };
    for (const r of rows) {
        reg.value += n(r.Value); reg.volume += n(r.Volume); reg.freq += n(r.Frequency);
        nego.value += n(r.NonRegularValue); nego.volume += n(r.NonRegularVolume); nego.freq += n(r.NonRegularFrequency);
    }
    const all = { value: reg.value + nego.value, volume: reg.volume + nego.volume, freq: reg.freq + nego.freq };
    return { asOf: String(rows[0]?.Date || '').slice(0, 10), all, regular: reg, nego };
}

/** total dari agregasi harus cocok (<0,5%) dengan baris COMPOSITE BEI */
export function valid(a, composite) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.asOf)) return false;
    if (!(a.all.value > 1e12 && a.all.value < 1e15 && a.regular.value > 0 && a.nego.value >= 0 && a.all.volume > 1e8 && a.all.freq > 1e4)) return false;
    if (!composite) return true;
    const close = (x, y) => y > 0 && Math.abs(x - y) / y < 0.005;
    return close(a.all.value, n(composite.Value)) && close(a.all.volume, n(composite.Volume)) && close(a.all.freq, n(composite.Frequency));
}

async function main() {
    const { chromium } = await import('playwright');
    const b = await chromium.launch();
    try {
        const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', locale: 'en-US' });
        const pg = await ctx.newPage();
        await pg.goto(PAGE, { waitUntil: 'networkidle', timeout: 60000 });
        await pg.waitForTimeout(3000);
        const call = async (u) => {
            for (let i = 0; i < 3; i++) {
                const j = await pg.evaluate(async (u) => { try { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; } catch { return null; } }, u);
                if (j) return j;
                await pg.waitForTimeout(3000);
            }
            return null;
        };
        const stock = await call('/primary/TradingSummary/GetStockSummary?length=9999&start=0');
        const rows = stock?.data || [];
        if (rows.length < 300) throw new Error(`baris saham terlalu sedikit (${rows.length}) / diblokir`);
        const idx = await call('/primary/TradingSummary/GetIndexSummary?length=9999&start=0');
        const composite = (idx?.data || []).find((x) => x.IndexCode === 'COMPOSITE');
        const agg = aggregate(rows);
        if (!valid(agg, composite)) throw new Error('tidak lolos validasi silang: ' + JSON.stringify({ agg, composite }));
        const wib = new Date(Date.now() + 7 * 3600e3).toISOString();
        const session = `dicek ${wib.slice(11, 13)}.${wib.slice(14, 16)} WIB`;
        fs.writeFileSync(outPath, JSON.stringify({ session, source: 'BEI (idx.id)', ...agg, builtAt: new Date().toISOString() }, null, 1));
        console.log(`market-activity: ${agg.asOf} all=${(agg.all.value / 1e12).toFixed(2)}T reg=${(agg.regular.value / 1e12).toFixed(2)}T nego=${(agg.nego.value / 1e12).toFixed(2)}T`);
    } finally { await b.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.warn('market-activity gagal:', e.message); });
