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
    // Candle statis (dibuat GitHub Actions, dilayani GitHub Pages): tidak lewat Worker/OKX yang bisa diblokir jaringan pengguna.
    var statCache = {}, STAT_MAX_AGE = { crypto: 5 * 36e5, forex: 5 * 36e5, global: 4 * 864e5, idx: 5 * 864e5 };
    function stat(market, tf, key) {
        var f = market + '-' + tf;
        if (!statCache[f]) statCache[f] = get('candles/' + f + '.json').catch(function () { return null; });
        return statCache[f].then(function (d) {
            if (!d || !d.s || !d.s[key]) return null;
            if (Date.now() - Date.parse(d.asOf) > (STAT_MAX_AGE[market] || 36e5)) return null; // basi: coba sumber live
            var a = d.s[key]; return a[2].length >= 55 ? { h: a[0], l: a[1], c: a[2] } : null;
        });
    }
    var lastErr = '';
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    // Worker /chart (Yahoo). Satu kali ulang kalau kena batas/gangguan sesaat; alasan gagal disimpan di lastErr supaya bisa ditampilkan.
    function workerChart(sym, g, rg, iv, minN) {
        var A = api(); if (!A) { lastErr = 'URL Worker belum diisi'; return Promise.resolve(null); }
        function once() {
            return fetch(A + '/chart?s=' + encodeURIComponent(sym) + (g ? '&g=1' : '') + '&range=' + rg + '&interval=' + iv, { cache: 'no-store' }).then(function (r) {
                return r.json().then(function (d) { return { st: r.status, d: d }; });
            }).then(function (x) {
                var d = x.d;
                if (!d || !d.ok) { lastErr = (d && d.error) || ('HTTP ' + x.st); return { retry: true }; }
                if (!d.c || d.c.length < minN) { lastErr = 'candle ' + sym + ' terlalu sedikit (' + (d.c ? d.c.length : 0) + ')'; return null; }
                return { o: { h: d.h, l: d.l, c: d.c } };
            }).catch(function (e) { lastErr = 'koneksi ke Worker gagal (' + ((e && e.message) || e) + ')'; return { retry: true }; });
        }
        return once().then(function (r) { return r && r.retry ? sleep(500 + Math.random() * 500).then(once) : r; }).then(function (r) { return r && r.o ? r.o : null; });
    }
    function viaWorker(sym, tf) {
        var rg = tf === '5m' ? '5d' : tf === '1h' ? '1mo' : '3mo', iv = tf === '5m' ? '5m' : '60m';
        return workerChart(sym, true, rg, iv, 30).then(function (o) { return o && tf === '4h' ? agg4(o.h, o.l, o.c) : o; });
    }
    // Kripto: OKX dulu (Binance sering diblokir di Indonesia), lalu Binance, terakhir Worker.
    function viaOkx(k, tf) {
        var bar = { '5m': '5m', '1h': '1H', '4h': '4H' }[tf] || '1H';
        return fetch('https://www.okx.com/api/v5/market/candles?instId=' + encodeURIComponent(k) + '-USDT&bar=' + bar + '&limit=120').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
            var a = (j && j.data || []).slice().reverse(); if (a.length < 50) return null;
            return { h: a.map(function (x) { return +x[2]; }), l: a.map(function (x) { return +x[3]; }), c: a.map(function (x) { return +x[4]; }) };
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
    /* Breakout Resist: harga di dekat/di atas high 40 candle terakhir (di luar 2 candle terakhir), belum terlalu jauh (kelipatan ATR), tren naik, candle terakhir tidak turun tajam. */
    function brkCat(o, b, mode) {
        var h = o.h, l = o.l, c = o.c, n = c.length, loose = mode === 'longgar', i, R = -Infinity, lo40 = Infinity, atr = b.atr, price = b.price;
        for (i = Math.max(0, n - 42); i < n - 2; i++) { R = Math.max(R, h[i]); lo40 = Math.min(lo40, l[i]); }
        if (!isFinite(R) || price < b.ma || price < R - 0.3 * atr || price > R + (loose ? 3.5 : 2.2) * atr) return null;
        if (c[n - 1] < c[n - 2] - (loose ? 0.8 : 0.4) * atr) return null;
        var H = R - lo40, tp = R + Math.min(Math.max(0.8 * H, 2 * atr), 5 * atr), lo = R, hi = R + 0.6 * atr, cl = R - 1.0 * atr;
        var mid = (lo + hi) / 2, rr = (tp - mid) / (mid - cl);
        if (!(rr >= (loose ? 1.0 : 1.3))) return null;
        return { lo: lo, hi: hi, tp: tp, cl: cl, rr: rr, res: R, score: rr * 8 + Math.max(0, 2.5 - (price - R) / atr) * 2 };
    }
    /* Trendline: garis dari dua swing low terakhir yang makin tinggi (minimal 5 candle terpisah), garis belum jebol, harga dekat garis. */
    function tlCat(o, b, mode) {
        var h = o.h, l = o.l, c = o.c, n = c.length, loose = mode === 'longgar', i, p = [], atr = b.atr, price = b.price;
        for (i = Math.max(2, n - 62); i < n - 2; i++) if (l[i] <= l[i - 1] && l[i] <= l[i - 2] && l[i] <= l[i + 1] && l[i] <= l[i + 2]) p.push(i);
        if (p.length < 2) return null;
        var i2 = p[p.length - 1], i1 = p[p.length - 2];
        if (i2 - i1 < 5 || l[i2] - l[i1] < 0.6 * atr) return null;
        var sl = (l[i2] - l[i1]) / (i2 - i1), line = l[i2] + sl * (n - 1 - i2);
        for (i = i2 + 1; i < n; i++) if (c[i] < l[i2] + sl * (i - i2) - 0.5 * atr) return null;
        var d = (price - line) / atr;
        if (d < (loose ? -0.3 : -0.1) || d > (loose ? 3.5 : 2.5) || price < b.ma * (loose ? 0.985 : 0.995)) return null;
        var lv = levels(h, l, c, atr), tp = lv.res - price >= 1.5 * atr ? lv.res : price + 3 * atr;
        var lo = line, hi = line + 0.7 * atr, cl = Math.min(line - 0.8 * atr, l[i2] - 0.3 * atr), mid = (lo + hi) / 2, rr = (tp - mid) / (mid - cl);
        if (!(rr >= (loose ? 1.0 : 1.2)) || !(cl < lo)) return null;
        return { lo: lo, hi: hi, tp: tp, cl: cl, rr: rr, line: line, score: rr * 8 + Math.max(0, 2.5 - Math.abs(d)) * 2 };
    }
    /* Semua kategori untuk satu aset dari candle: {t, n, price, chg, cats:{bow,brk,tl}} (cats kosong kalau tidak ada yang lolos). */
    function analyzeAll(it, o, mode) {
        var c = o.c, h = o.h, l = o.l, n = c.length;
        var out = { t: it.k, n: it.n || '', price: it.price, chg: it.chg, cats: {} };
        if (n < 55) return out;
        var price = c[n - 1], i, sum = 0, tr = 0;
        for (i = n - 50; i < n; i++) sum += c[i];
        for (i = n - 14; i < n; i++) tr += Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
        var b = { price: price, ma: sum / 50, atr: tr / 14 };
        out.price = price; out.chg = (price / c[Math.max(0, n - 25)] - 1) * 100;
        if (!(b.atr > 0)) return out;
        var a = analyze(it, o, mode); if (a) out.cats.bow = a;
        var k = brkCat(o, b, mode); if (k) out.cats.brk = k;
        var t = tlCat(o, b, mode); if (t) out.cats.tl = t;
        return out;
    }
    /* IHSG: candle harian dari Worker (Yahoo .JK), pembulatan fraksi harga BEI. */
    function tkI(v) { return v < 200 ? 1 : v < 500 ? 2 : v < 2000 ? 5 : v < 5000 ? 10 : 25; }
    var RD_IDX = { up: function (v) { var t = tkI(v); return Math.ceil(v / t - 1e-9) * t; }, dn: function (v) { var t = tkI(v); return Math.floor(v / t + 1e-9) * t; }, step: tkI };
    function idxDaily(code) { return stat('idx', '1d', code).then(function (o) { return o || workerChart(code, false, '3mo', '1d', 55); }); }
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
                    .sort(function (a, b) { return b[1] * (b[8] || 0) - a[1] * (a[8] || 0); }).slice(0, 40).map(function (r) { return { k: r[0], n: r[10], s: r[0], price: r[1], chg: r[3] }; });
                return cand;
            });
        }
        function candles(it, tf) {
            return stat(market, tf, market === 'crypto' ? it.k : it.s).then(function (o) {
                if (o) return o;
                if (market === 'crypto') return viaOkx(it.k, tf).then(function (o2) { return o2 || viaBinance(it.k, tf); }).then(function (o2) { return o2 || viaWorker(it.s, tf); });
                return viaWorker(it.s, tf);
            });
        }
        /* run(tf, mode) -> Promise<{list, fail, total}> */
        function run(tf, mode) {
            return candidates().then(function (cs) {
                return pool(cs, function (it) { return candles(it, tf).then(function (o) { return o ? analyze(it, o, mode) : 'x'; }); }, 4).then(function (rs) {
                    return { list: rs.filter(function (x) { return x && x !== 'x'; }).sort(function (a, b) { return b.score - a.score; }), fail: rs.filter(function (x) { return x === 'x'; }).length, total: cs.length };
                });
            });
        }
        /* runAll(tf, mode, force) -> Promise<{assets, fail, total}>; candle mentah disimpan 60 dtk supaya ganti mode tidak mengambil ulang. */
        var raw = {};
        function loadRaw(tf, force) {
            var c = raw[tf]; if (c && !force && Date.now() - c.at < 60000) return Promise.resolve(c);
            return candidates().then(function (cs) { return pool(cs, function (it) { return candles(it, tf).then(function (o) { return { it: it, o: o }; }); }, 4); }).then(function (d) { return (raw[tf] = { at: Date.now(), data: d }); });
        }
        function runAll(tf, mode, force) {
            return loadRaw(tf, force).then(function (c) {
                var fail = 0, assets = c.data.map(function (r) {
                    if (!r.o) { fail++; return { t: r.it.k, n: r.it.n || '', price: r.it.price, chg: r.it.chg, cats: {}, nodata: true }; }
                    return analyzeAll(r.it, r.o, mode);
                });
                return { assets: assets, fail: fail, total: c.data.length };
            });
        }
        return { run: run, runAll: runAll };
    }
    var cache = {};
    window.EwoksPicksEngine = { forMarket: function (m) { return cache[m] || (cache[m] = make(m)); }, fmt: fmt, idxSmart: idxSmart, levels: levels, lastErr: function () { return lastErr; } };
})();
