/* Rekomendasi Bot (Buy on Weakness) untuk Saham Global, Kripto, dan Forex.
   Dihitung di browser dari candle intraday pada timeframe pilihan (5 menit / 1 jam / 4 jam) dan diperbarui sesuai timeframe itu.
   Sumber: Binance (kripto), Worker /chart (Yahoo; saham global & forex). Alat bantu edukasi, bukan ajakan beli/jual. */
(function () {
    'use strict';
    var box = document.getElementById('bot-picks-multi');
    if (!box) return;
    var MARKET = box.getAttribute('data-market') || 'global';
    var BASE = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    var V = encodeURIComponent(window.EWOKS_ASSET_V || '1');
    var API = (typeof getEwoksLiveApi === 'function' ? getEwoksLiveApi() : '') || '';
    var TFS = [['5m', '5 menit', 300000], ['1h', '1 jam', 3600000], ['4h', '4 jam', 14400000]];
    var tf = '1h', mode = 'ketat', N = 8, timer = null, busy = false, lastAt = 0, list = [], note = '', cand = null;
    try { var s1 = localStorage.getItem('ewoks_bpm_tf'); if (TFS.some(function (t) { return t[0] === s1; })) tf = s1; if (localStorage.getItem('ewoks_bpm_mode') === 'longgar') mode = 'longgar'; } catch (_) {}
    function get(n) { return fetch(BASE + 'assets/data/' + n + '?v=' + V).then(function (r) { if (!r.ok) throw new Error(n); return r.json(); }); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function wib(ts) { return new Date(ts).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.') + ' WIB'; }
    function dec(p, k) { if (MARKET === 'forex') return /JPY|IDR|KRW|INR|XAU|XAG/.test(k || '') ? 3 : 5; return p >= 1000 ? 2 : p >= 1 ? 3 : p >= 0.01 ? 5 : 8; }
    function fmtP(p, k) { return Number(p).toLocaleString('en-US', { minimumFractionDigits: dec(p, k), maximumFractionDigits: dec(p, k) }); }
    var STABLE = /^(USDT|USDC|DAI|FDUSD|TUSD|USDE|USDD|USDS|PYUSD|STETH|WBTC|WETH)$/;

    function agg4(h, l, c) {
        var H = [], L = [], C = [];
        for (var i = 0; i + 3 < c.length; i += 4) { H.push(Math.max.apply(null, h.slice(i, i + 4))); L.push(Math.min.apply(null, l.slice(i, i + 4))); C.push(c[i + 3]); }
        return { h: H, l: L, c: C };
    }
    function viaWorker(sym) {
        if (!API) return Promise.resolve(null);
        var rg = tf === '5m' ? '5d' : tf === '1h' ? '1mo' : '3mo', iv = tf === '5m' ? '5m' : '60m';
        return fetch(API + '/chart?s=' + encodeURIComponent(sym) + '&g=1&range=' + rg + '&interval=' + iv, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
            if (!d || !d.ok || !d.c || d.c.length < 30) return null;
            var o = { h: d.h, l: d.l, c: d.c };
            if (tf === '4h') o = agg4(o.h, o.l, o.c);
            return o;
        }).catch(function () { return null; });
    }
    function viaBinance(k) {
        return fetch('https://api.binance.com/api/v3/klines?symbol=' + encodeURIComponent(k) + 'USDT&interval=' + tf + '&limit=120').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (a) {
            return { h: a.map(function (x) { return +x[2]; }), l: a.map(function (x) { return +x[3]; }), c: a.map(function (x) { return +x[4]; }) };
        }).catch(function () { return null; });
    }
    function candles(it) {
        if (MARKET === 'crypto') return viaBinance(it.k).then(function (o) { return o || viaWorker(it.s); });
        return viaWorker(it.s);
    }
    function analyze(it, o) {
        var c = o.c, h = o.h, l = o.l, n = c.length; if (n < 55) return null;
        var price = c[n - 1], i, sum = 0, tr = 0;
        for (i = n - 50; i < n; i++) sum += c[i]; var ma = sum / 50;
        for (i = n - 14; i < n; i++) tr += Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
        var atr = tr / 14; if (!(atr > 0)) return null;
        var sup = Infinity, res = -Infinity; for (i = n - 21; i < n - 1; i++) { sup = Math.min(sup, l[i]); res = Math.max(res, h[i]); }
        var loose = mode === 'longgar';
        if (price < ma * (loose ? 0.99 : 0.998)) return null;                 // tren naik: harga di atas MA50
        var dist = price - sup; if (dist < -0.3 * atr || dist > (loose ? 5 : 3.5) * atr) return null;   // sedang koreksi dekat support
        if (res - price < (loose ? 2.5 : 3.5) * atr) return null;             // masih ada ruang naik
        var lo = sup, hi = sup + 0.8 * atr, cl = sup - 0.6 * atr, tp = res, mid = (lo + hi) / 2, rr = (tp - mid) / (mid - cl);
        if (!(rr >= (loose ? 1.2 : 1.5))) return null;
        var chg = (price / c[Math.max(0, n - 25)] - 1) * 100;
        return { t: it.k, n: it.n || '', price: price, lo: lo, hi: hi, tp: tp, cl: cl, rr: rr, chg: chg, score: rr * 10 + Math.max(0, 4 - dist / atr) * 3 };
    }
    function candidates() {
        if (cand) return Promise.resolve(cand);
        if (MARKET === 'crypto') return get('crypto.json').then(function (d) { cand = d.items.filter(function (x) { return !STABLE.test(x.k); }).slice(0, 50); return cand; });
        if (MARKET === 'forex') return get('forex.json').then(function (d) { cand = d.items.filter(function (x) { return x.k !== 'DXY' && x.s; }); return cand; });
        return get('global-screener.json').then(function (d) {
            cand = d.rows.filter(function (r) { return r[1] >= 5 && /^[A-Z]{1,5}$/.test(r[0]); })
                .sort(function (a, b) { return b[1] * (b[8] || 0) - a[1] * (a[8] || 0); }).slice(0, 40).map(function (r) { return { k: r[0], n: r[10], s: r[0] }; });
            return cand;
        });
    }
    function pool(items, fn, conc) {
        var out = new Array(items.length), idx = 0;
        return Promise.all(Array.from({ length: Math.min(conc, items.length) }, function () {
            return (function next() { var i = idx++; if (i >= items.length) return Promise.resolve(); return fn(items[i]).then(function (r) { out[i] = r; }).then(next); })();
        })).then(function () { return out; });
    }
    function refresh() {
        if (busy) return Promise.resolve();
        busy = true; paint(true);
        return candidates().then(function (cs) {
            return pool(cs, function (it) { return candles(it).then(function (o) { return o ? analyze(it, o) : 'x'; }); }, 6).then(function (rs) {
                var fail = rs.filter(function (x) { return x === 'x'; }).length;
                list = rs.filter(function (x) { return x && x !== 'x'; }).sort(function (a, b) { return b.score - a.score; });
                note = fail === cs.length ? 'Data candle belum tersedia (cek koneksi atau Worker).' : (fail > cs.length / 2 ? 'Sebagian data candle belum tersedia.' : '');
                lastAt = Date.now();
                window.__ewoksPicks = window.__ewoksPicks || {}; window.__ewoksPicks[MARKET === 'crypto' ? 'kripto' : MARKET] = { list: list, tfLabel: TFS.filter(function (x) { return x[0] === tf; })[0][1], at: wib(lastAt) };
            });
        }).catch(function () { note = 'Gagal memuat data.'; }).then(function () { busy = false; paint(false); });
    }
    function sched() { clearInterval(timer); var ms = TFS.filter(function (t) { return t[0] === tf; })[0][2]; timer = setInterval(function () { if (!document.hidden) refresh(); }, ms); }
    function card(x) {
        var up = x.chg >= 0, pre = MARKET === 'forex' ? '' : '$', k = x.t;
        return '<div class="bp-card"><div class="bp-h"><b>' + esc(k) + '</b><span>Last ' + pre + fmtP(x.price, k) + '</span><i class="' + (up ? 'u' : 'd') + '">' + (up ? '+' : '') + x.chg.toFixed(1) + '%</i></div>' +
            '<div class="bp-r"><span>Area BoW</span><b>' + fmtP(x.lo, k) + ' - ' + fmtP(x.hi, k) + '</b></div>' +
            '<div class="bp-r"><span>TP Terdekat</span><b class="g">' + fmtP(x.tp, k) + '</b></div>' +
            '<div class="bp-r"><span>Strict CL (jebol)</span><b class="r">' + fmtP(x.cl, k) + '</b></div>' +
            '<p class="bp-n">Jika mulai lemes/kejedot di ' + fmtP(x.tp, k) + ', aktifkan trailing stop &amp; amankan cuan. R/R ±' + x.rr.toFixed(1) + '</p>' +
            (MARKET === 'global' ? '<a class="bp-l" href="global.html#saham-' + esc(k) + '">Lihat grafik ›</a>' : '') + '</div>';
    }
    function paint(loading) {
        var top = list.slice(0, N), tfl = TFS.filter(function (t) { return t[0] === tf; })[0];
        var title = { global: 'Saham Global', crypto: 'Kripto', forex: 'Forex' }[MARKET];
        var sub = loading ? 'Menghitung dari candle ' + tfl[1] + '…' : (lastAt ? (top.length ? list.length + ' aset lolos saringan; tampil ' + top.length + '. ' : 'Belum ada yang lolos saringan saat ini. ') + 'Diperbarui ' + wib(lastAt) + ', otomatis tiap ' + tfl[1] + '.' : '');
        box.innerHTML = '<div class="bp-wrap"><div class="bp-top"><div><h2>Rekomendasi Bot · ' + title + ' · Buy on Weakness</h2><p>' + esc(sub) + (note ? ' ' + esc(note) : '') + '</p></div>' +
            '<div class="bp-btn">' + TFS.map(function (t) { return '<button type="button" data-tf="' + t[0] + '" class="' + (t[0] === tf ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') +
            '<button type="button" data-m="ketat" class="' + (mode === 'ketat' ? 'on' : '') + '">Ketat</button><button type="button" data-m="longgar" class="' + (mode === 'longgar' ? 'on' : '') + '">Longgar</button>' +
            '<button type="button" data-r="1">Segarkan</button></div></div>' +
            '<div class="bp-grid">' + (top.length ? top.map(card).join('') : (loading ? '' : '<p class="bp-n" style="grid-column:1/-1">Coba mode Longgar atau timeframe lain.</p>')) + '</div>' +
            '<p class="bp-d">DISCLAIMER: hasil screener otomatis dari candle ' + tfl[1] + ', bukan ajakan beli/jual. Tren naik = harga ≥ MA50; area BoW = sekitar support 20 candle; TP = resist 20 candle; CL = sedikit di bawah support (ukuran berdasarkan ATR). Hanya posisi beli (long). Selalu pakai manajemen risiko.</p></div>';
    }
    box.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.tf) { tf = b.dataset.tf; try { localStorage.setItem('ewoks_bpm_tf', tf); } catch (_) {} sched(); refresh(); }
        else if (b.dataset.m) { mode = b.dataset.m; try { localStorage.setItem('ewoks_bpm_mode', mode); } catch (_) {} refresh(); }
        else if (b.dataset.r) refresh();
    });
    document.addEventListener('visibilitychange', function () { var ms = TFS.filter(function (t) { return t[0] === tf; })[0][2]; if (!document.hidden && lastAt && Date.now() - lastAt > ms) refresh(); });
    paint(true); sched(); refresh();
})();
