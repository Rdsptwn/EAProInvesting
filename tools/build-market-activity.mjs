/**
 * Aktivitas perdagangan seluruh pasar: All Market, Regular, Nego (nilai, volume, frekuensi) — data penutupan harian BEI.
 * Sumber: halaman statistik BEI "Daily Stock Trading by Type of Market" (idx.id), endpoint
 * /primary/DigitalStatistic/GetApiData?urlName=LINK_DAILY_TRADING_MARKET_REGNONREG&query=
 * API ini hanya melayani permintaan dari dalam halaman (cookie/WAF), jadi dipanggil lewat browser headless (Playwright).
 * Satuan dari BEI: nilai = juta Rupiah, volume = juta lembar, frekuensi = kali. Nego = non-reguler (negosiasi + tunai).
 * Bila gagal, file lama dipertahankan (web menampilkan tanggalnya).
 * Jalankan: node tools/build-market-activity.mjs   (butuh: npm i --no-save playwright && npx playwright install chromium)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'assets/data/market-activity.json');
const PAGE = 'https://www.idx.id/en/market-data/statistical-reports/digital-statistic/monthly/equity-trading-by-market/daily-stock-trading-by-type-of-market';
const API = '/primary/DigitalStatistic/GetApiData?urlName=LINK_DAILY_TRADING_MARKET_REGNONREG&query=&isPrint=False&cumulative=false';
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** baris BEI -> {asOf, all, regular, nego} dalam Rupiah / lembar / kali */
export function convert(row) {
    const M = 1e6;
    return {
        asOf: String(row.date).slice(0, 10),
        all: { value: n(row.totalValue) * M, volume: n(row.totalVolume) * M, freq: n(row.totalFreq) },
        regular: { value: n(row.regularValue) * M, volume: n(row.regularVolume) * M, freq: n(row.regularFreq) },
        nego: { value: n(row.nonRegularValue) * M, volume: n(row.nonRegularVolume) * M, freq: n(row.nonRegularFreq) },
    };
}

export function valid(a) {
    return /^\d{4}-\d{2}-\d{2}$/.test(a.asOf) && a.all.value > 1e12 && a.all.value < 1e15
        && a.regular.value > 0 && a.nego.value >= 0
        && Math.abs(a.regular.value + a.nego.value - a.all.value) / a.all.value < 0.01
        && a.all.volume > 1e8 && a.all.freq > 1e4;
}

async function main() {
    const { chromium } = await import('playwright');
    const b = await chromium.launch();
    try {
        const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', locale: 'en-US' });
        const pg = await ctx.newPage();
        await pg.goto(PAGE, { waitUntil: 'networkidle', timeout: 60000 });
        await pg.waitForTimeout(3000);
        let json;
        for (let i = 0; i < 3 && !json; i++) {
            json = await pg.evaluate(async (u) => { try { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; } catch { return null; } }, API);
            if (!json) await pg.waitForTimeout(3000);
        }
        const rows = (json?.data || []).filter((r) => r?.date).sort((x, y) => String(x.date).localeCompare(String(y.date)));
        if (!rows.length) throw new Error('data kosong / diblokir');
        console.log('3 baris terakhir:', JSON.stringify(rows.slice(-3)));
        const agg = convert(rows[rows.length - 1]);
        if (!valid(agg)) throw new Error('hasil tidak lolos validasi: ' + JSON.stringify(agg));
        fs.writeFileSync(outPath, JSON.stringify({ session: 'penutupan', source: 'BEI (idx.id)', ...agg, builtAt: new Date().toISOString() }, null, 1));
        console.log(`market-activity: ${agg.asOf} all=${(agg.all.value / 1e12).toFixed(2)}T reg=${(agg.regular.value / 1e12).toFixed(2)}T nego=${(agg.nego.value / 1e12).toFixed(2)}T`);
    } finally { await b.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.warn('market-activity gagal:', e.message); });
