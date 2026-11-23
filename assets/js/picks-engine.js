/* Mesin rekomendasi Buy on Weakness (BoW) untuk Saham Global, Kripto, dan Forex.
   Dipakai oleh kartu di halaman (page-bot-picks-multi.js) dan command chat (/pagi /siang /swing /scalp).
   Dihitung di browser dari candle: Binance (kripto), Worker /chart (Yahoo; saham global & forex). Edukasi, bukan ajakan beli/jual. */
(function () {
    'use strict';
    if (window.EwoksPicksEngine) return;
    var BASE = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    var V = encodeURIComponent(window.EWOKS_ASSET_V || '1');
    var STABLE = /^(USDT|USDC|DAI|FDUSD|TUSD|USDE|USDD|USDS|PYUSD|STETH|WBTC|WETH)$/;
    function api() { return (typeof getEwoksLiveApi === 'function' ? getEwoksLiveApi() : '') || ''; }
    function get(n) { return fetch(BASE + 'assets/data/' + n + '?v=' + V).then(function (r) { if (!r.ok) throw new Error(n); return r.json(); }); }
    function dec(market, p, k) { if (market === 'forex') return /JPY|IDR|KRW|INR|XAU|XAG/.test(k || '') ? 3 : 5; return p >= 1000 ? 2 : p >= 1 ? 3 : p >= 0.01 ? 5 : 8; }
    function fmt(market, p, k) { var d = dec(market, p, k); return Number(p).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
    function agg4(h, l, c) {
        var H = [], L = [], C = [];
        for (var i = 0; i + 3 < c.length; i += 4) { H.push(Math.max.apply(null, h.slice(i, i + 4))); L.push(Math.min.apply(null, l.slice(i, i + 4))); C.push(c[i + 3]); }
        return { h: H, l: L, c: C };
    }
    function viaWorker(sym, tf) {
        var A = api(); if (!A) return Promise.resolve(null);
        var rg = tf === '5m' ? '5d' : tf === '1h' ? '1mo' : '3mo', iv = tf === '5m' ? '5m' : '60m';
        return fetch(A + '/chart?s=' + encodeURIComponent(sym) + '&g=1&range=' + rg + '&interval=' + iv, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
            if (!d || !d.ok || !d.c || d.c.length < 30) return null;
            var o = { h: d.h, l: d.l, c: d.c };
            return tf === '4h' ? agg4(o.h, o.l, o.c) : o;
        }).catch(function () { return null; });
    }
    function viaBinance(k, tf) {
        return fetch('https://api.binance.com/api/v3/klines?symbol=' + encodeURIComponent(k) + 'USDT&interval=' + tf + '&limit=120').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (a) {
            return { h: a.map(function (x) { return +x[2]; }), l: a.map(function (x) { return +x[3]; }), c: a.map(function (x) { return +x[4]; }) };
        }).catch(function () { return null; });
    }
    /* Level dari candle: support/resist = swing (pivot) terdekat yang sudah teruji berkali-kali, bukan persen tetap.
       Support: pivot low (2 candle kiri-kanan lebih tinggi) dalam 40 candle terakhir, di bawah harga, dipilih dari jumlah sentuhan dan kedekatan.
       Resist: pivot high terdekat yang sedikitnya 1,5 ATR di atas harga (kalau tidak ada: high 20 candle). */
    function levels(h, l, c, atr) {
        var n = c.length, price = c[n - 1], i, j, from = Math.max(2, n - 42), sup = null, bs = -1e9, res = null, rs = 1e9, tch = 0;
        for (i = from; i < n - 2; i++) {
            if (l[i] <= l[i - 1] && l[i] <= l[i - 2] && l[i] <= l[i + 1] && l[i] <= l[i + 2] && l[i] <= price + 0.3 * atr && price - l[i] <= 5 * atr) {
                var t = 0; for (j = from; j < n; j++) if (Math.abs(l[j] - l[i]) <= 0.35 * atr) t++;
                var sc = Math.min(t, 4) - (price - l[i]) / atr * 0.6;
                if (sc > bs) { bs = sc; sup = l[i]; tch = t; }
            }
            if (h[i] >= h[i - 1] && h[i] >= h[i - 2] && h[i] >= h[i + 1] && h[i] >= h[i + 2] && h[i] >= price + 1.5 * atr && h[i] < rs) { rs = h[i]; res = h[i]; }
        }
        var l20 = Infinity, h20 = -Infinity; for (i = n - 21; i < n - 1; i++) { l20 = Math.min(l20, l[i]); h20 = Math.max(h20, h[i]); }
        if (sup == null) { sup = l20; tch = 1; }
        var hi20 = Math.max(h20, price);
        return { sup: sup, res: res != null ? res : hi20, resPivot: res != null, touches: tch };
    }
    function analyze(it, o, mode, rd) {
        var c = o.c, h = o.h, l = o.l, n = c.length; if (n < 55) return null;
        var price = c[n - 1], i, sum = 0, tr = 0;
        for (i = n - 50; i < n; i++) sum += c[i]; var ma = sum / 50;
        for (i = n - 14; i < n; i++) tr += Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
        var atr = tr / 14; if (!(atr > 0)) return null;
        var lv = levels(h, l, c, atr), sup = lv.sup, res = lv.res;
        var loose = mode === 'longgar';
        if (price < ma * (loose ? 0.99 : 0.998)) return null;
        var dist = price - sup; if (dist < -0.3 * atr || dist > (loose ? 5 : 3.5) * atr) return null;
        if (res - price < (loose ? 2.5 : 3.5) * atr) return null;
        var lo = sup, hi = sup + 0.7 * atr, cl = sup - 0.8 * atr, tp = res;
        if (rd) { lo = rd.up(lo); hi = rd.up(hi); cl = rd.dn(cl); tp = rd.dn(tp); if (hi <= lo) hi = rd.up(lo + 1e-9) + (rd.step ? rd.step(lo) : 0); }
        var mid = (lo + hi) / 2, rr = (tp - mid) / (mid - cl);
        if (!(rr >= (loose ? 1.2 : 1.5)) || !(cl < lo)) return null;
        var chg = (price / c[Math.max(0, n - 25)] - 1) * 100;
        return { t: it.k, n: it.n || '', price: price, lo: lo, hi: hi, tp: tp, tp1: mid + (tp - mid) * 0.5, cl: cl, rr: rr, chg: chg, atr: atr, touches: lv.touches, smart: true, score: rr * 10 + Math.max(0, 4 - dist / atr) * 3 + Math.min(lv.touches, 4) };
    }
    /* IHSG: candle harian dari Worker (Yahoo .JK), pembulatan fraksi harga BEI. */
    function tkI(v) { return v < 200 ? 1 : v < 500 ? 2 : v < 2000 ? 5 : v < 5000 ? 10 : 25; }
    var RD_IDX = { up: function (v) { var t = tkI(v); return Math.ceil(v / t - 1e-9) * t; }, dn: function (v) { var t = tkI(v); return Math.floor(v / t + 1e-9) * t; }, step: tkI };
    function idxDaily(code) {
        var A = api(); if (!A) return Promise.resolve(null);
        return fetch(A + '/chart?s=' + encodeURIComponent(code) + '&range=3mo&interval=1d', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
            return d && d.ok && d.c && d.c.length >= 55 ? { h: d.h, l: d.l, c: d.c } : null;
        }).catch(function () { return null; });
    }
    /* codes: [{k, n}] -> Promise<{code: analisis|null}> ; null = lolos tidak / data tidak ada. avail = jumlah yang datanya berhasil diambil */
    function idxSmart(codes, mode) {
        var avail = 0;
        return pool(codes, function (it) { return idxDaily(it.k).then(function (o) { if (!o) return null; avail++; return analyze(it, o, mode, RD_IDX); }); }, 6).then(function (rs) {
            var m = {}; codes.forEach(function (it, i) { m[it.k] = rs[i]; }); return { map: m, avail: avail };
        });
    }
    function pool(items, fn, conc) {
        var out = new Array(items.length), idx = 0;
        return Promise.all(Array.from({ length: Math.min(conc, items.length) }, function () {
            return (function next() { var i = idx++; if (i >= items.length) return Promise.resolve(); return fn(items[i]).then(function (r) { out[i] = r; }).then(next); })();
        })).then(function () { return out; });
    }
    function make(market) {
        var cand = null;
        function candidates() {
            if (cand) return Promise.resolve(cand);
            if (market === 'crypto') return get('crypto.json').then(function (d) { cand = d.items.filter(function (x) { return !STABLE.test(x.k); }).slice(0, 50); return cand; });
            if (market === 'forex') return get('forex.json').then(function (d) { cand = d.items.filter(function (x) { return x.k !== 'DXY' && x.s; }); return cand; });
            return get('global-screener.json').then(function (d) {
                cand = d.rows.filter(function (r) { return r[1] >= 5 && /^[A-Z]{1,5}$/.test(r[0]); })
                    .sort(function (a, b) { return b[1] * (b[8] || 0) - a[1] * (a[8] || 0); }).slice(0, 40).map(function (r) { return { k: r[0], n: r[10], s: r[0] }; });
                return cand;
            });
        }
        function candles(it, tf) {
            if (market === 'crypto') return viaBinance(it.k, tf).then(function (o) { return o || viaWorker(it.s, tf); });
            return viaWorker(it.s, tf);
        }
        /* run(tf, mode) -> Promise<{list, fail, total}> */
        function run(tf, mode) {
            return candidates().then(function (cs) {
                return pool(cs, function (it) { return candles(it, tf).then(function (o) { return o ? analyze(it, o, mode) : 'x'; }); }, 6).then(function (rs) {
                    return { list: rs.filter(function (x) { return x && x !== 'x'; }).sort(function (a, b) { return b.score - a.score; }), fail: rs.filter(function (x) { return x === 'x'; }).length, total: cs.length };
                });
            });
        }
        return { run: run };
    }
    var cache = {};
    window.EwoksPicksEngine = { forMarket: function (m) { return cache[m] || (cache[m] = make(m)); }, fmt: fmt, idxSmart: idxSmart, levels: levels };
})();
