/**
 * Hitung return 1/3/5 tahun saham IHSG dari harga bulanan Yahoo (adjclose, sudah memperhitungkan split dan dividen).
 * Hasil: assets/data/idx-ret.json  { asOf, rows: { KODE: [r1y, r3y, r5y] } }  (persen; null bila riwayat belum cukup)
 * Dipakai chat Tido: /topreturn idx 5
 * Jalankan: node tools/build-ret5y.mjs  (GitHub Actions: Sync return 5 tahun)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const D = path.join(__dirname, '..', 'assets/data');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const YEARS = [1, 3, 5];

/** ts: detik epoch, px: harga penyesuaian. Return [r1,r3,r5] persen atau null per periode. */
export function calcReturns(ts, px, nowMs = Date.now()) {
    const pts = [];
    for (let i = 0; i < ts.length; i++) if (ts[i] && Number.isFinite(px[i]) && px[i] > 0) pts.push([ts[i] * 1000, px[i]]);
    if (pts.length < 3) return YEARS.map(() => null);
    const last = pts[pts.length - 1];
    return YEARS.map((y) => {
        const target = new Date(last[0]); target.setFullYear(target.getFullYear() - y);
        const tt = target.getTime(); let best = null;
        for (const p of pts) { if (p[0] >= tt - 20 * 864e5) { best = p; break; } }  // titik pertama pada/ setelah target (toleransi 20 hari)
        if (!best || best[0] - tt > 45 * 864e5) return null;                            // riwayat belum cukup
        return +((last[1] / best[1] - 1) * 100).toFixed(1);
    });
}

async function main() {
    const scr = JSON.parse(fs.readFileSync(path.join(D, 'idx-screener.json'), 'utf8')).rows;
    let st = {}; try { st = JSON.parse(fs.readFileSync(path.join(D, 'idx-status.json'), 'utf8')).items; } catch {}
    const list = scr.filter((r) => r[1] > 50 && !(st[r[0]] || []).some((f) => f[0] === 'DELIST')).map((r) => r[0]);
    const out = { asOf: new Date().toISOString().slice(0, 10), note: 'Return dari harga penyesuaian bulanan Yahoo Finance (termasuk split/dividen). null = riwayat belum cukup.', rows: {} };
    let ok = 0, fail = 0;
    for (const t of list) {
        try {
            const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${t}.JK?interval=1mo&range=5y`, { headers: UA });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const r = (await res.json())?.chart?.result?.[0]; if (!r) throw new Error('kosong');
            const px = r.indicators?.adjclose?.[0]?.adjclose || r.indicators?.quote?.[0]?.close || [];
            const rr = calcReturns(r.timestamp || [], px); if (rr.some((v) => v != null)) { out.rows[t] = rr; ok++; }
        } catch { fail++; }
        await sleep(300);
    }
    fs.writeFileSync(path.join(D, 'idx-ret.json'), JSON.stringify(out));
    console.log(`Selesai. terisi=${ok} gagal/kosong=${fail} dari ${list.length}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
