/* Riwayat dividen & stock split dari Yahoo (chart events=div,split, 1 tahun) untuk semua emiten di idx-screener.json
   -> assets/data/idx-events.json { built, items: { KODE: { div:[[tglEx, nominal]...], split:[[tgl, rasio]...] } } }
   Jalan di GitHub Actions (butuh akses Yahoo). Hanya menyimpan kejadian 1 tahun terakhir. */
import fs from 'node:fs';
const scr = JSON.parse(fs.readFileSync('assets/data/idx-screener.json', 'utf8'));
const codes = (scr.rows || []).map((r) => r[0]);
const items = {};
let next = 0, ok = 0, bad = 0;
const iso = (s) => new Date(s * 1000).toISOString().slice(0, 10);
async function one(t) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${t}.JK?range=1y&interval=1d&events=div,split`, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(r.status);
  const j = await r.json();
  const ev = (j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].events) || {};
  const div = Object.values(ev.dividends || {}).map((x) => [iso(x.date), +(+x.amount).toFixed(4)]).sort();
  const split = Object.values(ev.splits || {}).map((x) => [iso(x.date), `${x.numerator}:${x.denominator}`]).sort();
  if (div.length || split.length) items[t] = { div, split };
}
async function worker() {
  while (next < codes.length) {
    const t = codes[next++];
    try { await one(t); ok++; } catch (_) { bad++; }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
if (ok >= codes.length * 0.5) fs.writeFileSync('assets/data/idx-events.json', JSON.stringify({ built: new Date().toISOString(), n: ok, items }));
console.log('idx-events ok', ok, 'bad', bad, 'with-events', Object.keys(items).length);
