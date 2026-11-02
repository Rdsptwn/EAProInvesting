/**
 * Perbarui CAGR instrumen "etf-as" di assets/data/pasar-global.json
 * dari harga penutupan bulanan Stooq (alternatif selain Yahoo / TradingView, tanpa API key).
 *
 * - CAGR = berdasarkan harga penutupan (tanpa dividen), jendela 10 tahun (atau yang tersedia, min. 3 tahun).
 * - Instrumen yang gagal diambil tetap memakai angka lama (tidak ditimpa).
 * Jalankan: node tools/build-pasar-global.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'assets/data/pasar-global.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; EwoksAcademyBot/1.0)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** CSV Stooq: Date,Open,High,Low,Close,Volume -> [{date:Date, close:number}] */
export function parseStooqCsv(text) {
    const lines = String(text || '').trim().split(/\r?\n/);
    if (lines.length < 3 || !/^date/i.test(lines[0])) return [];
    return lines
        .slice(1)
        .map((ln) => ln.split(','))
        .map((c) => ({ date: new Date(c[0] + 'T00:00:00Z'), close: parseFloat(c[4]) }))
        .filter((r) => !Number.isNaN(r.date.getTime()) && Number.isFinite(r.close) && r.close > 0)
        .sort((a, b) => a.date - b.date);
}

/** CAGR (%) dari deret bulanan; jendela terpanjang <= yearsWanted, minimal minYears. */
export function computeCagr(rows, yearsWanted = 10, minYears = 3) {
    if (rows.length < 2) return null;
    const last = rows[rows.length - 1];
    const target = new Date(last.date);
    target.setUTCFullYear(target.getUTCFullYear() - yearsWanted);
    // titik awal: baris terakhir yang tanggalnya <= target; kalau riwayat lebih pendek, pakai baris pertama
    let start = rows[0];
    for (const r of rows) if (r.date <= target) start = r;
    const years = (last.date - start.date) / (365.25 * 24 * 3600 * 1000);
    if (years < minYears) return null;
    const cagr = (Math.pow(last.close / start.close, 1 / years) - 1) * 100;
    if (!Number.isFinite(cagr)) return null;
    return { cagr: +cagr.toFixed(1), years: +years.toFixed(1), from: start.date.toISOString().slice(0, 10), to: last.date.toISOString().slice(0, 10) };
}

/** Return per tahun kalender (%) dari deret bulanan; tahun berjalan = YTD. Maks 10 tahun terakhir. */
export function computeYearly(rows, maxYears = 10) {
    const lastClose = new Map();
    for (const r of rows) lastClose.set(r.date.getUTCFullYear(), r.close);
    const years = [...lastClose.keys()].sort((a, b) => a - b);
    const out = [];
    for (const y of years) {
        if (!lastClose.has(y - 1)) continue;
        out.push({ year: y, return: +(((lastClose.get(y) / lastClose.get(y - 1)) - 1) * 100).toFixed(1) });
    }
    return out.slice(-maxYears);
}

async function fetchStooq(symbol) {
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=m`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = parseStooqCsv(await res.text());
    if (!rows.length) throw new Error('kosong');
    return rows;
}

async function main() {
    const json = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let ok = 0, fail = 0;
    for (const inst of json.instruments) {
        if (inst.status !== 'etf-as' || !inst.stooq) continue;
        try {
            const res = computeCagr(await fetchStooq(inst.stooq));
            if (!res) throw new Error('riwayat terlalu pendek');
            inst.cagr = res.cagr;
            inst.cagrYears = res.years;
            inst.cagrBasis = 'stooq';
            inst.dataAsOf = res.to;
            ok++;
        } catch (e) {
            fail++;
            console.warn(`skip ${inst.ticker}: ${e.message}`);
        }
        await sleep(250);
    }
    // Return per tahun kalender (ETF di yearlyRef)
    for (const ref of json.yearlyRef || []) {
        if (!ref.stooq) continue;
        try {
            const y = computeYearly(await fetchStooq(ref.stooq));
            if (y.length >= 3) {
                ref.yearly = y;
                const c = computeCagr(await fetchStooq(ref.stooq));
                if (c) ref.cagr10y = c.cagr;
            }
        } catch (e) { console.warn(`skip yearly ${ref.ticker}: ${e.message}`); }
        await sleep(250);
    }
    json.meta.builtAt = new Date().toISOString();
    json.meta.stooqUpdated = ok;
    // hindari menulis ulang kalau semuanya gagal (mis. Stooq diblok)
    if (!ok) {
        console.error('Tidak ada data Stooq yang berhasil — file tidak diubah.');
        process.exit(1);
    }
    fs.writeFileSync(dataPath, JSON.stringify(json, null, 1));
    console.log(`Done. updated=${ok} gagal=${fail}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((e) => { console.error(e); process.exit(1); });
}
