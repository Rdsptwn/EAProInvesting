/**
 * Kalender korporasi beranda — selalu ada jadwal mendatang (rolling).
 * Jalankan: node tools/build-corporate-calendar.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'assets/data/corporate-calendar.json');

function jakartaYmd(d = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

function addDays(ymd, days) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    const y2 = dt.getUTCFullYear();
    const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d2 = String(dt.getUTCDate()).padStart(2, '0');
    return `${y2}-${m2}-${d2}`;
}

const today = jakartaYmd();

const known = [
    { ticker: 'BBCA', action: 'Dividen Interim Rp25', kind: 'dividen', date: '2026-08-31', dateLabel: 'Ex-Date' },
    { ticker: 'BBCA', action: 'Bayar Dividen Interim', kind: 'dividen', date: '2026-09-16', dateLabel: 'Pembayaran' },
    { ticker: 'BBRI', action: 'Dividen Interim (est.)', kind: 'dividen', date: '2026-10-21', dateLabel: 'Ex-Date' },
    { ticker: 'BBRI', action: 'Bayar Dividen (est.)', kind: 'dividen', date: '2026-11-06', dateLabel: 'Pembayaran' },
    { ticker: 'BMRI', action: 'Pantau aksi korporasi / dividen', kind: 'rups', date: '2026-09-18', dateLabel: 'IDX' },
    { ticker: 'TLKM', action: 'Rilis kinerja / RUPS (pantau IDX)', kind: 'rups', date: '2026-09-25', dateLabel: 'Estimasi' },
    { ticker: 'ASII', action: 'Pantau keterbukaan emiten', kind: 'rups', date: '2026-09-30', dateLabel: 'IDX' },
    { ticker: 'UNVR', action: 'Kalender korporasi (pantau IDX)', kind: 'dividen', date: '2026-10-08', dateLabel: 'Pantau' },
    { ticker: 'GOTO', action: 'Keterbukaan informasi', kind: 'rups', date: '2026-10-15', dateLabel: 'IDX' },
    { ticker: 'AMMN', action: 'Pantau aksi korporasi', kind: 'rups', date: '2026-11-12', dateLabel: 'IDX' },
    { ticker: 'BREN', action: 'Pantau keterbukaan emiten', kind: 'rups', date: '2026-11-20', dateLabel: 'IDX' },
    { ticker: 'ANTM', action: 'Kalender BUMN / MIND ID', kind: 'rups', date: '2026-12-04', dateLabel: 'Pantau' },
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const DIV_TICKERS = ['BBCA','BBRI','BMRI','BBNI','TLKM','ASII','UNVR','ICBP','INDF','ADRO','PTBA','ITMG','UNTR','PGAS','SMGR','AALI','JSMR','KLBF','HMSP','GGRM','MYOR','CPIN','BRIS','ANTM','INKP','MEDC','AKRA','TPIA'];

/** Dividen riil dari Yahoo (events=div). Ex-date lampau = fakta; berikutnya = estimasi (+ interval historis). */
async function fetchDividends(t) {
    try {
        const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${t}.JK?range=3y&interval=1mo&events=div`, { headers: { 'User-Agent': UA } });
        if (!r.ok) return [];
        const d = (await r.json())?.chart?.result?.[0]?.events?.dividends || {};
        return Object.values(d).map((x) => ({ ymd: jakartaYmd(new Date(x.date * 1000)), amount: x.amount })).sort((a, b) => a.ymd.localeCompare(b.ymd));
    } catch (_) { return []; }
}
function fmtRp(n) { return 'Rp' + Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 }); }

const dyn = [];
const lists = await Promise.all(DIV_TICKERS.map(async (t) => [t, await fetchDividends(t)]));
for (const [t, divs] of lists) {
    if (!divs.length) continue;
    for (const dv of divs) {
        if (dv.ymd >= addDays(today, -14) && dv.ymd <= today) dyn.push({ ticker: t, action: `Ex-Date dividen ${fmtRp(dv.amount)}/saham`, kind: 'dividen', date: dv.ymd, dateLabel: 'Ex-Date' });
    }
    // estimasi: tiap ex-date setahun lalu + 365 hari yang jatuh di 75 hari ke depan
    for (const dv of divs) {
        const est = addDays(dv.ymd, 364);
        if (est > today && est <= addDays(today, 75)) dyn.push({ ticker: t, action: `Estimasi ex-date dividen (~${fmtRp(dv.amount)})`, kind: 'dividen', date: est, dateLabel: 'Estimasi' });
    }
}

// Agenda makro rutin
function nextMonthFirstWorkday(ymd) {
    const [y, m] = ymd.split('-').map(Number);
    let d = new Date(Date.UTC(y, m, 1));
    while ([0, 6].includes(d.getUTCDay())) d = new Date(d.getTime() + 86400000);
    return d.toISOString().slice(0, 10);
}
const macro = [
    { ticker: 'BPS', action: 'Rilis inflasi bulanan (IHK)', kind: 'rups', date: nextMonthFirstWorkday(today), dateLabel: 'BPS' },
    { ticker: 'FOMC', action: 'Rapat The Fed (FOMC)', kind: 'rups', date: '2026-12-09', dateLabel: 'Keputusan' },
    { ticker: 'BI', action: 'Rapat Dewan Gubernur BI (BI-Rate)', kind: 'rups', date: '2026-11-19', dateLabel: 'Estimasi' },
].filter((e) => e.date >= today);

const all = [...dyn, ...macro, ...known.filter((e) => e.date >= addDays(today, -7))];
const seen = new Set();
let events = all.filter((e) => { const k = `${e.ticker}|${e.date}|${e.kind}`; if (seen.has(k)) return false; seen.add(k); return true; });
events = events.filter((e) => e.date >= addDays(today, -14));
let upcomingCount = events.filter((e) => e.date >= today).length;
const fillers = [
    { ticker: 'BBCA', action: 'Pantau keterbukaan BCA', kind: 'rups', offset: 12 },
    { ticker: 'BBRI', action: 'Pantau keterbukaan BRI', kind: 'rups', offset: 24 },
    { ticker: 'BMRI', action: 'Pantau keterbukaan Mandiri', kind: 'rups', offset: 36 },
];
for (const f of fillers) {
    if (upcomingCount >= 6) break;
    events.push({ ticker: f.ticker, action: f.action, kind: f.kind, date: addDays(today, f.offset), dateLabel: 'Pantau IDX' });
    upcomingCount += 1;
}
console.log(`dividen dinamis: ${dyn.length}, makro: ${macro.length}`);

events.sort((a, b) => a.date.localeCompare(b.date));
const payload = {
    updated: new Date().toISOString(),
    source: 'Yahoo Finance (riwayat dividen) + agenda makro rutin',
    events,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`Wrote ${outPath} (${events.length} events, today=${today})`);
