/**
 * Daftar SEMUA emiten saham BEI (kode, nama, papan, sektor) -> assets/data/idx-universe.json
 * Sumber (dicoba berurutan, hasilnya digabung):
 *   1. API BEI (idx.co.id) — sering memblokir bot, jadi opsional
 *   2. Wikipedia Indonesia, "Daftar perusahaan yang tercatat di Bursa Efek Indonesia" (API MediaWiki resmi)
 *   3. Daftar yang sudah ada + semua kode di data konglo (tidak pernah mengecilkan daftar)
 * Kode yang ternyata tidak ada di Yahoo akan dibuang oleh build-idx-screener.mjs.
 * Jalankan: node tools/build-idx-universe.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'assets/data/idx-universe.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', Accept: 'application/json,text/html' };
const CODE = /^[A-Z]{4}$/;

const map = new Map(); // kode -> {t,name,board,sector}
function put(t, name, board, sector) {
    t = String(t || '').trim().toUpperCase();
    if (!CODE.test(t)) return;
    const o = map.get(t) || { t, name: '', board: '', sector: '' };
    if (name && !o.name) o.name = String(name).trim();
    if (board) o.board = String(board).trim();
    if (sector) o.sector = String(sector).trim();
    map.set(t, o);
}

// --- 0. daftar yang sudah ada + konglo
try {
    const old = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    for (const i of old.items || []) put(i.t, i.name, i.board, i.sector);
} catch (_) {}
try {
    const src = fs.readFileSync(path.join(root, 'assets/js/pages/page-konglo-data-funda.js'), 'utf8');
    for (const m of src.matchAll(/ticker:\s*"([A-Z]{4})"/g)) put(m[1]);
} catch (_) {}
const seed = map.size;

// --- 1. IDX
async function tryIdx() {
    const urls = [
        'https://www.idx.co.id/primary/ListedCompany/GetCompanyProfiles?emitenType=s&start=0&length=2000',
        'https://www.idx.co.id/primary/StockData/GetSecuritiesStock?start=0&length=2000&code=&sector=&board=&language=id-id',
    ];
    for (const u of urls) {
        try {
            const r = await fetch(u, { headers: { ...UA, Referer: 'https://www.idx.co.id/' } });
            if (!r.ok) throw new Error(r.status);
            const j = await r.json();
            const rows = j.data || j.Data || j.rows || [];
            let n = 0;
            for (const x of rows) {
                const code = x.KodeEmiten || x.Code || x.code || x.kode;
                if (code) { put(code, x.NamaEmiten || x.Name || x.Company || x.nama, x.PapanPencatatan || x.Board || '', x.Sektor || x.Sector || ''); n++; }
            }
            console.log(`IDX ${u.split('/').pop().slice(0, 28)}: ${n} baris`);
            if (n > 500) return;
        } catch (e) { console.warn('IDX gagal:', e.message); }
    }
}

// --- 2. Wikipedia
function cellText(h) {
    return h.replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
async function tryWiki() {
    const page = 'Daftar_perusahaan_yang_tercatat_di_Bursa_Efek_Indonesia';
    try {
        const r = await fetch(`https://id.wikipedia.org/w/api.php?action=parse&page=${page}&prop=text&format=json&formatversion=2`, { headers: UA });
        if (!r.ok) throw new Error(r.status);
        const html = (await r.json())?.parse?.text || '';
        let n = 0;
        for (const tr of html.match(/<tr[\s\S]*?<\/tr>/g) || []) {
            const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/g) || []).map(cellText);
            if (cells.length < 3) continue;
            // kolom: No | Kode | Nama | Tanggal | Jumlah saham | Papan | Sektor
            const i = cells.findIndex((c, k) => k <= 2 && CODE.test(c));
            if (i < 0) continue;
            put(cells[i], cells[i + 1], cells[i + 4] || cells[5] || '', cells[i + 5] || cells[6] || '');
            n++;
        }
        console.log(`Wikipedia: ${n} baris`);
    } catch (e) { console.warn('Wikipedia gagal:', e.message); }
}

await tryIdx();
await tryWiki();

const items = [...map.values()].sort((a, b) => a.t.localeCompare(b.t));
if (items.length < seed) { console.error('Daftar mengecil — dibatalkan'); process.exit(1); }
fs.writeFileSync(outPath, JSON.stringify({ asOf: new Date().toISOString(), count: items.length, items }, null, 0));
console.log(`Wrote ${outPath}: ${items.length} kode (awal ${seed})`);
