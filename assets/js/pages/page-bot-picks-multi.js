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
    var tf = '1h', mode = 'ketat', N = 8, timer = null, busy = false, lastAt = 0, list = [], note = '';
    try { var s1 = localStorage.getItem('ewoks_bpm_tf'); if (TFS.some(function (t) { return t[0] === s1; })) tf = s1; if (localStorage.getItem('ewoks_bpm_mode') === 'longgar') mode = 'longgar'; } catch (_) {}
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function wib(ts) { return new Date(ts).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.') + ' WIB'; }
    var ENG = window.EwoksPicksEngine; if (!ENG) return;
    var fmtP = function (p, k) { return ENG.fmt(MARKET, p, k); };
    function refresh() {
        if (busy) return Promise.resolve();
        busy = true; paint(true);
        return ENG.forMarket(MARKET).run(tf, mode).then(function (r) {
            list = r.list;
            note = r.fail === r.total ? 'Data candle belum tersedia (cek koneksi atau Worker).' + (ENG.lastErr && ENG.lastErr() ? ' Detail: ' + ENG.lastErr() + '.' : '') : (r.fail > r.total / 2 ? 'Sebagian data candle belum tersedia.' : '');
            lastAt = Date.now();
            window.__ewoksPicks = window.__ewoksPicks || {}; window.__ewoksPicks[MARKET === 'crypto' ? 'kripto' : MARKET] = { list: list, tfLabel: TFS.filter(function (x) { return x[0] === tf; })[0][1], at: wib(lastAt) };
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
            '<button type="button" class="bp-add" data-add="' + esc(k) + '">+ Pantau</button> ' + (MARKET === 'global' ? '<a class="bp-l" href="global.html#saham-' + esc(k) + '">Lihat grafik ›</a>' : '') + '</div>';
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
        if (b.dataset.add) {
            var x = list.filter(function (i) { return i.t === b.dataset.add; })[0]; if (!x || typeof window.ewoksBowWatchAdd !== 'function') return;
            var r = window.ewoksBowWatchAdd({ t: x.t, mk: MARKET === 'crypto' ? 'kripto' : MARKET, price: x.price, bow: { lo: x.lo, hi: x.hi, tp: x.tp, cl: x.cl, rr: x.rr } });
            b.textContent = r === 'ok' ? 'Dipantau ✓' : r === 'dup' ? 'Sudah dipantau ✓' : 'Gagal'; b.disabled = true;
            if (typeof showToast === 'function') showToast(r === 'dup' ? x.t + ' sudah ada di Watchlist' : x.t + ' masuk Watchlist dengan level BoW', r === 'dup' ? 'warning' : 'success');
            return;
        }
        if (b.dataset.tf) { tf = b.dataset.tf; try { localStorage.setItem('ewoks_bpm_tf', tf); } catch (_) {} sched(); refresh(); }
        else if (b.dataset.m) { mode = b.dataset.m; try { localStorage.setItem('ewoks_bpm_mode', mode); } catch (_) {} refresh(); }
        else if (b.dataset.r) refresh();
    });
    document.addEventListener('visibilitychange', function () { var ms = TFS.filter(function (t) { return t[0] === tf; })[0][2]; if (!document.hidden && lastAt && Date.now() - lastAt > ms) refresh(); });
    paint(true); sched(); refresh();
})();
