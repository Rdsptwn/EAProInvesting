/**
 * Aktivitas perdagangan seluruh pasar: All Market, Regular, Nego (nilai, volume, frekuensi).
 * Sumber: ringkasan saham BEI (idx.co.id). Reguler = total - non-reguler (negosiasi + tunai).
 * BEI sering memblokir bot; bila gagal, file lama dipertahankan (web menampilkan tanggalnya).
 * Jalankan: node tools/build-market-activity.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'assets/data/market-activity.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', Accept: 'application/json', Referer: 'https://www.idx.co.id/' };
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** rows = array ringkasan per saham dari BEI -> {all, regular, nego} */
export function aggregate(rows) {
    const t = { value: 0, volume: 0, freq: 0 }, nr = { value: 0, volume: 0, freq: 0 };
    for (const r of rows) {
        t.value += n(r.Value); t.volume += n(r.Volume); t.freq += n(r.Frequency);
        nr.value += n(r.NonRegularValue); nr.volume += n(r.NonRegularVolume); nr.freq += n(r.NonRegularFrequency);
    }
    const reg = { value: t.value - nr.value, volume: t.volume - nr.volume, freq: t.freq - nr.freq };
    return { all: t, regular: reg, nego: nr };
}

export function valid(a) {
    return a.all.value > 1e11 && a.regular.value > 0 && a.nego.value >= 0 && a.regular.value <= a.all.value && a.regular.volume > 0;
}

async function main() {
    const urls = [
        'https://www.idx.co.id/primary/TradingSummary/GetStockSummary?length=9999&start=0',
        'https://www.idx.co.id/primary/TradingSummary/GetStockSummary?length=2000&start=0',
    ];
    for (const u of urls) {
        try {
            const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(25000) });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const j = await r.json();
            const rows = Array.isArray(j?.data) ? j.data : [];
            if (rows.length < 300) throw new Error(`baris terlalu sedikit (${rows.length})`);
            const agg = aggregate(rows);
            if (!valid(agg)) throw new Error('hasil tidak lolos validasi');
            const date = String(rows[0]?.Date || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
            fs.writeFileSync(outPath, JSON.stringify({ asOf: date, session: 'BEI', source: 'idx.co.id', ...agg, builtAt: new Date().toISOString() }, null, 1));
            console.log(`market-activity: ${date} all=${(agg.all.value / 1e12).toFixed(2)}T reg=${(agg.regular.value / 1e12).toFixed(2)}T nego=${(agg.nego.value / 1e12).toFixed(2)}T`);
            return;
        } catch (e) { console.warn('BEI summary:', e.message); }
    }
    console.warn('market-activity: semua sumber gagal, file lama dipertahankan');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.warn(e.message); });
