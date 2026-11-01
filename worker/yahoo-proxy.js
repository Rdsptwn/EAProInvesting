/**
 * Ewoks live quotes — Cloudflare Worker (proxy Yahoo Finance dengan cache 60 detik).
 *
 * GET /quotes?s=BBCA,BBRI,TLKM[&ihsg=1]
 *   -> { ok, ts, quotes: { BBCA: { price, prevClose, changePct, time, state } }, ihsg?: {...} }
 *
 * - Maks 40 ticker per request (batas subrequest Worker gratis = 50).
 * - Tiap simbol di-cache 60 detik di edge, jadi ramai pengunjung tidak membebani Yahoo.
 * - CORS dibatasi ke domain web kamu (ALLOWED_ORIGINS).
 * Data IDX di Yahoo umumnya tertunda ±10 menit. API Yahoo ini tidak resmi.
 */

const ALLOWED_ORIGINS = [
    'https://rdsptwn.github.io',
    'https://ewoksacademy.github.io',
    'http://localhost:8080',
    'http://127.0.0.1:5500',
    'http://localhost:5500'
];
const MAX_SYMBOLS = 40;
const CACHE_SECONDS = 60;
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function corsHeaders(origin) {
    const ok = ALLOWED_ORIGINS.includes(origin);
    return {
        'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        Vary: 'Origin'
    };
}

function json(body, status, origin, extra = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin), ...extra }
    });
}

function round(n, d = 2) {
    return Number.isFinite(n) ? +n.toFixed(d) : null;
}

async function fetchYahooQuote(yahooSymbol, ctx) {
    const cache = caches.default;
    const cacheKey = new Request(`https://cache.ewoks.local/q/${encodeURIComponent(yahooSymbol)}`);
    const hit = await cache.match(cacheKey);
    if (hit) return hit.json();

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Yahoo ${res.status}`);
    const meta = (await res.json())?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
    if (!Number.isFinite(price) || price <= 0) throw new Error('empty');
    const out = {
        price: round(price),
        prevClose: Number.isFinite(prev) ? round(prev) : null,
        changePct: Number.isFinite(prev) && prev > 0 ? round(((price - prev) / prev) * 100) : null,
        time: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
        state: meta?.marketState || null
    };
    const toCache = new Response(JSON.stringify(out), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${CACHE_SECONDS}` }
    });
    if (ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, toCache));
    else await cache.put(cacheKey, toCache);
    return out;
}

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin') || '';
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
        if (request.method !== 'GET') return json({ ok: false, error: 'method' }, 405, origin);
        if (url.pathname === '/' || url.pathname === '/health') return json({ ok: true, service: 'ewoks-live' }, 200, origin);
        if (url.pathname !== '/quotes') return json({ ok: false, error: 'not found' }, 404, origin);

        const tickers = [...new Set(String(url.searchParams.get('s') || '').toUpperCase().split(',').map((t) => t.trim()))]
            .filter((t) => /^[A-Z0-9]{2,6}$/.test(t))
            .slice(0, MAX_SYMBOLS);
        const wantIhsg = url.searchParams.get('ihsg') === '1';
        if (!tickers.length && !wantIhsg) return json({ ok: false, error: 'no symbols' }, 400, origin);

        const jobs = tickers.map((t) => fetchYahooQuote(`${t}.JK`, ctx).then((q) => [t, q]).catch(() => [t, null]));
        const ihsgJob = wantIhsg ? fetchYahooQuote('^JKSE', ctx).catch(() => null) : Promise.resolve(null);
        const [pairs, ihsg] = await Promise.all([Promise.all(jobs), ihsgJob]);

        const quotes = {};
        for (const [t, q] of pairs) if (q) quotes[t] = q;
        return json(
            { ok: true, ts: new Date().toISOString(), quotes, ...(ihsg ? { ihsg } : {}) },
            200,
            origin,
            { 'Cache-Control': 'public, max-age=30' }
        );
    }
};
