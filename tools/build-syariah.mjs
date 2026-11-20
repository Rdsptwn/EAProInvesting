/**
 * Daftar saham syariah (ISSI / Daftar Efek Syariah OJK) -> assets/data/syariah.json  { asOf, source, t:[kode...] }
 * Sumber: halaman daftar saham syariah BEI (idx.id), menangkap respons JSON yang dimuat halaman lewat browser headless.
 * Bila gagal, file lama dipertahankan (atau tidak dibuat) dan web tidak menampilkan label syariah.
 * File assets/data/syariah-manual.json ({ "t": ["AAAA", ...], "asOf": "2026-06-01", "source": "OJK DES periode ..." }) bila ada, dipakai sebagai cadangan.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'assets/data/syariah.json');
const PAGES = [
    'https://www.idx.id/en/market-data/stocks-data/sharia-stock-list/',
    'https://www.idx.id/en/market-data/stocks-data/syariah-stock-list/',
    'https://www.idx.id/en/market-data/index-data/index-constituent/',
];
const CODE = /^[A-Z]{4}$/;

/** cari array objek yang punya kolom kode saham 4 huruf, mengembalikan kodenya */
export function extractCodes(json) {
    let best = [];
    const walk = (v) => {
        if (Array.isArray(v)) {
            const codes = v.map((o) => o && typeof o === 'object' ? (o.Code || o.StockCode || o.code || o.Kode || o.KodeEmiten || o.CompanyCode || o.IDCompany) : null)
                .map((c) => String(c || '').trim().toUpperCase()).filter((c) => CODE.test(c));
            if (codes.length > best.length) best = codes;
            v.slice(0, 5).forEach(walk);
        } else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(json);
    return [...new Set(best)];
}

async function main() {
    const { chromium } = await import('playwright');
    const b = await chromium.launch();
    let found = [], src = '';
    try {
        const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', locale: 'en-US' });
        for (const url of PAGES) {
            const pg = await ctx.newPage();
            const caught = [];
            pg.on('response', async (r) => { try { if (/json/.test(r.headers()['content-type'] || '') && /idx\.(id|co\.id)/.test(r.url())) { const codes = extractCodes(await r.json()); if (codes.length) caught.push({ u: r.url(), codes }); } } catch (_) {} });
            try { await pg.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); await pg.waitForTimeout(4000); } catch (e) { console.log('gagal buka', url, e.message); }
            await pg.close();
            console.log(url, caught.map((c) => `${c.u.split('?')[0]}=${c.codes.length}`).join(' ') || '(tidak ada JSON daftar kode)');
            const best = caught.sort((a, c) => c.codes.length - a.codes.length)[0];
            if (best && /sharia|syariah|issi/i.test(url + best.u) && best.codes.length >= 300 && best.codes.length > found.length) { found = best.codes; src = best.u; }
        }
    } finally { await b.close(); }
    if (found.length < 300) {
        try {
            const m = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/syariah-manual.json'), 'utf8'));
            if (Array.isArray(m.t) && m.t.length >= 300) { found = m.t.map((x) => String(x).toUpperCase()).filter((c) => CODE.test(c)); src = m.source || 'manual'; }
        } catch (_) {}
    }
    if (found.length < 300) throw new Error(`daftar syariah tidak ditemukan (${found.length})`);
    fs.writeFileSync(outPath, JSON.stringify({ asOf: new Date().toISOString().slice(0, 10), source: src.replace(/\?.*/, ''), count: found.length, t: found.sort() }));
    console.log('syariah:', found.length, 'saham');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.warn('syariah gagal:', e.message); });
