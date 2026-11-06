/* Ambil teks mentah halaman e-ipo.co.id (prospektus ringkas: harga, dana, penjamin) untuk id 1..MAX.
   Jalan di GitHub Actions (sandbox tidak bisa akses). Output: assets/data/raw/eipo-raw.json { id: teks } */
import fs from 'node:fs';
const MAX = +process.argv[2] || 420, OUT = 'assets/data/raw/eipo-raw.json';
fs.mkdirSync('assets/data/raw', { recursive: true });
let res = {};
try { res = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (_) {}
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
let next = 1, ok = 0, fail = 0;
async function worker() {
  while (next <= MAX) {
    const id = next++;
    if (res[id]) continue;
    try {
      const r = await fetch(`https://www.e-ipo.co.id/pipeline/get-additional-info?id=${id}`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; EwoksBot/1.0)' } });
      if (!r.ok) { fail++; continue; }
      const t = strip(await r.text());
      if (t.length > 80) { res[id] = t.slice(0, 7000); ok++; }
    } catch (_) { fail++; }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
fs.writeFileSync(OUT, JSON.stringify(res));
console.log('eipo-raw ok', ok, 'fail', fail, 'total', Object.keys(res).length);
