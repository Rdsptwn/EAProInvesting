/* Rekomendasi Bot (Buy on Weakness) — dihitung otomatis di browser dari snapshot idx-screener.json.
   Aturan: tren naik (harga ≥ MA50), harga sedang koreksi dekat support 20 hari, ada ruang naik ke resist 20 hari, risk/reward ≥ 1,5.
   Hanya alat bantu edukasi, bukan ajakan beli/jual. */
(function () {
    'use strict';
    var box = document.getElementById('bot-picks');
    if (!box) return;
    var BASE = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    var V = encodeURIComponent(window.EWOKS_ASSET_V || '1');
    function get(n) { return fetch(BASE + 'assets/data/' + n + '?v=' + V).then(function (r) { if (!r.ok) throw new Error(n); return r.json(); }); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function tick(p) { return p < 200 ? 1 : p < 500 ? 2 : p < 2000 ? 5 : p < 5000 ? 10 : 25; }
    function rUp(p) { var t = tick(p); return Math.ceil(p / t - 1e-9) * t; }
    function rDn(p) { var t = tick(p); return Math.floor(p / t + 1e-9) * t; }
    function idr(n) { return Math.round(n).toLocaleString('id-ID'); }
    var N = 8, mode = 'ketat';

    function build(d, st) {
        var info = d.info || {}, items = (st && st.items) || {}, out = [], cutoff = Date.now() - 6 * 86400e3;
        d.rows.forEach(function (r) {
            var t = r[0], price = r[1], chg = r[3], sup = r[6], res = r[7], ma50 = r[8], vol = r[9], date = r[10];
            if (!(price >= 60) || !sup || !res || !ma50 || !date || new Date(date).getTime() < cutoff) return;
            var flags = (items[t] || []).map(function (x) { return x[0]; });
            if (flags.indexOf('SUSPEN') >= 0 || flags.indexOf('DELIST') >= 0 || flags.indexOf('PPK') >= 0 || flags.indexOf('UMA') >= 0) return;
            var board = info[t] && info[t][0]; if (board && /pemantauan khusus|pengembangan/i.test(board) && board !== 'Utama') return;
            if ((vol || 0) * price < 5e8) return; // likuiditas minimal ±Rp 500 jt/hari
            var loose = mode === 'longgar';
            var dist = (price - sup) / price * 100, room = (res - price) / price * 100;
            if (price < ma50 * (loose ? 0.96 : 0.99)) return;
            if (dist < -0.5 || dist > (loose ? 10 : 6.5)) return;
            if (room < (loose ? 5 : 8)) return;
            var lo = rUp(sup), hi = rUp(sup * 1.02), cl = rDn(sup * 0.97), tp = rDn(res);
            if (hi <= lo) hi = lo + tick(lo);
            var mid = (lo + hi) / 2, rr = (tp - mid) / (mid - cl);
            if (!(rr >= (loose ? 1.2 : 1.5)) || cl >= lo) return;
            var score = rr * 10 + Math.max(0, 6 - dist) * 2 + (chg != null && chg <= 0.5 ? 3 : 0) + Math.min(5, Math.log10((vol || 1) * price / 1e9));
            out.push({ t: t, n: r[11] || '', price: price, lo: lo, hi: hi, tp: tp, cl: cl, rr: rr, chg: chg, score: score, flags: flags, sy: board });
        });
        return out.sort(function (a, b) { return b.score - a.score; });
    }
    function card(x) {
        return '<div class="bp-card"><div class="bp-h"><b>' + esc(x.t) + '</b><span>Last Rp ' + idr(x.price) + '</span><i class="' + ((x.chg || 0) >= 0 ? 'u' : 'd') + '">' + ((x.chg || 0) >= 0 ? '+' : '') + (x.chg == null ? '0' : x.chg.toFixed(2)) + '%</i></div>' +
            '<div class="bp-r"><span>Area BoW</span><b>' + idr(x.lo) + ' - ' + idr(x.hi) + '</b></div>' +
            '<div class="bp-r"><span>TP Terdekat</span><b class="g">' + idr(x.tp) + '</b></div>' +
            '<div class="bp-r"><span>Strict CL (jebol)</span><b class="r">' + idr(x.cl) + '</b></div>' +
            '<p class="bp-n">Jika mulai lemes/kejedot di ' + idr(x.tp) + ', aktifkan trailing stop &amp; amankan cuan. R/R ±' + x.rr.toFixed(1) + '</p>' +
            '<button type="button" class="bp-add" data-add="' + esc(x.t) + '">+ Pantau</button> <a class="bp-l" href="?t=' + esc(x.t) + '#chart" onclick="try{tpPickTicker&&tpPickTicker(\'' + esc(x.t) + '\')}catch(e){}">Lihat grafik ›</a></div>';
    }
    function copyText(list) {
        return 'Rekomendasi Bot BoW (edukasi, bukan ajakan beli/jual)\n' + list.map(function (x) { return x.t + ' | Last ' + idr(x.price) + ' | Area BoW ' + idr(x.lo) + '-' + idr(x.hi) + ' | TP ' + idr(x.tp) + ' | CL ' + idr(x.cl); }).join('\n');
    }
    var D = null, S = null, list = [];
    // Simpan ke Watchlist dengan level BoW; Watchlist menampilkan naik/turun & status area/TP/CL.
    function addWatch(t, btn) {
        var x = list.filter(function (i) { return i.t === t; })[0]; if (!x || typeof watchlist === 'undefined') return;
        if (watchlist.some(function (w) { return w.ticker === t; })) { if (typeof showToast === 'function') showToast(t + ' sudah ada di Watchlist', 'warning'); btn.textContent = 'Sudah dipantau ✓'; return; }
        watchlist.push({ id: Date.now(), ticker: t, price: String(x.hi), note: 'Dari Bot BoW · R/R ±' + x.rr.toFixed(1), foreign: '', bow: { lo: x.lo, hi: x.hi, tp: x.tp, cl: x.cl, ref: x.price, date: (D.rows.filter(function (r) { return r[0] === t; })[0] || [])[10] || '' } });
        try { localStorage.setItem('ewoks_watchlist', JSON.stringify(watchlist)); } catch (e) {}
        if (typeof renderWatchlist === 'function') renderWatchlist();
        if (typeof showToast === 'function') showToast(t + ' masuk Watchlist dengan level BoW', 'success');
        btn.textContent = 'Dipantau ✓';
    }
    function loadEng() {
        if (window.EwoksPicksEngine) return Promise.resolve(window.EwoksPicksEngine);
        return new Promise(function (res) { var sc = document.createElement('script'); sc.src = BASE + 'assets/js/picks-engine.js?v=' + V; sc.onload = function () { res(window.EwoksPicksEngine || null); }; sc.onerror = function () { res(null); }; document.head.appendChild(sc); });
    }
    // Level dari candle harian (swing support/resist + ATR) lewat Worker; kalau tidak tersedia tetap pakai level kasar dari snapshot.
    var SM = {};
    function refine(rough, key) {
        if (SM[key]) return Promise.resolve(SM[key]);
        return loadEng().then(function (E) {
            if (!E || !E.idxSmart) return null; var top = rough.slice(0, 18);
            return E.idxSmart(top.map(function (x) { return { k: x.t }; }), key).then(function (r) {
                if (!r.avail) return null; var out = [];
                top.forEach(function (x) { var a = r.map[x.t]; if (a) { a.chg = x.chg; a.price = x.price; out.push(a); } });
                out.sort(function (a, b) { return b.score - a.score; }); SM[key] = out; return out;
            });
        }).catch(function () { return null; });
    }
    var status = '';
    function paint() {
        var key = mode, rough = build(D, S); list = rough; status = rough.length ? 'Menghitung level dari candle…' : '';
        draw();
        if (!rough.length) return;
        refine(rough, key).then(function (sl) {
            if (key !== mode) return;
            if (sl) { list = sl; status = 'Level dari candle harian (swing support/resist + ATR).'; } else status = 'Level kasar dari support/resist 20 hari (candle belum tersedia).';
            draw();
        });
    }
    function draw() {
        var top = list.slice(0, N);
        var when = D.meta && D.meta.built ? new Date(D.meta.built).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB' : '';
        box.innerHTML = '<div class="bp-wrap"><div class="bp-top"><div><h2>Rekomendasi Bot · Buy on Weakness</h2><p>' + (top.length ? list.length + ' saham lolos saringan; tampil ' + top.length + ' teratas. ' + status : 'Belum ada saham yang memenuhi syarat saat ini.') + ' Data ' + esc(when) + '</p></div>' +
            '<div class="bp-btn"><button type="button" data-m="ketat" class="' + (mode === 'ketat' ? 'on' : '') + '">Ketat</button><button type="button" data-m="longgar" class="' + (mode === 'longgar' ? 'on' : '') + '">Longgar</button><button type="button" id="bp-copy">Salin</button></div></div>' +
            '<div class="bp-grid">' + top.map(card).join('') + '</div>' +
            '<p class="bp-d">DISCLAIMER: hasil screener otomatis dari harga penutupan, bukan ajakan beli/jual. Tren naik = harga ≥ MA50; area BoW = zona di atas swing support (dari candle); TP = swing resist terdekat; CL = di bawah support sejauh ±0,8 ATR. Lakukan analisa sendiri &amp; manage risk.</p></div>';
        box.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { mode = b.dataset.m; paint(); }; });
        box.querySelectorAll('[data-add]').forEach(function (b) { b.onclick = function () { addWatch(b.dataset.add, b); }; });
        var c = document.getElementById('bp-copy'); if (c) c.onclick = function () { try { navigator.clipboard.writeText(copyText(top)); c.textContent = 'Tersalin ✓'; } catch (e) { c.textContent = 'Gagal'; } };
    }
    Promise.all([get('idx-screener.json'), get('idx-status.json').catch(function () { return null; })]).then(function (r) { D = r[0]; S = r[1]; if (build(D, S).length < 4) mode = 'longgar'; paint(); })
        .catch(function () { box.innerHTML = ''; });
})();
