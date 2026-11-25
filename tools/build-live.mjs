// Harga "hampir live" tanpa Worker: GitHub Actions ambil kuotasi Yahoo (v7/quote, per 200 simbol) tiap ±10 menit di jam bursa,
// disimpan ke file kecil yang dilayani GitHub Pages. Situs memakainya otomatis kalau Worker tidak terjangkau.
//   node tools/build-live.mjs idx      -> assets/data/live-idx.json     { ts, q:{KODE:[harga, prev, chg%, vol]}, ihsg:[harga, prev, chg%] }
//   node tools/build-live.mjs global   -> assets/data/live-global.json  { ts, q:{SIMBOL:[harga, prev, chg%, vol]} }
import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const J = (f) => JSON.parse(fs.readFileSync('assets/data/' + f, 'utf8'));
const r4 = (x) => Math.round(x * 10000) / 10000;

async function session() {
    const r1 = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
    const cookie = (r1.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie } });
    const crumb = (await r2.text()).trim();
    if (!r2.ok || !crumb || crumb.length > 40 || crumb.includes('<')) throw new Error('crumb gagal: HTTP ' + r2.status);
    return { cookie, crumb };
}
async function quotes(syms, sess) {
    const out = {};
    const chunks = []; for (let i = 0; i < syms.length; i += 200) chunks.push(syms.slice(i, i + 200));
    let bad = 0;
    for (const ch of chunks) {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ch.join(','))}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketChangePercent,regularMarketVolume&crumb=${encodeURIComponent(sess.crumb)}`;
        try {
            const res = await fetch(url, { headers: { 'User-Agent': UA, Cookie: sess.cookie, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            for (const q of (await res.json())?.quoteResponse?.result || []) {
                const p = Number(q.regularMarketPrice); if (!(p > 0)) continue;
                const pv = Number(q.regularMarketPreviousClose), c = Number(q.regularMarketChangePercent), v = Number(q.regularMarketVolume);
                out[q.symbol] = [r4(p), Number.isFinite(pv) ? r4(pv) : null, Number.isFinite(c) ? Math.round(c * 100) / 100 : null, Number.isFinite(v) ? Math.round(v) : null];
            }
        } catch (e) { bad++; console.log('batch gagal:', e.message); }
    }
    return { out, bad, total: chunks.length };
}

const mode = process.argv[2];
const sess = await session();
const ts = new Date().toISOString();
if (mode === 'idx') {
    const codes = J('idx-universe.json').items.map((x) => x.t);
    const { out, bad, total } = await quotes(codes.map((c) => c + '.JK').concat('^JKSE'), sess);
    const q = {}; for (const [s, v] of Object.entries(out)) if (s !== '^JKSE') q[s.replace(/\.JK$/, '')] = v;
    if (Object.keys(q).length < 300) { console.error('data terlalu sedikit:', Object.keys(q).length, `(batch gagal ${bad}/${total})`); process.exit(1); }
    fs.writeFileSync('assets/data/live-idx.json', JSON.stringify({ ts, q, ihsg: out['^JKSE']?.slice(0, 3) || null }));
    console.log('live-idx:', Object.keys(q).length, 'emiten, IHSG', out['^JKSE']?.[0], `batch gagal ${bad}/${total}`);
} else if (mode === 'global') {
    const set = new Set(J('global-commodities.json').items.map((x) => x.s).filter(Boolean));
    J('global-screener.json').rows.filter((r) => /^[A-Z.-]{1,6}$/.test(r[0])).sort((a, b) => b[1] * (b[8] || 0) - a[1] * (a[8] || 0)).slice(0, 800).forEach((r) => set.add(r[0]));
    // top naik/turun (kolom chg = r[3]) ikut dipantau supaya tabel "Top naik & turun" juga hampir-live
    const mv = J('global-screener.json').rows.filter((r) => /^[A-Z.-]{1,6}$/.test(r[0]) && Number.isFinite(r[3])).sort((a, b) => b[3] - a[3]);
    mv.slice(0, 60).concat(mv.slice(-60)).forEach((r) => set.add(r[0]));
    const { out, bad, total } = await quotes([...set], sess);
    if (Object.keys(out).length < 200) { console.error('data terlalu sedikit:', Object.keys(out).length, `(batch gagal ${bad}/${total})`); process.exit(1); }
    fs.writeFileSync('assets/data/live-global.json', JSON.stringify({ ts, q: out }));
    console.log('live-global:', Object.keys(out).length, 'simbol', `batch gagal ${bad}/${total}`);
} else { console.error('pakai: node tools/build-live.mjs idx|global'); process.exit(2); }
