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
const UA = { 'User-Agent': 'EAProInvestingBot/1.0 (https://github.com/Rdsptwn/EAProInvesting; data sync)', Accept: 'application/json,text/html' };
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
        const r = await fetch(`https://id.wikipedia.org/w/api.php?action=parse&page=${page}&prop=text&redirects=1&format=json&formatversion=2`, { headers: UA });
        if (!r.ok) throw new Error(r.status);
        const html = (await r.json())?.parse?.text || '';
        const BOARDS = ['Utama', 'Pengembangan', 'Akselerasi', 'Pemantauan Khusus', 'Ekonomi Baru'];
        const chunks = html.split(/<tr[\s>]/).slice(1);
        console.log(`Wikipedia: html ${html.length} karakter, ${chunks.length} baris tabel`);
        let n = 0;
        for (const ch of chunks) {
            const cells = (ch.match(/<t[dh][\s\S]*?<\/t[dh]>/g) || []).map(cellText);
            if (cells.length < 3) continue;
            let code = null, ci = -1;
            for (let k = 0; k < Math.min(cells.length, 4) && !code; k++) {
                const m = cells[k].match(/(?:^|\b)IDX\s*:\s*([A-Z]{4})\b/) || cells[k].match(/^([A-Z]{4})$/);
                if (m) { code = m[1]; ci = k; }
            }
            if (!code) continue;
            const board = cells.find((c) => BOARDS.includes(c)) || '';
            const last = cells[cells.length - 1];
            const sector = last && last !== board && !/^\d/.test(last) ? last : '';
            put(code, cells[ci + 1] && cells[ci + 1] !== code ? cells[ci + 1] : '', board, sector);
            n++;
        }
        if (!n) console.log('Contoh baris tabel:', JSON.stringify(chunks.slice(1, 3).map((c) => cellText(c).slice(0, 200))));
        console.log(`Wikipedia: ${n} baris`);
    } catch (e) { console.warn('Wikipedia gagal:', e.message); }
}

await tryIdx();
await tryWiki();

const items = [...map.values()].sort((a, b) => a.t.localeCompare(b.t));
if (items.length < seed) { console.error('Daftar mengecil — dibatalkan'); process.exit(1); }
fs.writeFileSync(outPath, JSON.stringify({ asOf: new Date().toISOString(), count: items.length, items }, null, 0));
console.log(`Wrote ${outPath}: ${items.length} kode (awal ${seed})`);
