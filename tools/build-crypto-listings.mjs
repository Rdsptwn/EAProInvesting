/**
 * Pengumuman listing/delisting kripto -> assets/data/crypto-listings.json
 * Sumber: pengumuman publik Binance (CMS) dan Upbit; koin trending dari CoinGecko. Tiap sumber gagal sendiri-sendiri; file lama dipertahankan bila semua gagal.
 * Jalankan: node tools/build-crypto-listings.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets/data/crypto-listings.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'application/json' };
const j = async (u, h = {}) => { const r = await fetch(u, { headers: { ...UA, ...h }, signal: AbortSignal.timeout(25000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
const items = [], notes = [];

async function binance(catalogId, kind) {
    try {
        const d = await j(`https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=${catalogId}&pageNo=1&pageSize=20`);
        const arts = d?.data?.catalogs?.[0]?.articles || [];
        if (!arts.length) throw new Error('kosong');
        arts.forEach((a) => items.push({ src: 'Binance', kind, title: String(a.title || '').slice(0, 220), ts: Number(a.releaseDate) || 0, url: `https://www.binance.com/en/support/announcement/${a.code}` }));
        notes.push(`binance-${catalogId}: ${arts.length}`);
    } catch (e) { notes.push(`binance-${catalogId} gagal: ${e.message}`); }
}
async function upbit() {
    try {
        const d = await j('https://api-manager.upbit.com/api/v1/announcements?os=web&page=1&per_page=20&category=trade');
        const arr = d?.data?.notices || [];
        if (!arr.length) throw new Error('kosong');
        arr.forEach((a) => items.push({ src: 'Upbit (Korea)', kind: /거래지원 종료|유의/.test(a.title) ? 'delisting' : 'listing', title: String(a.title || '').slice(0, 220), ts: Date.parse(a.listed_at || a.first_listed_at || '') || 0, url: `https://upbit.com/service_center/notice?id=${a.id}` }));
        notes.push('upbit: ' + arr.length);
    } catch (e) { notes.push('upbit gagal: ' + e.message); }
}
let trending = [];
async function gecko() {
    try {
        const d = await j('https://api.coingecko.com/api/v3/search/trending');
        trending = (d?.coins || []).slice(0, 10).map((c) => ({ n: c.item?.name, s: String(c.item?.symbol || '').toUpperCase(), rank: c.item?.market_cap_rank || null, chg: c.item?.data?.price_change_percentage_24h?.usd ?? null }));
        notes.push('coingecko-trending: ' + trending.length);
    } catch (e) { notes.push('coingecko gagal: ' + e.message); }
}
await binance(48, 'listing');
await binance(161, 'delisting');
await upbit();
await gecko();
items.sort((a, b) => b.ts - a.ts);
console.log(notes.join(' | '));
if (items.length < 3) { console.warn('listing: data terlalu sedikit — file lama dipertahankan'); process.exit(0); }
fs.writeFileSync(out, JSON.stringify({ meta: { built: new Date().toISOString(), notes }, items: items.slice(0, 40), trending }));
console.log('crypto-listings:', items.length, 'pengumuman');
