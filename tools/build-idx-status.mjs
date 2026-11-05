/* Gabungkan penanda manual (idx-status-manual.json) + penanda otomatis dari idx-screener.json
   -> assets/data/idx-status.json  { asOf, built, items: { KODE: [[kind, note, src?], ...] } }
   Otomatis: IDLE (tidak ada transaksi >14 hari di data bursa), GOCAP (harga <= Rp50). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(root, 'assets/data', f), 'utf8'));
const man = rd('idx-status-manual.json');
let scr = { rows: [], meta: {} };
try { scr = rd('idx-screener.json'); } catch (_) {}
const built = new Date((scr.meta && scr.meta.built) || Date.now()).getTime();
const items = {};
const add = (t, k, n, s) => { (items[t] = items[t] || []).push(s ? [k, n, s] : [k, n]); };
for (const [t, a] of Object.entries(man.flags)) for (const f of a) add(t, f.k, f.note, f.src);
const dmy = (s) => new Date(s + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
for (const r of scr.rows) {
  const [t, price, , , , , , , , , date] = r;
  const hasManual = (items[t] || []).some((x) => x[0] === 'SUSPEN' || x[0] === 'DELIST');
  const idle = date && (built - new Date(date)) / 86400000 > 14;
  if (idle && !hasManual) add(t, 'IDLE', `Tidak ada transaksi sejak ${dmy(date)} di data bursa (indikasi suspensi/tidak likuid, belum tentu resmi)`);
  if (!idle && price > 0 && price <= 50) add(t, 'GOCAP', `Harga Rp${price} (batas bawah Rp50)`);
}
fs.writeFileSync(path.join(root, 'assets/data/idx-status.json'), JSON.stringify({ asOf: man.asOf, built: new Date(built).toISOString(), note: man.note, count: Object.keys(items).length, items }));
console.log('idx-status:', Object.keys(items).length, 'emiten bertanda');
