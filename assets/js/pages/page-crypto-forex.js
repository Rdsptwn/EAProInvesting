/* Mode Bitcoin (kripto) & Mode Forex. Dipilih lewat <body data-page="bitcoin|forex">.
   Data snapshot: assets/data/crypto.json, forex.json (Actions). Live: Binance (kripto) dan Worker /gquotes (forex, emas). */
(function () {
    'use strict';
    var PAGE = document.body.getAttribute('data-page');
    if (PAGE !== 'bitcoin' && PAGE !== 'forex') return;
    var BASE = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    var V = encodeURIComponent(window.EWOKS_ASSET_V || '1');
    var API = typeof EWOKS_LIVE_API_URL !== 'undefined' ? EWOKS_LIVE_API_URL : '';
    var cache = {};
    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function get(name) { return cache[name] || (cache[name] = fetch(BASE + 'assets/data/' + name + '?v=' + V).then(function (r) { if (!r.ok) throw new Error(name); return r.json(); })); }
    function num(v, d) { if (!Number.isFinite(v)) return '—'; return v.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }); }
    function dec(p) { return p >= 1000 ? 2 : p >= 100 ? (PAGE === 'forex' ? 3 : 2) : p >= 10 ? 3 : p >= 1 ? 4 : p >= 0.01 ? 5 : 8; }
    function pct(c, big) {
        if (!Number.isFinite(c)) return '<span class="text-slate-400">—</span>';
        var up = c >= 0;
        return '<span class="' + (up ? 'text-emerald-600' : 'text-rose-600') + ' font-bold' + (big ? ' text-lg' : '') + '">' + (up ? '▲ +' : '▼ ') + c.toFixed(2) + '%</span>';
    }
    function spark(a, up, w, h) {
        if (!a || a.length < 2) return '';
        w = w || 90; h = h || 26;
        var mn = Math.min.apply(null, a), mx = Math.max.apply(null, a), r = mx - mn || 1;
        var pts = a.map(function (v, i) { return (i / (a.length - 1) * w).toFixed(1) + ',' + (h - 2 - (v - mn) / r * (h - 4)).toFixed(1); }).join(' ');
        return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline fill="none" stroke="' + (up ? '#10b981' : '#f43f5e') + '" stroke-width="1.6" stroke-linejoin="round" points="' + pts + '"/></svg>';
    }
    function tv(el, symbol, theme) {
        if (!window.TradingView || !el) { if (el) el.innerHTML = '<p class="p-6 text-sm text-slate-500">Grafik belum bisa dimuat. Coba muat ulang halaman.</p>'; return; }
        el.innerHTML = '<div id="' + el.id + '-w" style="height:100%"></div>';
        new TradingView.widget({ container_id: el.id + '-w', symbol: symbol, interval: 'D', timezone: 'Asia/Jakarta', theme: theme, style: '1', locale: 'id', autosize: true, hide_side_toolbar: false, allow_symbol_change: false, withdateranges: true, save_image: false });
    }
    function stamp(el, txt) { if (el) el.textContent = txt; }
    function nowWib() { var d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(11, 16).replace(':', '.') + ' WIB'; }
    function showTab(tab) {
        document.querySelectorAll('[data-tab]').forEach(function (s) { s.classList.toggle('hidden', s.getAttribute('data-tab') !== tab); });
        if (window.ewoksGlobalNavMark) ewoksGlobalNavMark(tab);
        window.scrollTo({ top: 0 });
    }
    function route() {
        var h = (location.hash || '#ringkasan').replace('#', '');
        var tabs = [].map.call(document.querySelectorAll('[data-tab]'), function (s) { return s.getAttribute('data-tab'); });
        showTab(tabs.indexOf(h) >= 0 ? h : 'ringkasan');
        if (PAGE === 'bitcoin') btcTabHook(h); else fxTabHook(h);
    }
    window.addEventListener('hashchange', route);
    function jget(u, ms) { var c = new AbortController(); setTimeout(function () { c.abort(); }, ms || 8000); return fetch(u, { signal: c.signal, cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
    function gquotes(syms) { // -> { SYM: [price, prev, chgPct, vol] }
        if (!API || !syms.length) return Promise.resolve({});
        return jget(API + '/gquotes?s=' + encodeURIComponent(syms.join(',')), 9000).then(function (j) { return (j && j.q) || {}; }).catch(function () { return {}; });
    }

    /* ======================= BITCOIN ======================= */
    var coins = [], idr = null, sel = 'BTC', sortK = 'mcap', q = '', btcLive = false, chartFor = '';
    var NOCHART = { USDT: 1, USDC: 1 };
    var TVSYM = { XAUT: 'BITFINEX:XAUTUSD', PAXG: 'BINANCE:PAXGUSDT' };
    var BINANCE = {};
    function tvSymbol(k) { return TVSYM[k] || ('BINANCE:' + k + 'USDT'); }
    function usdIdr() { return idr || 16500; }
    function fmtIdr(v) { if (!Number.isFinite(v)) return '—'; if (v >= 1e9) return 'Rp' + num(v / 1e9, 2) + ' M'; if (v >= 1e6) return 'Rp' + num(v / 1e6, 2) + ' jt'; return 'Rp' + num(v, v >= 1000 ? 0 : 2); }
    function drawBtcHero() {
        var c = coins.filter(function (x) { return x.k === sel; })[0] || coins[0];
        if (!c) return;
        $('c-name').textContent = c.n + ' (' + c.k + ')';
        $('c-price').textContent = '$' + num(c.price, dec(c.price));
        $('c-idr').textContent = fmtIdr(c.price * usdIdr());
        $('c-chg').innerHTML = pct(c.chg, true) + ' <span class="text-xs text-slate-400 ml-1">24 jam</span>';
        var rng = '';
        if (c.low52 && c.high52) { var pos = Math.max(0, Math.min(100, (c.price - c.low52) / (c.high52 - c.low52) * 100)); rng = '<div class="text-[11px] text-slate-400 mb-1">Rentang 52 minggu</div><div class="h-2 rounded-full bg-slate-700 relative"><span class="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400" style="left:calc(' + pos.toFixed(1) + '% - 6px)"></span></div><div class="flex justify-between text-[11px] text-slate-300 mt-1"><span>$' + num(c.low52, dec(c.low52)) + '</span><span>$' + num(c.high52, dec(c.high52)) + '</span></div>'; }
        $('c-range').innerHTML = rng;
        $('c-m1').innerHTML = pct(c.chg1m);
        var btc = coins.filter(function (x) { return x.k === 'BTC'; })[0];
        $('c-dom').textContent = btc && c.k !== 'BTC' && btc.price ? (c.price / btc.price).toFixed(c.price / btc.price < 0.001 ? 8 : 5) + ' BTC' : '—';
        if (chartFor !== sel) { chartFor = sel; if (NOCHART[sel]) $('c-chart').innerHTML = '<p class="p-6 text-sm text-slate-400">Stablecoin harganya ±$1, tidak ada grafik.</p>'; else tv($('c-chart'), tvSymbol(sel), 'dark'); }
    }
    function drawCoins() {
        var rows = coins.filter(function (c) { return !q || (c.k + ' ' + c.n).toLowerCase().indexOf(q) >= 0; });
        var key = { chg: 'chg', m1: 'chg1m', price: 'price' }[sortK];
        if (key) rows = rows.slice().sort(function (a, b) { return (b[key] == null ? -1e9 : b[key]) - (a[key] == null ? -1e9 : a[key]); });
        $('c-body').innerHTML = rows.map(function (c, i) {
            var up = (c.chg || 0) >= 0;
            return '<tr data-coin="' + esc(c.k) + '" class="cursor-pointer border-t border-slate-800 hover:bg-slate-800/60"><td class="px-3 py-2.5 text-slate-500 text-xs">' + (i + 1) + '</td><td class="px-3 py-2.5"><div class="font-black text-white">' + esc(c.k) + '</div><div class="text-[11px] text-slate-400">' + esc(c.n) + '</div></td><td class="px-3 py-2.5 text-right font-bold text-white">$' + num(c.price, dec(c.price)) + '<div class="text-[11px] font-normal text-slate-400">' + fmtIdr(c.price * usdIdr()) + '</div></td><td class="px-3 py-2.5 text-right">' + pct(c.chg) + '</td><td class="px-3 py-2.5 text-right hidden sm:table-cell">' + pct(c.chg1m) + '</td><td class="px-3 py-2.5 text-right hidden md:table-cell">' + spark(c.spark, (c.chg1m || 0) >= 0) + '</td></tr>';
        }).join('') || '<tr><td colspan="6" class="p-6 text-center text-slate-400 text-sm">Tidak ada koin yang cocok.</td></tr>';
        ['chg', 'm1', 'price', 'mcap'].forEach(function (k) { var b = $('c-s-' + k); if (b) b.classList.toggle('on', k === sortK); });
    }
    function drawGold() {
        var pg = coins.filter(function (x) { return x.k === 'PAXG'; })[0], xt = coins.filter(function (x) { return x.k === 'XAUT'; })[0];
        get('forex.json').then(function (f) {
            var x = f.items.filter(function (i) { return i.k === 'XAUUSD'; })[0];
            var live = window.__fxLive && window.__fxLive.XAUUSD;
            var spot = live ? live[0] : x && x.price;
            function card(c, nm) {
                if (!c) return '';
                var prem = spot ? (c.price - spot) / spot * 100 : null;
                return '<div class="rounded-2xl bg-slate-800/70 p-5"><div class="text-xs text-amber-300 font-bold">' + nm + '</div><div class="text-3xl font-black text-white mt-1">$' + num(c.price, 2) + '</div><div class="mt-1">' + pct(c.chg) + ' <span class="text-[11px] text-slate-400">24 jam</span></div>' + (prem != null ? '<div class="mt-3 text-xs text-slate-300">Selisih vs emas spot (XAU/USD $' + num(spot, 2) + '): <b class="' + (prem >= 0 ? 'text-emerald-400' : 'text-rose-400') + '">' + (prem >= 0 ? '+' : '') + prem.toFixed(2) + '%</b></div>' : '') + '<div class="text-xs text-slate-400 mt-1">≈ ' + fmtIdr(c.price * usdIdr() / 31.1034768) + ' per gram</div></div>';
            }
            $('c-gold').innerHTML = card(pg, 'PAXG · PAX Gold') + card(xt, 'XAUT · Tether Gold') + (x ? '<div class="rounded-2xl bg-slate-800/70 p-5"><div class="text-xs text-amber-300 font-bold">XAU/USD · Emas spot</div><div class="text-3xl font-black text-white mt-1">$' + num(spot, 2) + '</div><div class="mt-1">' + pct(live ? live[2] : x.chg) + '</div><div class="text-xs text-slate-400 mt-3">Pembanding. Token emas diikat ke 1 troy ounce emas fisik; harganya bisa sedikit beda dari spot.</div></div>' : '');
        }).catch(function () { $('c-gold').innerHTML = ''; });
    }
    function drawFng() {
        jget('https://api.alternative.me/fng/?limit=1', 7000).then(function (j) {
            var d = j && j.data && j.data[0]; if (!d) return;
            var v = +d.value, cls = v < 25 ? 'Ketakutan ekstrem' : v < 45 ? 'Takut' : v < 56 ? 'Netral' : v < 75 ? 'Serakah' : 'Keserakahan ekstrem';
            $('c-fng').innerHTML = '<div class="text-[11px] text-slate-400">Fear &amp; Greed kripto</div><div class="text-2xl font-black text-white">' + v + ' <span class="text-sm font-bold text-amber-300">' + cls + '</span></div>';
        }).catch(function () {});
    }
    function applyBinance(arr) {
        var by = {}; arr.forEach(function (t) { by[t.symbol] = t; });
        var any = false;
        coins.forEach(function (c) { var t = by[c.k + 'USDT']; if (t && +t.lastPrice > 0) { c.price = +t.lastPrice; c.chg = +t.priceChangePercent; any = true; } });
        return any;
    }
    var bnOk = null;
    function btcLiveTick() {
        var req = bnOk ? jget('https://api.binance.com/api/v3/ticker/24hr?symbols=[' + bnOk.join(',') + ']', 7000) : jget('https://api.binance.com/api/v3/ticker/24hr', 15000).then(function (all) { var have = {}; all.forEach(function (t) { have[t.symbol] = 1; }); bnOk = coins.filter(function (c) { return have[c.k + 'USDT']; }).map(function (c) { return '"' + c.k + 'USDT"'; }); return all; });
        req.then(function (arr) { return applyBinance(arr); }).catch(function () {
            // cadangan: Worker (Yahoo) bila Binance tidak terjangkau
            return gquotes(coins.map(function (c) { return c.s; })).then(function (qq) { var any = false; coins.forEach(function (c) { var r = qq[c.s]; if (r) { c.price = r[0]; c.chg = r[2]; any = true; } }); return any; });
        }).then(function (ok) {
            if (ok) { btcLive = true; stamp($('c-stamp'), '● Live ' + nowWib()); drawBtcHero(); drawCoins(); }
        });
    }
    function btcInit() {
        Promise.all([get('crypto.json'), get('forex.json').catch(function () { return null; })]).then(function (r) {
            coins = r[0].items; var u = r[1] && r[1].items.filter(function (i) { return i.k === 'USDIDR'; })[0]; idr = u ? u.price : null;
            stamp($('c-stamp'), 'Snapshot ' + new Date(r[0].meta.built).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) + ' WIB');
            drawBtcHero(); drawCoins(); drawGold(); drawFng();
            btcLiveTick(); setInterval(btcLiveTick, 20000);
            gquotes(['IDR=X']).then(function (qq) { if (qq['IDR=X']) { idr = qq['IDR=X'][0]; drawBtcHero(); drawCoins(); } });
        }).catch(function () { $('c-body').innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400 text-sm">Data kripto belum tersedia. Jalankan workflow "Sync global" di GitHub Actions.</td></tr>'; });
        $('c-q').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); drawCoins(); });
        $('c-sorts').addEventListener('click', function (e) { var b = e.target.closest('[data-sort]'); if (!b) return; sortK = b.dataset.sort; drawCoins(); });
        $('c-body').addEventListener('click', function (e) { var tr = e.target.closest('[data-coin]'); if (!tr) return; sel = tr.dataset.coin; if ((location.hash || '#ringkasan') !== '#ringkasan') location.hash = 'ringkasan'; setTimeout(drawBtcHero, 60); });
        get('global-news.json').then(function (d) {
            var re = /bitcoin|crypto|ethereum|stablecoin|kripto|blockchain|binance|coinbase|digital asset|etf spot/i;
            var items = d.items.filter(function (n) { return re.test(n.title + ' ' + (n.desc || '')); }).slice(0, 12);
            $('c-news').innerHTML = items.length ? items.map(function (n) { return '<a href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer" class="block rounded-2xl bg-slate-800/70 hover:bg-slate-800 p-4"><div class="text-[11px] text-amber-300 font-bold">' + esc(n.src) + '</div><div class="font-bold text-white text-sm mt-1">' + esc(n.title) + '</div><div class="text-xs text-slate-400 mt-1 line-clamp-2">' + esc(n.desc || '') + '</div></a>'; }).join('') : '<p class="text-sm text-slate-400">Belum ada berita kripto di umpan saat ini. Lihat berita pasar di Mode Global.</p>';
        }).catch(function () {});
    }
    function listingInit() {
        get('crypto-listings.json').then(function (d) {
            var ago = function (ts) { if (!ts) return ''; var m = Math.round((Date.now() - ts) / 60000); return m < 60 ? m + ' menit lalu' : m < 1440 ? Math.round(m / 60) + ' jam lalu' : Math.round(m / 1440) + ' hari lalu'; };
            $('c-list').innerHTML = (d.items || []).map(function (n) {
                var del = n.kind === 'delisting';
                return '<a href="' + esc(n.url) + '" target="_blank" rel="noopener noreferrer" class="block rounded-2xl bg-slate-800/70 hover:bg-slate-800 p-4"><div class="flex items-center gap-2 text-[11px] font-bold"><span class="px-2 py-0.5 rounded-full ' + (del ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300') + '">' + (del ? 'Delisting' : 'Listing') + '</span><span class="text-amber-300">' + esc(n.src) + '</span><span class="text-slate-500 ml-auto">' + ago(n.ts) + '</span></div><div class="text-sm font-bold text-white mt-2">' + esc(n.title) + '</div></a>';
            }).join('') || '<p class="text-sm text-slate-400">Belum ada pengumuman.</p>';
            $('c-trend').innerHTML = d.trending && d.trending.length ? '<div class="text-[11px] text-slate-400 mb-2">Sedang ramai dicari (CoinGecko)</div><div class="flex flex-wrap gap-2">' + d.trending.map(function (c) { return '<span class="px-3 py-1.5 rounded-full bg-slate-800 text-xs font-bold text-white">' + esc(c.s) + ' <span class="text-slate-400 font-normal">' + esc(c.n) + '</span>' + (c.chg != null ? ' ' + pct(c.chg) : '') + '</span>'; }).join('') + '</div>' : '';
        }).catch(function () { $('c-list').innerHTML = '<p class="text-sm text-slate-400">Data listing belum tersedia. Akan terisi setelah workflow sinkron berikutnya.</p>'; });
    }
    function btcTabHook(h) { if (h === 'listing' && !btcTabHook.l) { btcTabHook.l = 1; listingInit(); } if (h === 'emas' && !btcTabHook.g) { btcTabHook.g = 1; tv($('c-gchart'), 'OANDA:XAUUSD', 'dark'); } }

    /* ======================= FOREX ======================= */
    var fx = [], fxG = 'major', fxQ = '', fxSel = 'EURUSD', live = (window.__fxLive = {});
    var GROUPS = [['major', 'Major'], ['cross', 'Cross'], ['asia', 'Asia & IDR'], ['exotic', 'Eksotik'], ['metal', 'Logam']];
    var CCY = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];
    function px(it) { var l = live[it.s]; return l ? l[0] : it.price; }
    function ch(it) { var l = live[it.s]; return l && Number.isFinite(l[2]) ? l[2] : it.chg; }
    function strength() {
        var sc = {}, n = {}; CCY.forEach(function (c) { sc[c] = 0; n[c] = 0; });
        fx.forEach(function (it) {
            var a = it.k.slice(0, 3), b = it.k.slice(3, 6), c = ch(it);
            if (!(a in sc) || !(b in sc) || !Number.isFinite(c) || it.g === 'asia' || it.g === 'exotic') return;
            sc[a] += c; n[a]++; sc[b] -= c; n[b]++;
        });
        return CCY.map(function (c) { return [c, n[c] ? sc[c] / n[c] : 0]; }).sort(function (a, b) { return b[1] - a[1]; });
    }
    function drawStrength() {
        var s = strength(), mx = Math.max.apply(null, s.map(function (x) { return Math.abs(x[1]); })) || 1;
        $('f-strength').innerHTML = s.map(function (x) {
            var w = Math.max(4, Math.abs(x[1]) / mx * 100), up = x[1] >= 0;
            return '<div class="flex items-center gap-3"><span class="w-10 font-black text-slate-800 text-sm">' + x[0] + '</span><div class="flex-1 h-4 rounded bg-slate-100 overflow-hidden"><div class="h-full ' + (up ? 'bg-teal-500' : 'bg-rose-400') + '" style="width:' + w.toFixed(0) + '%"></div></div><span class="w-14 text-right text-xs font-bold ' + (up ? 'text-teal-700' : 'text-rose-600') + '">' + (up ? '+' : '') + x[1].toFixed(2) + '%</span></div>';
        }).join('');
    }
    function tile(it) {
        var c = ch(it), up = (c || 0) >= 0, p = px(it);
        var bg = !Number.isFinite(c) ? '#f1f5f9' : (up ? 'rgba(20,184,166,' : 'rgba(244,63,94,') + Math.min(0.45, 0.08 + Math.abs(c) * 0.25).toFixed(2) + ')';
        return '<button type="button" data-pair="' + esc(it.k) + '" class="text-left rounded-2xl p-3 border border-slate-200 hover:shadow-md transition" style="background:' + bg + '"><div class="text-xs font-black text-slate-800">' + esc(it.n.split(' ·')[0]) + '</div><div class="text-lg font-black text-slate-900">' + num(p, dec(p)) + '</div><div class="text-xs">' + pct(c) + '</div></button>';
    }
    function drawTiles() {
        var maj = fx.filter(function (i) { return i.g === 'major'; });
        $('f-tiles').innerHTML = maj.map(tile).join('');
        var x = fx.filter(function (i) { return i.k === 'XAUUSD'; })[0];
        if (x) { var p = px(x), c = ch(x); $('f-gold').innerHTML = '<div class="text-xs font-bold text-amber-700">XAU/USD · Emas spot</div><div class="text-4xl font-black text-slate-900 mt-1">$' + num(p, 2) + '</div><div class="mt-1">' + pct(c, true) + '</div><a href="#emas" class="inline-block mt-3 text-xs font-bold text-teal-700">Buka grafik & konversi rupiah ›</a>'; }
    }
    function drawPairs() {
        var rows = fx.filter(function (i) { return (!fxQ && (fxG === i.g || (fxG === 'metal' && i.g === 'index'))) || (fxQ && (i.k + i.n).toLowerCase().indexOf(fxQ) >= 0); });
        $('f-tabs').innerHTML = GROUPS.map(function (g) { return '<button type="button" data-g="' + g[0] + '" class="hm-chip shrink-0 ' + (g[0] === fxG && !fxQ ? 'on' : '') + '">' + g[1] + '</button>'; }).join('');
        $('f-body').innerHTML = rows.map(function (it) {
            var p = px(it), c = ch(it);
            return '<tr data-pair="' + esc(it.k) + '" class="cursor-pointer border-t border-slate-100 hover:bg-slate-50"><td class="px-3 py-2.5 font-black text-slate-900">' + esc(it.n) + '<div class="text-[10px] font-normal text-slate-400">' + esc(it.k) + '</div></td><td class="px-3 py-2.5 text-right font-bold">' + num(p, dec(p)) + '</td><td class="px-3 py-2.5 text-right">' + pct(c) + '</td><td class="px-3 py-2.5 text-right hidden sm:table-cell">' + pct(it.chg1m) + '</td><td class="px-3 py-2.5 text-right hidden md:table-cell text-xs text-slate-500">' + (it.low52 ? num(it.low52, dec(it.low52)) + ' – ' + num(it.high52, dec(it.high52)) : '—') + '</td><td class="px-3 py-2.5 text-right hidden md:table-cell">' + spark(it.spark, (it.chg1m || 0) >= 0) + '</td></tr>';
        }).join('') || '<tr><td colspan="6" class="p-6 text-center text-sm text-slate-400">Tidak ada pasangan yang cocok.</td></tr>';
    }
    function tvPair(k) { var m = { DXY: 'TVC:DXY', XAUUSD: 'OANDA:XAUUSD', XAGUSD: 'OANDA:XAGUSD' }; return m[k] || ('FX:' + k); }
    function drawPairChart() { var it = fx.filter(function (i) { return i.k === fxSel; })[0]; if (!it) return; $('f-ct').textContent = it.n; tv($('f-chart'), tvPair(fxSel), 'light'); }
    function drawGoldTab() {
        var x = fx.filter(function (i) { return i.k === 'XAUUSD'; })[0], u = fx.filter(function (i) { return i.k === 'USDIDR'; })[0];
        if (!x) return;
        var g = px(x), r = u ? px(u) : null, gram = r ? g * r / 31.1034768 : null;
        $('f-gold-stats').innerHTML = '<div class="rounded-2xl bg-amber-50 p-4"><div class="text-xs text-amber-700 font-bold">XAU/USD</div><div class="text-2xl font-black">$' + num(g, 2) + '</div>' + pct(ch(x)) + '</div>' +
            '<div class="rounded-2xl bg-amber-50 p-4"><div class="text-xs text-amber-700 font-bold">Emas per gram (hitungan)</div><div class="text-2xl font-black">' + (gram ? 'Rp' + num(gram, 0) : '—') + '</div><div class="text-[11px] text-slate-500 mt-1">Harga dunia × kurs ÷ 31,1035. Bukan harga toko/Antam.</div></div>' +
            '<div class="rounded-2xl bg-amber-50 p-4"><div class="text-xs text-amber-700 font-bold">Rentang 52 minggu</div><div class="text-lg font-black">' + (x.low52 ? '$' + num(x.low52, 0) + ' – $' + num(x.high52, 0) : '—') + '</div>' + pct(x.chg1m) + ' <span class="text-[11px] text-slate-400">1 bulan</span></div>';
        tv($('f-gold-chart'), 'OANDA:XAUUSD', 'light');
    }
    /* Kalkulator pip & ukuran lot */
    function toUsd(ccy) {
        if (ccy === 'USD') return 1;
        var a = fx.filter(function (i) { return i.k === ccy + 'USD'; })[0], b = fx.filter(function (i) { return i.k === 'USD' + ccy; })[0];
        if (a) return px(a); if (b) return 1 / px(b); return null;
    }
    function pipInfo(k) {
        if (k === 'XAUUSD') return { pip: 0.1, contract: 100, quote: 'USD' };
        if (k === 'XAGUSD') return { pip: 0.01, contract: 5000, quote: 'USD' };
        var quote = k.slice(3, 6); return { pip: quote === 'JPY' ? 0.01 : 0.0001, contract: 100000, quote: quote };
    }
    function calc() {
        var k = $('k-pair').value, lots = +$('k-lot').value || 0, bal = +$('k-bal').value || 0, rk = +$('k-risk').value || 0, sl = +$('k-sl').value || 0;
        var pi = pipInfo(k), qu = toUsd(pi.quote);
        var usdr = fx.filter(function (i) { return i.k === 'USDIDR'; })[0]; var rate = usdr ? px(usdr) : null;
        if (!qu) { $('k-out').innerHTML = '<p class="text-sm text-slate-500">Kurs konversi untuk pasangan ini belum tersedia.</p>'; return; }
        var pv = pi.pip * pi.contract * qu; // USD per pip per 1 lot
        var rows = [['Nilai 1 pip per 1 lot', '$' + num(pv, 2) + (rate ? ' ≈ Rp' + num(pv * rate, 0) : '')], ['Nilai 1 pip untuk ' + lots + ' lot', '$' + num(pv * lots, 2) + (rate ? ' ≈ Rp' + num(pv * lots * rate, 0) : '')]];
        if (bal > 0 && rk > 0 && sl > 0) { var risk = bal * rk / 100, lot = risk / (sl * pv); rows.push(['Risiko per transaksi (' + rk + '% dari $' + num(bal, 0) + ')', '$' + num(risk, 2)]); rows.push(['Ukuran lot yang sesuai (SL ' + sl + ' pip)', '<b class="text-teal-700">' + num(lot, 2) + ' lot</b>']); }
        $('k-out').innerHTML = rows.map(function (r) { return '<div class="flex justify-between gap-3 py-2 border-b border-slate-100 text-sm"><span class="text-slate-600">' + r[0] + '</span><span class="font-bold text-slate-900 text-right">' + r[1] + '</span></div>'; }).join('') + '<p class="text-[11px] text-slate-400 mt-3">Perkiraan edukasi dari harga pasar saat ini; spread, komisi, dan swap belum dihitung. Trading forex berisiko tinggi.</p>';
    }
    function fxTabHook(h) { if (h === 'emas' && !fxTabHook.g) { fxTabHook.g = 1; drawGoldTab(); } if (h === 'kalkulator') calc(); }
    function fxLiveTick() {
        gquotes(fx.map(function (i) { return i.s; })).then(function (qq) {
            var n = 0; Object.keys(qq).forEach(function (s) { live[s] = qq[s]; n++; });
            if (n) { stamp($('f-stamp'), '● Live ' + nowWib()); drawStrength(); drawTiles(); drawPairs(); }
        });
    }
    function fxInit() {
        get('forex.json').then(function (d) {
            fx = d.items;
            stamp($('f-stamp'), 'Snapshot ' + new Date(d.meta.built).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) + ' WIB');
            drawStrength(); drawTiles(); drawPairs(); drawPairChart();
            $('k-pair').innerHTML = fx.filter(function (i) { return i.g !== 'index'; }).map(function (i) { return '<option value="' + i.k + '">' + esc(i.n) + '</option>'; }).join('');
            ['k-pair', 'k-lot', 'k-bal', 'k-risk', 'k-sl'].forEach(function (id) { $(id).addEventListener('input', calc); });
            calc(); fxLiveTick(); setInterval(fxLiveTick, 60000); route();
        }).catch(function () { $('f-body').innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400 text-sm">Data forex belum tersedia. Jalankan workflow "Sync global" di GitHub Actions.</td></tr>'; });
        $('f-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (!b) return; fxG = b.dataset.g; fxQ = ''; $('f-q').value = ''; drawPairs(); });
        $('f-q').addEventListener('input', function (e) { fxQ = e.target.value.trim().toLowerCase(); drawPairs(); });
        function pick(e) { var t = e.target.closest('[data-pair]'); if (!t) return; fxSel = t.dataset.pair; if ((location.hash || '#ringkasan') !== '#ringkasan') location.hash = 'ringkasan'; setTimeout(drawPairChart, 60); }
        $('f-body').addEventListener('click', pick); $('f-tiles').addEventListener('click', pick);
    }

    if (PAGE === 'bitcoin') btcInit(); else fxInit();
    if (PAGE === 'bitcoin') route();
})();
