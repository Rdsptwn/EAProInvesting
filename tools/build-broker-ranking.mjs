/**
 * Ranking broker harian (kode, nama, total nilai, total volume, total frekuensi) -> assets/data/broker-ranking.json
 * Sumber: API ringkasan broker BEI (idx.id), dipanggil dari dalam halaman lewat browser headless (WAF BEI menolak request langsung).
 * BEI hanya menerbitkan TOTAL per broker (nilai/volume/frekuensi). Rincian beli/jual/net per broker TIDAK dipublikasikan BEI
 * (itu data berlangganan), jadi kolom itu tidak ditampilkan di web.
 * Bila gagal, file lama dipertahankan. Jalankan: node tools/build-broker-ranking.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'assets/data/broker-ranking.json');
const PAGE = 'https://www.idx.id/en/market-data/trading-summary/broker-summary/';
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pick = (o, ...ks) => { for (const k of ks) if (o[k] != null && o[k] !== '') return o[k]; return ''; };

export function parseBrokers(json) {
    const rows = (json?.data || json?.Data || []).map((r) => ({
        code: String(pick(r, 'IDFirm', 'FirmCode', 'BrokerCode', 'Code')).trim().toUpperCase(),
        name: String(pick(r, 'FirmName', 'BrokerName', 'Name')).trim(),
        value: n(pick(r, 'Value', 'TotalValue')),
        volume: n(pick(r, 'Volume', 'TotalVolume')),
        freq: n(pick(r, 'Frequency', 'Freq', 'TotalFrequency')),
        date: String(pick(r, 'Date', 'TradeDate')).slice(0, 10),
    })).filter((r) => /^[A-Z]{2}$/.test(r.code) && r.value > 0);
    return rows.sort((a, b) => b.value - a.value);
}

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

async function main() {
    const { chromium } = await import('playwright');
    const b = await chromium.launch();
    try {
        const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', locale: 'en-US' });
        const pg = await ctx.newPage();
        await pg.goto(PAGE, { waitUntil: 'networkidle', timeout: 60000 });
        await pg.waitForTimeout(3000);
        const call = (u) => pg.evaluate(async (u) => { try { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; } catch { return null; } }, u);
        let rows = [], used = '';
        const wibNow = new Date(Date.now() + 7 * 3600e3);
        for (let back = 0; back < 6 && rows.length < 30; back++) {
            const d = new Date(wibNow.getTime() - back * 86400e3);
            if ([0, 6].includes(d.getUTCDay())) continue;
            for (let i = 0; i < 2 && rows.length < 30; i++) {
                const j = await call(`/primary/TradingSummary/GetBrokerSummary?length=9999&start=0&date=${ymd(d)}`);
                rows = parseBrokers(j);
                if (rows.length) used = ymd(d);
                if (rows.length < 30) await pg.waitForTimeout(2500);
            }
        }
        if (rows.length < 30) throw new Error(`baris broker terlalu sedikit (${rows.length}) / diblokir`);
        const asOf = rows[0].date || `${used.slice(0, 4)}-${used.slice(4, 6)}-${used.slice(6, 8)}`;
        const wib = new Date(Date.now() + 7 * 3600e3).toISOString();
        fs.writeFileSync(outPath, JSON.stringify({ asOf, builtAt: new Date().toISOString(), session: `dicek ${wib.slice(11, 13)}.${wib.slice(14, 16)} WIB`, source: 'BEI (idx.id)', rows: rows.map((r) => [r.code, r.name, r.value, r.volume, r.freq]) }, null, 1));
        console.log(`broker-ranking: ${asOf}, ${rows.length} broker, teratas ${rows[0].code} ${(rows[0].value / 1e12).toFixed(2)}T`);
    } finally { await b.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.warn('broker-ranking gagal:', e.message); });
