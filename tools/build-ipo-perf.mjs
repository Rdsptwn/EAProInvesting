/**
 * Riwayat harga tiap emiten IPO -> assets/data/ipo-perf.json
 * Untuk setiap ticker di assets/data/ipo.json ambil Yahoo chart (range=max, harian) lalu hitung:
 *  - hari-1: penutupan hari pertama vs harga IPO
 *  - ATH sejak listing (high tertinggi, tanggalnya) dan kenaikan ATH vs harga IPO
 *  - harga terakhir dan kenaikan vs harga IPO, serta drawdown dari ATH
 * Format: perf[T] = [firstDate, firstClose, athPrice, athDate, last, lastDate, minLowAfterIpo, splitFactor]
 * splitFactor = hasil kali (numerator/denominator) semua stock split sejak listing; harga Yahoo sudah disesuaikan split,
 * jadi harga IPO pembanding = harga IPO / splitFactor (reverse split memberi faktor < 1).
 * Jalankan: node tools/build-ipo-perf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const inPath = path.join(root, 'assets/data/ipo.json');
const outPath = path.join(root, 'assets/data/ipo-perf.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', Accept: 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const day = (s) => new Date((s + 7 * 3600) * 1000).toISOString().slice(0, 10);

const items = JSON.parse(fs.readFileSync(inPath, 'utf8')).items || [];
let old = {};
try { old = JSON.parse(fs.readFileSync(outPath, 'utf8')).perf || {}; } catch (_) {}

async function one(t) {
    for (let a = 0; a < 3; a++) {
        try {
            const url = `https://query2.finance.yahoo.com/v8/finance/chart/${t}.JK?range=max&interval=1d&includePrePost=false&events=split`;
            const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
            if (r.status === 404) return null;
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const j = await r.json();
            const res = j && j.chart && j.chart.result && j.chart.result[0];
            if (!res || !res.timestamp) return null;
            const q = (res.indicators.quote && res.indicators.quote[0]) || {};
            let first = null, ath = -1, athI = -1, min = Infinity, last = null, lastI = -1;
            for (let i = 0; i < res.timestamp.length; i++) {
                const c = q.close && q.close[i], h = q.high && q.high[i], l = q.low && q.low[i];
                if (!Number.isFinite(c)) continue;
                if (first === null) first = i;
                const hh = Number.isFinite(h) ? h : c;
                if (hh > ath) { ath = hh; athI = i; }
                if (Number.isFinite(l) && l < min) min = l;
                last = c; lastI = i;
            }
            if (first === null) return null;
            let sf = 1;
            const sp = res.events && res.events.splits;
            if (sp) for (const k of Object.keys(sp)) { const e = sp[k]; if (e && e.numerator > 0 && e.denominator > 0 && e.date >= res.timestamp[first] - 86400) sf *= e.numerator / e.denominator; }
            return [day(res.timestamp[first]), q.close[first], ath, day(res.timestamp[athI]), last, day(res.timestamp[lastI]), Number.isFinite(min) ? min : null, +sf.toFixed(6)];
        } catch (e) { if (a < 2) await sleep(1500 * (a + 1)); }
    }
    return undefined; // gagal sementara: pakai data lama
}

const perf = {};
let ok = 0, miss = 0, kept = 0;
const queue = items.map((x) => x.t);
async function worker() {
    while (queue.length) {
        const t = queue.shift();
        const v = await one(t);
        if (v) { perf[t] = v; ok++; }
        else if (v === undefined && old[t]) { perf[t] = old[t]; kept++; }
        else miss++;
        await sleep(150);
    }
}
await Promise.all(Array.from({ length: 5 }, worker));
fs.writeFileSync(outPath, JSON.stringify({ asOf: new Date().toISOString(), n: Object.keys(perf).length, perf }));
console.log(`ipo-perf: ${ok} baru, ${kept} dari data lama, ${miss} tanpa data Yahoo, total ${Object.keys(perf).length}/${items.length}`);
