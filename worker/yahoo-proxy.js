/**
 * Ewoks live quotes — Cloudflare Worker (proxy Yahoo Finance dengan cache 60 detik).
 *
 * GET /quotes?s=BBCA,BBRI,TLKM[&ihsg=1]
 *   -> { ok, ts, quotes: { BBCA: { price, prevClose, changePct, time, state } }, ihsg?: {...} }
 *
 * GET /screener?s=AALI,ABBA,...   (hingga ~1000 kode; satu panggilan batch ke Yahoo, cache 60 dtk)
 *   -> { ok, ts, n, q: { AALI: [price, prevClose, changePct, volume], ... } }
 *
 * GET /chart?s=BBCA|COMPOSITE&range=1d&interval=5m   -> { ok, t[], o[], h[], l[], c[], v[], prev, price, name }
 *
 * - Maks 40 ticker per request (/quotes) (batas subrequest Worker gratis = 50).
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

    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
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


// ---- Batch quote (screener): Yahoo v7/quote butuh cookie + crumb; disimpan di cache edge 30 menit.
async function getYahooSession() {
    const cache = caches.default;
    const key = new Request('https://cache.ewoks.local/yahoo-session');
    const hit = await cache.match(key);
    if (hit) return hit.json();
    const r1 = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual', signal: AbortSignal.timeout(6000) });
    const raw = r1.headers.get('set-cookie') || '';
    const cookie = raw.split(/,(?=\s*[A-Za-z0-9_]+=)/).map((c) => c.split(';')[0].trim()).filter(Boolean).join('; ');
    if (!cookie) throw new Error('no cookie');
    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie }, signal: AbortSignal.timeout(6000) });
    const crumb = (await r2.text()).trim();
    if (!r2.ok || !crumb || crumb.length > 40 || crumb.includes('<')) throw new Error('no crumb');
    const sess = { cookie, crumb };
    await cache.put(key, new Response(JSON.stringify(sess), { headers: { 'Cache-Control': 'max-age=1800' } }));
    return sess;
}

async function fetchBatchQuotes(codes) {
    const sess = await getYahooSession();
    const out = {};
    const chunks = [];
    for (let i = 0; i < codes.length; i += 200) chunks.push(codes.slice(i, i + 200));
    await Promise.all(chunks.map(async (ch) => {
        const syms = ch.map((c) => `${c}.JK`).join(',');
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(syms)}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketChangePercent,regularMarketVolume&crumb=${encodeURIComponent(sess.crumb)}`;
        const res = await fetch(url, { headers: { 'User-Agent': UA, Cookie: sess.cookie, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`Yahoo ${res.status}`);
        const list = (await res.json())?.quoteResponse?.result || [];
        for (const q of list) {
            const code = String(q.symbol || '').replace(/\.JK$/, '');
            const price = Number(q.regularMarketPrice);
            if (!code || !Number.isFinite(price) || price <= 0) continue;
            const prev = Number(q.regularMarketPreviousClose);
            const chg = Number(q.regularMarketChangePercent);
            out[code] = [round(price), Number.isFinite(prev) ? round(prev) : null, Number.isFinite(chg) ? round(chg) : null, Number.isFinite(Number(q.regularMarketVolume)) ? Math.round(Number(q.regularMarketVolume)) : null];
        }
    }));
    return out;
}

const J = (body, status, origin, cc) => json(body, status, origin, cc ? { 'Cache-Control': 'public, max-age=30' } : {});

function codesFrom(url, max) {
    const raw = String(url.searchParams.get('s') || '').toUpperCase().split(',').map((t) => t.trim());
    return [...new Set(raw)].filter((t) => /^[A-Z0-9]{2,6}$/.test(t)).slice(0, max);
}

async function routeChart(url, ctx, origin) {
    const sym = String(url.searchParams.get('s') || '').toUpperCase().trim();
    const rg = url.searchParams.get('range');
    const iv = url.searchParams.get('interval');
    const range = ['1d', '5d', '1mo', '3mo'].includes(rg) ? rg : '1d';
    const interval = ['1m', '5m', '15m', '30m', '60m', '1d'].includes(iv) ? iv : '5m';
    if (!/^[A-Z0-9]{2,6}$/.test(sym) && sym !== 'COMPOSITE') return J({ ok: false, error: 'bad symbol' }, 400, origin);
    const ysym = sym === 'COMPOSITE' ? '%5EJKSE' : sym + '.JK';
    const cache = caches.default;
    const ck = new Request('https://cache.ewoks.local/chart/' + ysym + '/' + range + '/' + interval);
    const hit = await cache.match(ck);
    let body;
    if (hit) {
        body = await hit.json();
    } else {
        try {
            const yurl = 'https://query2.finance.yahoo.com/v8/finance/chart/' + ysym + '?range=' + range + '&interval=' + interval + '&includePrePost=false';
            const r = await fetch(yurl, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
            if (!r.ok) throw new Error('Yahoo ' + r.status);
            const j = await r.json();
            const res = j && j.chart && j.chart.result && j.chart.result[0];
            if (!res) throw new Error('empty');
            const quote = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
            const ts = res.timestamp || [];
            const keep = [];
            for (let i = 0; i < ts.length; i++) if (quote.close && Number.isFinite(quote.close[i])) keep.push(i);
            const pick = (arr) => keep.map((i) => (arr && Number.isFinite(arr[i]) ? round(arr[i]) : null));
            const meta = res.meta || {};
            body = {
                t: keep.map((i) => ts[i]),
                o: pick(quote.open), h: pick(quote.high), l: pick(quote.low), c: pick(quote.close),
                v: keep.map((i) => (quote.volume && quote.volume[i]) || 0),
                prev: round(Number(meta.chartPreviousClose != null ? meta.chartPreviousClose : meta.previousClose)),
                price: round(Number(meta.regularMarketPrice)),
                name: meta.longName || meta.shortName || sym
            };
        } catch (e) {
            return J({ ok: false, error: String((e && e.message) || e) }, 502, origin);
        }
        ctx.waitUntil(cache.put(ck, new Response(JSON.stringify(body), { headers: { 'Cache-Control': 'max-age=' + CACHE_SECONDS } })));
    }
    const out = Object.assign({ ok: true, ts: new Date().toISOString(), sym, range, interval }, body);
    return J(out, 200, origin, true);
}

async function routeScreener(url, ctx, origin) {
    const codes = codesFrom(url, 1200);
    if (!codes.length) return J({ ok: false, error: 'no symbols' }, 400, origin);
    const cache = caches.default;
    const ck = new Request('https://cache.ewoks.local/screener/' + codes.length + '/' + codes[0] + '-' + codes[codes.length - 1]);
    const hit = await cache.match(ck);
    let q;
    if (hit) {
        q = await hit.json();
    } else {
        try {
            q = await fetchBatchQuotes(codes);
        } catch (e) {
            return J({ ok: false, error: String((e && e.message) || e) }, 502, origin);
        }
        ctx.waitUntil(cache.put(ck, new Response(JSON.stringify(q), { headers: { 'Cache-Control': 'max-age=' + CACHE_SECONDS } })));
    }
    return J({ ok: true, ts: new Date().toISOString(), n: Object.keys(q).length, q: q }, 200, origin, true);
}

async function routeQuotes(url, ctx, origin) {
    const tickers = codesFrom(url, MAX_SYMBOLS);
    const wantIhsg = url.searchParams.get('ihsg') === '1';
    if (!tickers.length && !wantIhsg) return J({ ok: false, error: 'no symbols' }, 400, origin);
    const jobs = tickers.map((t) => fetchYahooQuote(t + '.JK', ctx).then((q) => [t, q]).catch(() => [t, null]));
    const ihsgJob = wantIhsg ? fetchYahooQuote('^JKSE', ctx).catch(() => null) : Promise.resolve(null);
    const results = await Promise.all([Promise.all(jobs), ihsgJob]);
    const pairs = results[0];
    const ihsg = results[1];
    const quotes = {};
    for (const pr of pairs) if (pr[1]) quotes[pr[0]] = pr[1];
    const out = { ok: true, ts: new Date().toISOString(), quotes: quotes };
    if (ihsg) out.ihsg = ihsg;
    return J(out, 200, origin, true);
}

async function handle(request, ctx) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== 'GET') return J({ ok: false, error: 'method' }, 405, origin);
    if (path === '/' || path === '/health') return J({ ok: true, service: 'ewoks-live', version: 'v4-flat', routes: ['/quotes', '/screener', '/chart'] }, 200, origin);
    if (path === '/chart') return routeChart(url, ctx, origin);
    if (path === '/screener') return routeScreener(url, ctx, origin);
    if (path === '/quotes') return routeQuotes(url, ctx, origin);
    return J({ ok: false, error: 'not found' }, 404, origin);
}

export default {
    async fetch(request, env, ctx) {
        try {
            return await handle(request, ctx);
        } catch (e) {
            return J({ ok: false, error: 'worker error: ' + String((e && e.message) || e) }, 500, request.headers.get('Origin') || '');
        }
    }
};
