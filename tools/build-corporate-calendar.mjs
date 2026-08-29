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

let events = known.filter((e) => e.date >= addDays(today, -7));
let upcomingCount = events.filter((e) => e.date >= today).length;
const fillers = [
    { ticker: 'BBCA', action: 'Pantau keterbukaan BCA', kind: 'rups', offset: 12 },
    { ticker: 'BBRI', action: 'Pantau keterbukaan BRI', kind: 'rups', offset: 24 },
    { ticker: 'BMRI', action: 'Pantau keterbukaan Mandiri', kind: 'rups', offset: 36 },
    { ticker: 'TLKM', action: 'Pantau keterbukaan Telkom', kind: 'rups', offset: 48 },
    { ticker: 'ASII', action: 'Pantau keterbukaan Astra', kind: 'rups', offset: 60 },
];
for (const f of fillers) {
    if (upcomingCount >= 6) break;
    const date = addDays(today, f.offset);
    events.push({ ticker: f.ticker, action: f.action, kind: f.kind, date, dateLabel: 'Pantau IDX' });
    upcomingCount += 1;
}

events.sort((a, b) => a.date.localeCompare(b.date));
const payload = {
    updated: new Date().toISOString(),
    source: 'IDX / keterbukaan + jadwal rolling Ewoks',
    events,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`Wrote ${outPath} (${events.length} events, today=${today})`);
