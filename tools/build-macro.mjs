/**
 * Perbarui assets/data/macro.json: inflasi tahunan (YoY) Indonesia & yield SBN 10 tahun.
 * Tanpa API key. Sumber dicoba berurutan; kalau semuanya gagal, nilai lama dipertahankan
 * (web menampilkan tanggal "per ..." sehingga data basi kelihatan jelas).
 * Jalankan: node tools/build-macro.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'assets/data/macro.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; EwoksAcademyBot/1.0)' };

const BULAN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
const BULAN_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const num = (s) => parseFloat(String(s).replace(',', '.'));
const decode = (s) => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<!\[CDATA\[|\]\]>/g, '');

/** Item RSS Google News -> [{title, date}] */
export function parseRss(xml) {
    const items = [];
    for (const m of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const t = m[1].match(/<title>([\s\S]*?)<\/title>/);
        const d = m[1].match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        if (t) items.push({ title: decode(t[1]).trim(), date: d ? new Date(d[1]) : null });
    }
    return items;
}

/** Slug rilis BPS: inflasi-year-on-year--y-on-y--pada-oktober-2025-sebesar-2-86-persen */
export function parseBpsSlugs(html) {
    const out = [];
    for (const m of String(html).matchAll(/inflasi-year-on-year[a-z-]*?pada-([a-z]+)-(\d{4})-sebesar-(\d+)-(\d+)-persen/g)) {
        const mi = BULAN.indexOf(m[1]);
        const v = parseFloat(`${m[3]}.${m[4]}`);
        if (mi >= 0 && Number.isFinite(v)) out.push({ year: +m[2], month: mi + 1, value: v });
    }
    return out;
}

/** Judul berita inflasi YoY: "Inflasi September 2026 sebesar 3,28 persen" */
export function parseInflationTitles(items) {
    const out = [];
    for (const { title } of items) {
        const t = title.toLowerCase();
        if (!/inflasi/.test(t) || /(bulanan|month to month|mtm|m-to-m|ihk)\b/.test(t) && !/(tahunan|year on year|yoy|y-on-y|tahun ke tahun)/.test(t)) continue;
        if (!/(tahunan|year on year|yoy|y-on-y|tahun ke tahun|sebesar|capai|tembus)/.test(t)) continue;
        const per = t.match(new RegExp(`(${BULAN.join('|')})\\s+(20\\d{2})`));
        const val = t.match(/(\d{1,2}[,.]\d{1,2})\s*(persen|%)/);
        if (!per || !val) continue;
        if (/(bulanan|month to month|mtm)/.test(t) && !/(tahunan|year on year|yoy|y-on-y)/.test(t)) continue;
        const v = num(val[1]);
        if (v < -2 || v > 20) continue;
        out.push({ year: +per[2], month: BULAN.indexOf(per[1]) + 1, value: v });
    }
    return out;
}

/** Judul berita yield SBN 10 tahun; abaikan proyeksi/prediksi/asumsi. */
export function parseSbnTitles(items, now = new Date(), maxAgeDays = 10) {
    const out = [];
    for (const { title, date } of items) {
        const t = title.toLowerCase();
        if (!/(sbn|sun|obligasi negara)/.test(t) || !/(10 tahun|acuan|10y)/.test(t)) continue;
        if (/(proyeksi|prediksi|diprediksi|diproyeksi|target|potensi|berpotensi|menuju)/.test(t)) continue;
        const val = t.match(/(\d{1,2}[,.]\d{1,3})\s*(persen|%)/);
        if (!val || !date || Number.isNaN(date.getTime())) continue;
        const v = num(val[1]);
        if (v < 3 || v > 15) continue;
        if ((now - date) / 86400000 > maxAgeDays) continue;
        out.push({ value: v, date });
    }
    return out.sort((a, b) => b.date - a.date);
}

async function get(url) {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
}
const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;

async function fetchInflation() {
    const found = [];
    try { found.push(...parseBpsSlugs(await get('https://www.bps.go.id/id/pressrelease'))); } catch (e) { console.warn('BPS:', e.message); }
    try { found.push(...parseInflationTitles(parseRss(await get(gnews('inflasi year on year BPS persen'))))); } catch (e) { console.warn('GNews inflasi:', e.message); }
    if (!found.length) return null;
    found.sort((a, b) => b.year - a.year || b.month - a.month);
    const top = found[0];
    return { value: top.value, period: `${top.year}-${String(top.month).padStart(2, '0')}`, label: `${BULAN_LABEL[top.month - 1]} ${top.year}`, asOf: new Date().toISOString().slice(0, 10) };
}

async function fetchSbn() {
    try {
        const hit = parseSbnTitles(parseRss(await get(gnews('yield SBN 10 tahun hari ini'))))[0];
        if (hit) return { value: hit.value, asOf: hit.date.toISOString().slice(0, 10) };
    } catch (e) { console.warn('GNews SBN:', e.message); }
    return null;
}

/** Judul berita BI-7Day-Reverse-Repo-Rate: "BI Rate tetap 5,75 persen". Abaikan proyeksi. */
export function parseBiRateTitles(items, now = new Date(), maxAgeDays = 45) {
    const out = [];
    for (const { title, date } of items) {
        const t = title.toLowerCase();
        if (!/(bi[- ]?rate|7[- ]?day|suku bunga acuan)/.test(t)) continue;
        if (/(proyeksi|prediksi|diprediksi|diproyeksi|target|potensi|berpotensi|menuju|jelang|ekspektasi|survei)/.test(t)) continue;
        const val = t.match(/(\d{1,2}[,.]\d{1,2})\s*(persen|%)/);
        if (!val || !date || Number.isNaN(date.getTime())) continue;
        const v = num(val[1]);
        if (v < 2 || v > 10) continue;
        if ((now - date) / 86400000 > maxAgeDays) continue;
        out.push({ value: v, date });
    }
    return out.sort((a, b) => b.date - a.date);
}

/** Judul berita Fed funds target: "The Fed pangkas suku bunga ke 3,75-4,00 persen". */
export function parseFedTitles(items, now = new Date(), maxAgeDays = 60) {
    const out = [];
    for (const { title, date } of items) {
        const t = title.toLowerCase();
        if (!/(the fed|fed |federal reserve|fomc)/.test(t)) continue;
        if (/(proyeksi|prediksi|diprediksi|diproyeksi|target inflasi|potensi|berpotensi|jelang|ekspektasi|survei)/.test(t)) continue;
        const r = t.match(/(\d{1}[,.]\d{2})\s*(?:-|–|hingga|sampai|ke)\s*(\d{1}[,.]\d{2})\s*(persen|%)?/);
        if (!r || !date || Number.isNaN(date.getTime())) continue;
        const low = num(r[1]), high = num(r[2]);
        if (!(high > low && high - low <= 0.5 && low >= 0 && high <= 10)) continue;
        if ((now - date) / 86400000 > maxAgeDays) continue;
        out.push({ low, high, date });
    }
    return out.sort((a, b) => b.date - a.date);
}

async function fetchRates() {
    const res = {};
    try {
        const hit = parseBiRateTitles(parseRss(await get(gnews('BI 7-Day Reverse Repo Rate keputusan RDG'))))[0];
        if (hit) res.biRate = { value: hit.value, asOf: hit.date.toISOString().slice(0, 10), source: 'Google News' };
    } catch (e) { console.warn('GNews BI Rate:', e.message); }
    try {
        const hit = parseFedTitles(parseRss(await get(gnews('The Fed suku bunga FOMC keputusan'))))[0];
        if (hit) res.fedRate = { low: hit.low, high: hit.high, asOf: hit.date.toISOString().slice(0, 10), source: 'Google News' };
    } catch (e) { console.warn('GNews Fed:', e.message); }
    return res;
}

async function main() {
    const cur = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    let changed = 0;
    const inf = await fetchInflation();
    // jangan mundur ke periode yang lebih lama dari yang sudah tersimpan
    if (inf && (!cur.inflation || inf.period >= cur.inflation.period)) { cur.inflation = inf; changed++; }
    const sbn = await fetchSbn();
    if (sbn && (!cur.sbn10y || sbn.asOf >= cur.sbn10y.asOf)) { cur.sbn10y = sbn; changed++; }
    // suku bunga kebijakan jarang berubah: nilai lama dipertahankan bila sumber gagal / lebih tua
    const rates = await fetchRates();
    for (const k of ['biRate', 'fedRate']) {
        if (rates[k] && (!cur[k] || rates[k].asOf >= cur[k].asOf)) { cur[k] = rates[k]; changed++; }
    }
    cur.builtAt = new Date().toISOString();
    fs.writeFileSync(outPath, JSON.stringify(cur, null, 1));
    console.log(`macro: inflasi=${JSON.stringify(cur.inflation)} sbn10y=${JSON.stringify(cur.sbn10y)} (diperbarui ${changed})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((e) => { console.error(e); process.exit(1); });
}
