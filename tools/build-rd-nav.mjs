// NAB reksa dana harian + return 1B/3B/6B/1T/3T/5T untuk fund di assets/data/rd-map.json.
// Sumber: dataset publik risan/reksadana-id (hasil scrape Bibit/Bareksa/Kontan, diperbarui harian). Bukan sumber resmi.
// Lokal: RD_SRC=/path/ke/reksadana-id/data node tools/build-rd-nav.mjs   (default: raw.githubusercontent.com)
import fs from 'node:fs';

const BASE = 'https://raw.githubusercontent.com/risan/reksadana-id/main/data/';
const SRC = process.env.RD_SRC ? process.env.RD_SRC.replace(/\/?$/, '/') : '';
const OUT = 'assets/data/rd-nav.json';

async function get(p) {
    if (SRC) return fs.existsSync(SRC + p) ? fs.readFileSync(SRC + p, 'utf8') : null;
    for (let i = 0; i < 3; i++) {
        try {
            const r = await fetch(BASE + p);
            if (r.status === 404) return null;
            if (r.ok) return await r.text();
        } catch (_) {}
        await new Promise((r) => setTimeout(r, 1500));
    }
    return null;
}
function csv(text) {
    const rows = [];
    for (const line of text.split(/\r?\n/)) {
        if (!line) continue;
        const o = []; let cur = '', q = false;
        for (const ch of line) {
            if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(cur); cur = ''; } else cur += ch;
        }
        o.push(cur); rows.push(o);
    }
    const h = rows.shift() || [];
    return rows.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}
const dayMs = 864e5;
const t = (d) => Date.parse(d + 'T00:00:00Z');
function valAtOrBefore(pts, ms) {
    let lo = 0, hi = pts.length - 1, ans = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (pts[m][0] <= ms) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans;
}
function build(rows, hasAdj) {
    const pts = rows.map((r) => {
        const v = Number(hasAdj && r.nav_adjusted ? r.nav_adjusted : r.nav);
        return [t(r.date), v, Number(r.nav), r.date];
    }).filter((p) => p[1] > 0 && Number.isFinite(p[0])).sort((a, b) => a[0] - b[0]);
    if (pts.length < 2) return null;
    const last = pts[pts.length - 1], prev = pts[pts.length - 2];
    const ret = {};
    for (const [k, days] of [['1b', 30], ['3b', 91], ['6b', 182], ['1t', 365], ['3t', 1095], ['5t', 1826]]) {
        const target = last[0] - days * dayMs, i = valAtOrBefore(pts, target);
        // data harus mencakup titik acuan (toleransi 10 hari bila fund baru/kosong)
        ret[k] = i >= 0 && target - pts[i][0] <= 10 * dayMs ? +((last[1] / pts[i][1] - 1) * 100).toFixed(2) : null;
    }
    const from = last[0] - 1826 * dayMs, wk = new Map();
    for (const p of pts) if (p[0] >= from) wk.set(Math.floor(p[0] / (7 * dayMs)), p);
    const s = [...wk.values()];
    if (s[s.length - 1][0] !== last[0]) s.push(last);
    return {
        d: last[3], v: last[2], c1d: +((last[1] / prev[1] - 1) * 100).toFixed(3), prevD: prev[3],
        first: pts[0][3], np: pts.length, ret,
        s: { d: s.map((p) => p[3]), v: s.map((p) => +p[2].toFixed(4)) },
    };
}

const map = JSON.parse(fs.readFileSync('assets/data/rd-map.json', 'utf8')).map;
const funds = csv(await get('funds.csv') || '');
if (funds.length < 1000) { console.error('funds.csv tidak terbaca'); process.exit(1); }
const byId = Object.fromEntries(funds.map((f) => [f.id, f]));
const out = { asOf: '', source: 'github.com/risan/reksadana-id (scrape Bibit/Bareksa/Kontan; tidak resmi)', funds: {} };
let ok = 0, miss = [];
for (const [pg, m] of Object.entries(map)) {
    const f = byId[m.f];
    if (!f) { miss.push(pg); continue; }
    const tries = [];
    if (f.bibit) tries.push(['bibit', `bibit/nav/${f.bibit.split(/\s+/)[0]}.csv`]);
    if (f.bareksa) tries.push(['bareksa', `bareksa/nav/${f.bareksa}.csv`]);
    if (f.kontan) tries.push(['kontan', `kontan/nav/${f.kontan}.csv`]);
    // Kumpulkan semua sumber; pilih yang cukup segar (maks 7 hari dari yang terbaru) dengan riwayat terpanjang.
    const cands = [];
    for (const [src, p] of tries) {
        const txt = await get(p); if (!txt) continue;
        const b = build(csv(txt), src === 'bibit');
        if (b) cands.push({ src, ...b });
    }
    const maxD = cands.map((c) => c.d).sort().pop();
    const fresh = cands.filter((c) => t(c.d) >= t(maxD) - 7 * dayMs);
    const best = fresh.sort((a, b) => (a.first < b.first ? -1 : a.first > b.first ? 1 : 0))[0];
    // NAB lebih dari 14 hari lalu dianggap basi (fund tutup / sumber tidak lagi memperbarui): jangan ditampilkan.
    if (!best || t(best.d) < Date.now() - 14 * dayMs) { miss.push(pg); continue; }
    out.funds[pg] = { n: f.name, id: f.id, ...best };
    ok++;
}
out.asOf = Object.values(out.funds).map((x) => x.d).sort().pop() || '';
if (!ok) { console.error('tidak ada fund terbaca'); process.exit(1); }
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`rd-nav: ${ok} fund, tanpa data: ${miss.join(',') || '-'}, asOf ${out.asOf}, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
