/**
 * Ewoks live quotes — Cloudflare Worker (proxy Yahoo Finance dengan cache 60 detik).
 *
 * GET /quotes?s=BBCA,BBRI,TLKM[&ihsg=1]
 *   -> { ok, ts, quotes: { BBCA: { price, prevClose, changePct, time, state } }, ihsg?: {...} }
 *
 * GET /screener?s=AALI,ABBA,...   (hingga ~1000 kode; satu panggilan batch ke Yahoo, cache 60 dtk)
 *   -> { ok, ts, n, q: { AALI: [price, prevClose, changePct, volume], ... } }
 *
 * GET /gquotes?s=TSLA,NVDA,GC=F,^GSPC   (simbol global, maks 150) -> { ok, ts, n, q: { TSLA: [price, prevClose, changePct, volume] } }
 *
 * GET /chart?s=BBCA|COMPOSITE&range=1d&interval=5m  (tambah &g=1 untuk simbol global, mis. QQQ)   -> { ok, t[], o[], h[], l[], c[], v[], prev, price, name }
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
    // Data harga bersifat publik & hanya GET: domain yang tidak terdaftar tetap boleh membaca (tanpa kredensial).
    const ok = ALLOWED_ORIGINS.includes(origin);
    return {
        'Access-Control-Allow-Origin': ok ? origin : '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Bot-Key',
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

async function fetchBatchQuotes(codes, suffix = '.JK') {
    const sess = await getYahooSession();
    const out = {};
    const chunks = [];
    for (let i = 0; i < codes.length; i += 200) chunks.push(codes.slice(i, i + 200));
    await Promise.all(chunks.map(async (ch) => {
        const syms = ch.map((c) => `${c}${suffix}`).join(',');
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(syms)}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketChangePercent,regularMarketVolume&crumb=${encodeURIComponent(sess.crumb)}`;
        const res = await fetch(url, { headers: { 'User-Agent': UA, Cookie: sess.cookie, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`Yahoo ${res.status}`);
        const list = (await res.json())?.quoteResponse?.result || [];
        for (const q of list) {
            const code = suffix ? String(q.symbol || '').replace(new RegExp(suffix.replace('.', '\\.') + '$'), '') : String(q.symbol || '');
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
    const glob = url.searchParams.get('g') === '1';
    if (glob ? !/^[A-Z0-9.^=-]{1,12}$/.test(sym) : (!/^[A-Z0-9]{2,6}$/.test(sym) && sym !== 'COMPOSITE')) return J({ ok: false, error: 'bad symbol' }, 400, origin);
    const ysym = glob ? encodeURIComponent(sym) : (sym === 'COMPOSITE' ? '%5EJKSE' : sym + '.JK');
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

// ---- Fundamental ringkas: GET /fund?s=BBCA  (IDX)  atau  /fund?s=AAPL&g=1  (global)
//  -> { ok, sym, name, currency, price, chg, pe, pbv, eps, mcap }   (untuk command /lk dan /analisa di chat web)
async function routeFund(url, ctx, origin) {
    const sym = String(url.searchParams.get('s') || '').toUpperCase().trim();
    const glob = url.searchParams.get('g') === '1';
    if (glob ? !/^[A-Z0-9.^=-]{1,12}$/.test(sym) : !/^[A-Z0-9]{2,6}$/.test(sym)) return J({ ok: false, error: 'bad symbol' }, 400, origin);
    const ysym = glob ? sym : sym + '.JK';
    const cache = caches.default;
    const ck = new Request('https://cache.ewoks.local/fund/' + ysym);
    const hit = await cache.match(ck);
    let body;
    if (hit) {
        body = await hit.json();
    } else {
        try {
            const sess = await getYahooSession();
            const f = 'regularMarketPrice,regularMarketChangePercent,epsTrailingTwelveMonths,trailingPE,priceToBook,marketCap,longName,shortName,currency';
            const yurl = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(ysym) + '&fields=' + f + '&crumb=' + encodeURIComponent(sess.crumb);
            const res = await fetch(yurl, { headers: { 'User-Agent': UA, Cookie: sess.cookie, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
            if (!res.ok) throw new Error('Yahoo ' + res.status);
            const q = (((await res.json()) || {}).quoteResponse || {}).result;
            if (!q || !q[0]) throw new Error('not found');
            const x = q[0], n = (v) => (Number.isFinite(Number(v)) && v !== null ? Number(v) : null);
            body = { sym, name: x.longName || x.shortName || sym, currency: x.currency || (glob ? 'USD' : 'IDR'), price: n(x.regularMarketPrice), chg: n(x.regularMarketChangePercent), pe: n(x.trailingPE), pbv: n(x.priceToBook), eps: n(x.epsTrailingTwelveMonths), mcap: n(x.marketCap) };
        } catch (e) {
            return J({ ok: false, error: String((e && e.message) || e) }, 502, origin);
        }
        ctx.waitUntil(cache.put(ck, new Response(JSON.stringify(body), { headers: { 'Cache-Control': 'max-age=300' } })));
    }
    return J(Object.assign({ ok: true, ts: new Date().toISOString() }, body), 200, origin, true);
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

// ---- Saham/komoditas/indeks GLOBAL: GET /gquotes?s=TSLA,NVDA,GC=F,^GSPC  (maks 150 simbol)
//  -> { ok, ts, n, q: { TSLA: [price, prevClose, changePct, volume], ... } }
async function routeGQuotes(url, ctx, origin) {
    const raw = String(url.searchParams.get('s') || '').toUpperCase().split(',').map((t) => t.trim());
    const syms = [...new Set(raw)].filter((t) => /^[A-Z0-9.^=-]{1,14}$/.test(t)).slice(0, 150);
    if (!syms.length) return J({ ok: false, error: 'no symbols' }, 400, origin);
    let h = 0; const joined = syms.join(',');
    for (let i = 0; i < joined.length; i++) h = (h * 31 + joined.charCodeAt(i)) | 0;
    const cache = caches.default;
    const ck = new Request('https://cache.ewoks.local/gquotes/' + syms.length + '/' + h);
    const hit = await cache.match(ck);
    let q;
    if (hit) {
        q = await hit.json();
    } else {
        try {
            q = await fetchBatchQuotes(syms, '');
        } catch (e) {
            // cadangan: chart per simbol (batas subrequest Worker gratis)
            q = {};
            await Promise.all(syms.slice(0, 40).map((t) => fetchYahooQuote(t, ctx).then((x) => { q[t] = [x.price, x.prevClose, x.changePct, null]; }).catch(() => {})));
            if (!Object.keys(q).length) return J({ ok: false, error: String((e && e.message) || e) }, 502, origin);
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

// ---------- Asisten tanya-jawab (POST /ask) ----------
// Butuh SALAH SATU: secret GEMINI_KEY (Google AI Studio, gratis) ATAU binding Workers AI bernama "AI" (gratis 10.000 neuron/hari).
const OFFTOPIC_RULE = 'Untuk pertanyaan yang tidak terkait investasi/keuangan/situs, tolak dengan sopan satu kalimat.';
const SYSTEM_PROMPT = [
    'Kamu adalah "Tido", bocah chibi yang selalu ngantuk, berpiyama dan bertopi tidur, maskot sekaligus pemandu edukasi investasi di situs Ewoks Academy (Indonesia).',
    'Gaya bicara: santai, hangat, seperti kakak kelas yang sabar. Pakai "aku" dan "kamu", boleh sesekali bercanda ringan soal ngantuk (misalnya "hoaam…") atau 1 emoji (😴), tanpa berlebihan, dan tetap fokus membantu. Jangan kaku atau terdengar seperti robot; jangan membuka jawaban dengan "Maaf, sebagai asisten...".',
    'Jawab dalam Bahasa Indonesia yang jelas, ringkas (maks ±180 kata), pakai poin bila membantu.',
    'Kalau pengguna menyebut kode saham/koin dan minta dicek (akumulasi, harga, analisa, fibo), jangan kasih ceramah umum: jawab satu-dua kalimat lalu arahkan ke command yang pas: /cek KODE (ringkasan), /akum KODE, /fibo KODE, /analisa KODE, /lk KODE, /harga KODE. Kalau pengguna minta rekomendasi, jangan menolak dengan kaku. Jelaskan singkat bahwa kamu tidak memberi sinyal beli/jual pasti, lalu arahkan ke command chat: /rekomendasi (ihsg|global|kripto|forex), /pagi, /siang, /swing, /scalp, /fibo <kode>, /akum <kode>, /analisa <kode>, /lk <kode>, /ea, /global. Jelaskan juga kriteria edukatifnya (tren, support/resist, risk-reward) agar mereka belajar menilai sendiri.',
    'Kamu punya command di chat web yang membaca database situs: /rd (reksa dana: RDPU pasar uang, RDPT pendapatan tetap, RDS saham, RDC campuran, RDI indeks), /istilah KATA (arti istilah), /topreturn (saham naik paling tinggi 52 minggu), /rekomendasi, /pagi, /siang, /swing, /scalp (bisa pakai budget, mis. /swing idx 500), /akum, /fibo, /analisa, /lk. Jangan bilang \'tidak bisa\' kalau ada command yang cocok: jelaskan konsepnya singkat lalu arahkan ke command itu. Data harga yang tersimpan hanya 52 minggu, jadi bilang terus terang bila diminta return 5 tahun. '+
    'Bidangmu: dasar saham IHSG & global, analisa teknikal/fundamental dasar, reksa dana, obligasi, kripto, forex, manajemen risiko, psikologi trading, cara memakai fitur situs (Peta Konglo, Watchlist/Terminal, Kalkulator, Jurnal, Mode Global/Bitcoin/Forex).',
    'Aturan: jangan memberi rekomendasi beli/jual pasti atau menjanjikan untung; jangan mengarang angka, harga, atau berita terkini (bilang tidak punya data real-time dan arahkan ke halaman terkait di situs); jangan bantu penipuan, manipulasi harga, atau insider trading.',
    OFFTOPIC_RULE,
    'Selalu ingatkan singkat bahwa ini edukasi bukan saran investasi bila pertanyaannya meminta keputusan transaksi.'
].join(' ');
const ASK_LIMIT_PER_HOUR = 25;

async function rateLimited(request) {
    try {
        const ip = request.headers.get('CF-Connecting-IP') || 'x';
        const key = new Request('https://ask.rl.local/' + encodeURIComponent(ip) + '/' + Math.floor(Date.now() / 3600000));
        const c = caches.default;
        const hit = await c.match(key);
        const n = hit ? parseInt(await hit.text(), 10) || 0 : 0;
        if (n >= ASK_LIMIT_PER_HOUR) return true;
        await c.put(key, new Response(String(n + 1), { headers: { 'Cache-Control': 'max-age=3600' } }));
    } catch (_) { /* abaikan */ }
    return false;
}

// Rantai penyedia AI: dicoba berurutan; kalau satu kena limit/gagal, lanjut ke berikutnya.
// Kuota Gemini & Groq berlaku PER PROYEK/KUNCI (dibagi semua pengunjung), jadi rantai + cache ini penting.
async function askGemini(env, sys, msgs) {
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: sys }] },
            contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
            generationConfig: { maxOutputTokens: 600, temperature: 0.5 }
        }),
        signal: AbortSignal.timeout(25000)
    });
    if (!r.ok) throw new Error('gemini ' + r.status);
    const j = await r.json();
    const parts = (((j.candidates || [])[0] || {}).content || {}).parts;
    return parts ? parts.map((p) => p.text || '').join('').trim() : '';
}
async function askGroq(env, sys, msgs) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.GROQ_KEY },
        body: JSON.stringify({ model: env.GROQ_MODEL || 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: sys }].concat(msgs), max_tokens: 600, temperature: 0.5 }),
        signal: AbortSignal.timeout(25000)
    });
    if (!r.ok) throw new Error('groq ' + r.status);
    const j = await r.json();
    return String((((j.choices || [])[0] || {}).message || {}).content || '').trim();
}
async function askOpenAICompat(url, key, model, sys, msgs, extraHeaders) {
    const r = await fetch(url, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, extraHeaders || {}),
        body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }].concat(msgs), max_tokens: 600, temperature: 0.5 }),
        signal: AbortSignal.timeout(25000)
    });
    if (!r.ok) throw new Error(r.status + '');
    const j = await r.json();
    return String((((j.choices || [])[0] || {}).message || {}).content || '').trim();
}
const askOpenRouter = (env, sys, msgs) => askOpenAICompat('https://openrouter.ai/api/v1/chat/completions', env.OPENROUTER_KEY, env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free', sys, msgs, { 'X-Title': 'Ewoks Academy' });
const askNvidia = (env, sys, msgs) => askOpenAICompat('https://integrate.api.nvidia.com/v1/chat/completions', env.NVIDIA_KEY, env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b', sys, msgs);
async function askCohere(env, sys, msgs) {
    const r = await fetch('https://api.cohere.com/v2/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.COHERE_KEY },
        body: JSON.stringify({ model: env.COHERE_MODEL || 'command-r-08-2024', messages: [{ role: 'system', content: sys }].concat(msgs), max_tokens: 600, temperature: 0.5 }),
        signal: AbortSignal.timeout(25000)
    });
    if (!r.ok) throw new Error('cohere ' + r.status);
    const j = await r.json();
    const c = ((j.message || {}).content || []);
    return c.map((x) => x.text || '').join('').trim();
}
async function askCfAi(env, sys, msgs) {
    const res = await env.AI.run(env.AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'system', content: sys }].concat(msgs), max_tokens: 600, temperature: 0.5 });
    return String((res && (res.response || res.result)) || '').trim();
}

async function routeAsk(request, env, origin) {
    // Bot server-ke-server (mis. bot WhatsApp) memakai header X-Bot-Key = secret BOT_KEY; browser harus dari origin terdaftar.
    const botKey = request.headers.get('X-Bot-Key') || '';
    const isBot = !!(env && env.BOT_KEY && botKey && botKey === env.BOT_KEY);
    if (!isBot && !ALLOWED_ORIGINS.includes(origin)) return J({ ok: false, error: 'origin' }, 403, origin);
    let body;
    try { body = await request.json(); } catch (_) { return J({ ok: false, error: 'json' }, 400, origin); }
    const q = String((body && body.q) || '').trim().slice(0, 700);
    if (q.length < 2) return J({ ok: false, error: 'pertanyaan kosong' }, 400, origin);
    const hist = (Array.isArray(body.hist) ? body.hist : []).slice(-6).map((m) => ({ role: m.r === 'a' ? 'assistant' : 'user', content: String(m.t || '').slice(0, 700) }));
    const page = String(body.page || '').slice(0, 60);
    // cache jawaban untuk pertanyaan yang sama (tanpa riwayat) -> hemat kuota bersama
    const cache = caches.default;
    const ck = new Request('https://ask.cache.local/' + encodeURIComponent(q.toLowerCase().replace(/\s+/g, ' ')));
    if (!hist.length && !isBot) {
        try { const hit = await cache.match(ck); if (hit) return J({ ok: true, a: await hit.text(), by: 'cache' }, 200, origin); } catch (_) {}
    }
    if (!isBot && await rateLimited(request)) return J({ ok: false, error: 'Terlalu banyak pertanyaan dari perangkat ini. Coba lagi sekitar 1 jam.' }, 429, origin);
    let base = SYSTEM_PROMPT;
    if (isBot && body.mode === 'bebas') base = base.replace(OFFTOPIC_RULE, 'Bot ini juga boleh menjawab topik umum (koding, matematika, logika) selama aman dan tidak melanggar aturan di atas.');
    const extra = isBot ? String(body.sys_extra || '').slice(0, 4000) : '';
    const sys = base + (extra ? ' ' + extra : '') + (page ? ' Konteks: ' + page + '.' : '') + (isBot ? ' Jawaban dikirim lewat WhatsApp: tanpa markdown tebal berlebihan, singkat.' : ' Pengguna sedang membuka halaman: ' + page + '.');
    const msgs = hist.concat([{ role: 'user', content: q }]);
    const chain = [];
    if (env && env.GEMINI_KEY) chain.push(['gemini', askGemini]);
    if (env && env.GROQ_KEY) chain.push(['groq', askGroq]);
    if (env && env.OPENROUTER_KEY) chain.push(['openrouter', askOpenRouter]);
    if (env && env.NVIDIA_KEY) chain.push(['nvidia', askNvidia]);
    if (env && env.COHERE_KEY) chain.push(['cohere', askCohere]);
    if (env && env.AI) chain.push(['workers-ai', askCfAi]);
    if (!chain.length) return J({ ok: false, error: 'Asisten belum diaktifkan di server (isi GEMINI_KEY / GROQ_KEY atau binding AI).', code: 'not_configured' }, 503, origin);
    let last = '';
    for (const [name, fn] of chain) {
        try {
            const out = await fn(env, sys, msgs);
            if (!out) throw new Error('kosong');
            if (!hist.length && !isBot) { try { await cache.put(ck, new Response(out, { headers: { 'Cache-Control': 'max-age=21600' } })); } catch (_) {} }
            return J({ ok: true, a: out, by: name }, 200, origin);
        } catch (e) { last += name + ':' + String((e && e.message) || e) + ' '; }
    }
    return J({ ok: false, error: 'Asisten lagi penuh (kuota gratis habis). Coba lagi beberapa menit lagi.', detail: last.trim() }, 503, origin);
}

async function handle(request, ctx, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method === 'POST' && path === '/ask') return routeAsk(request, env, origin);
    if (request.method !== 'GET') return J({ ok: false, error: 'method' }, 405, origin);
    if (path === '/' || path === '/health') return J({ ok: true, service: 'ewoks-live', version: 'v14-global', routes: ['/quotes', '/screener', '/chart', '/gquotes', '/fund', 'POST /ask'], ai: [env && env.GEMINI_KEY && 'gemini', env && env.GROQ_KEY && 'groq', env && env.AI && 'workers-ai'].filter(Boolean) }, 200, origin);
    if (path === '/chart') return routeChart(url, ctx, origin);
    if (path === '/fund') return routeFund(url, ctx, origin);
    if (path === '/screener') return routeScreener(url, ctx, origin);
    if (path === '/quotes') return routeQuotes(url, ctx, origin);
    if (path === '/gquotes') return routeGQuotes(url, ctx, origin);
    return J({ ok: false, error: 'not found' }, 404, origin);
}

// ---------- Pemicu jadwal tepat waktu untuk GitHub Actions ----------
// Jadwal (cron) bawaan GitHub sering tertunda berjam-jam; Cron Trigger Cloudflare tepat waktu.
// Butuh secret GH_TOKEN (fine-grained PAT, repo ini saja, izin Actions: Read and write). Lihat worker/README.md.
const GH_REPO = 'Rdsptwn/EAProInvesting';
const GH_REF = 'main';
// Jendela IHSG (WIB): Senin 03:00 s/d Jumat 18:00; Sabtu-Minggu libur. Intraday hanya jam bursa Senin-Jumat 09-16.
// Forex/crypto/berita (sync-24jam) jalan 24 jam, setiap hari, tanpa libur.
function pickWorkflows(now) {
    const w = new Date(now.getTime() + 7 * 3600e3); // WIB
    const d = w.getUTCDay(), h = w.getUTCHours();   // 0=Min
    const list = ['sync-24jam.yml'];
    if (d >= 1 && d <= 5 && (d > 1 || h >= 3) && (d < 5 || h < 18)) list.push('daily-market-sync.yml');
    if (d >= 1 && d <= 5 && h >= 9 && h <= 16) list.push('market-activity-intraday.yml');
    list.push('sync-live.yml'); // harga hampir-live (cadangan tanpa Worker); candles ikut lewat workflow_run
    return list;
}

async function triggerWorkflows(env, now) {
    if (!env || !env.GH_TOKEN) { console.log('GH_TOKEN belum diisi, lewati.'); return; }
    for (const wf of pickWorkflows(now || new Date())) {
        const r = await fetch(`https://api.github.com/repos/${GH_REPO}/actions/workflows/${wf}/dispatches`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.GH_TOKEN}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'ewoks-live-cron',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ref: GH_REF }),
            signal: AbortSignal.timeout(10000),
        });
        console.log(wf, r.status, r.status === 204 ? 'ok' : (await r.text()).slice(0, 200));
    }
}

export default {
    async fetch(request, env, ctx) {
        try {
            return await handle(request, ctx, env);
        } catch (e) {
            return J({ ok: false, error: 'worker error: ' + String((e && e.message) || e) }, 500, request.headers.get('Origin') || '');
        }
    },
    // Cron Trigger: picu workflow data (lihat README).
    async scheduled(event, env, ctx) {
        ctx.waitUntil(triggerWorkflows(env, new Date(event && event.scheduledTime ? event.scheduledTime : Date.now())).catch((e) => console.log('trigger gagal:', e && e.message)));
    },
};
