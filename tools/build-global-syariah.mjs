// Estimasi saham AS/global yang kira-kira memenuhi kriteria syariah (BUKAN fatwa / bukan daftar resmi).
// Aturan sederhana: (1) sektor keuangan konvensional dikeluarkan, (2) bisnis inti haram (alkohol, rokok, judi, babi,
// senjata, ganja) dikeluarkan lewat daftar manual, (3) total utang / total aset <= 33% (data terbaru).
// Rasio asli biasanya memakai kapitalisasi pasar & pendapatan bunga; data itu tidak tersedia di sini.
import fs from 'node:fs';
import path from 'node:path';
const D = 'assets/data';
const BAD = {
  alkohol: 'BUD TAP STZ DEO SAM MGPI BF-B BF-A BREW EAST WVVI DOLE'.split(' '),
  rokok: 'MO PM BTI LO UVV TPB VGR JAPAY'.split(' '),
  judi: 'MGM LVS WYNN CZR DKNG PENN FLUT BYD RSI CHDN GDEN RRR MCRI BALY GENI IGT LNW'.split(' '),
  babi: 'HRL TSN SFD'.split(' '),
  senjata: 'LMT RTX NOC GD LHX HII AXON SWBI RGR AOUT BWXT'.split(' '),
  ganja: 'CGC TLRY CRON SNDL ACB CURLF'.split(' '),
  dewasa: 'PLBY'.split(' ')
};
const badMap = {};
for (const [k, arr] of Object.entries(BAD)) arr.forEach((t) => { badMap[t] = k; });
const FIN = new Set(['Finance', 'Keuangan', 'Keuangan & Kripto']);
const rows = JSON.parse(fs.readFileSync(path.join(D, 'global-screener.json'), 'utf8')).rows;
const sector = {}; rows.forEach((r) => { sector[r[0]] = r[11]; });
const ok = [], no = {}; let noData = 0;
for (const f of fs.readdirSync(path.join(D, 'global-funda'))) {
  if (!f.endsWith('.json')) continue;
  const sh = JSON.parse(fs.readFileSync(path.join(D, 'global-funda', f), 'utf8')).t || {};
  for (const [t, v] of Object.entries(sh)) {
    const sec = sector[t] || v.s || '';
    if (sec === 'ETF') continue;
    if (badMap[t]) { no[t] = 'b:' + badMap[t]; continue; }
    if (FIN.has(sec)) { no[t] = 's'; continue; }
    let ratio = null;
    for (let i = (v.asset || []).length - 1; i >= 0; i--) {
      if (Number.isFinite(v.asset[i]) && v.asset[i] > 0 && Number.isFinite((v.debt || [])[i])) { ratio = v.debt[i] / v.asset[i]; break; }
    }
    if (ratio == null) { noData++; continue; }
    if (ratio > 0.33) { no[t] = 'u:' + Math.round(ratio * 100); continue; }
    ok.push(t);
  }
}
if (ok.length < 100) { console.log('terlalu sedikit (' + ok.length + '), file lama dipertahankan'); process.exit(0); }
ok.sort();
fs.writeFileSync(path.join(D, 'global-syariah.json'), JSON.stringify({
  meta: { built: new Date().toISOString(), rule: 'Estimasi: bukan sektor keuangan konvensional, bukan bisnis haram (daftar manual), utang/aset <= 33%', ok: ok.length, tak_lolos: Object.keys(no).length, tanpa_data: noData },
  ok, no
}));
console.log('syariah estimasi: lolos', ok.length, '| tidak lolos', Object.keys(no).length, '| tanpa data', noData);
