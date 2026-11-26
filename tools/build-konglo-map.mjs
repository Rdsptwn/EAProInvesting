// Peta kode saham -> grup konglo (dipakai kartu Rekomendasi Bot untuk menandai "bagian dari konglo").
// Jalankan lagi setiap kali assets/js/pages/page-konglo-data-funda.js diubah: node tools/build-konglo-map.mjs
import fs from 'node:fs';
const src = fs.readFileSync('assets/js/pages/page-konglo-data-funda.js', 'utf8');
const a = src.indexOf('const dataGroups'), b = src.indexOf('const fundaRealDB');
if (a < 0 || b < 0) throw new Error('penanda dataGroups/fundaRealDB tidak ketemu');
const groups = new Function(src.slice(a, b) + '\nreturn dataGroups;')();
const map = {};
for (const g of groups) {
    const name = String(g.name || g.id).replace(/\s*\(.*?\)/g, '').trim().replace(/\s*Group$/i, '');
    for (const e of g.emiten || g.stocks || g.items || g.tickers || []) {
        if (!e || !e.ticker) continue;
        // c=1: pemegang saham di Stockbit memang menunjukkan keterkaitan; c=0: tercatat di grup tapi belum terlihat di daftar pemegang saham
        const c = /Data Stockbit/.test(e.ownership || '') && !/tidak terlihat/.test(e.ownership || '') ? 1 : 0;
        (map[e.ticker] = map[e.ticker] || []).push([name, c]);
    }
}
for (const t of Object.keys(map)) map[t].sort((x, y) => y[1] - x[1]);
fs.writeFileSync('assets/data/konglo-map.json', JSON.stringify({ built: new Date().toISOString(), n: Object.keys(map).length, m: map }));
console.log('konglo-map.json:', Object.keys(map).length, 'ticker,', groups.length, 'grup');
