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
            if (flags.indexOf('SUSPEN') >= 0 || flags.indexOf('PPK') >= 0 || flags.indexOf('UMA') >= 0) return;
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
            '<a class="bp-l" href="?t=' + esc(x.t) + '#chart" onclick="try{tpPickTicker&&tpPickTicker(\'' + esc(x.t) + '\')}catch(e){}">Lihat grafik ›</a></div>';
    }
    function copyText(list) {
        return 'Rekomendasi Bot BoW (edukasi, bukan ajakan beli/jual)\n' + list.map(function (x) { return x.t + ' | Last ' + idr(x.price) + ' | Area BoW ' + idr(x.lo) + '-' + idr(x.hi) + ' | TP ' + idr(x.tp) + ' | CL ' + idr(x.cl); }).join('\n');
    }
    var D = null, S = null, list = [];
    function paint() {
        list = build(D, S);
        var top = list.slice(0, N);
        var when = D.meta && D.meta.built ? new Date(D.meta.built).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB' : '';
        box.innerHTML = '<div class="bp-wrap"><div class="bp-top"><div><h2>Rekomendasi Bot · Buy on Weakness</h2><p>' + (top.length ? list.length + ' saham lolos saringan; tampil ' + top.length + ' teratas.' : 'Belum ada saham yang memenuhi syarat saat ini.') + ' Data ' + esc(when) + '</p></div>' +
            '<div class="bp-btn"><button type="button" data-m="ketat" class="' + (mode === 'ketat' ? 'on' : '') + '">Ketat</button><button type="button" data-m="longgar" class="' + (mode === 'longgar' ? 'on' : '') + '">Longgar</button><button type="button" id="bp-copy">Salin</button></div></div>' +
            '<div class="bp-grid">' + top.map(card).join('') + '</div>' +
            '<p class="bp-d">DISCLAIMER: hasil screener otomatis dari harga penutupan, bukan ajakan beli/jual. Tren naik = harga ≥ MA50; area BoW = sekitar support 20 hari; TP = resist 20 hari; CL = di bawah support. Lakukan analisa sendiri &amp; manage risk.</p></div>';
        box.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { mode = b.dataset.m; paint(); }; });
        var c = document.getElementById('bp-copy'); if (c) c.onclick = function () { try { navigator.clipboard.writeText(copyText(top)); c.textContent = 'Tersalin ✓'; } catch (e) { c.textContent = 'Gagal'; } };
    }
    Promise.all([get('idx-screener.json'), get('idx-status.json').catch(function () { return null; })]).then(function (r) { D = r[0]; S = r[1]; if (build(D, S).length < 4) mode = 'longgar'; paint(); })
        .catch(function () { box.innerHTML = ''; });
})();
