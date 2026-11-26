/* Rekomendasi Bot untuk Saham Global, Kripto, dan Forex — empat kategori seperti IHSG:
   Buy on Weakness, Breakout Resist, Trendline, Rumor / Berita. Aset yang lolos lebih dari satu kategori digabung jadi satu kartu.
   Dihitung di browser dari candle pada timeframe pilihan (5 menit / 1 jam / 4 jam). Sumber candle: file statis (GitHub Actions), lalu OKX/Binance (kripto) atau Worker /chart (Yahoo).
   Rumor / Berita = kode atau nama aset disebut di judul berita 72 jam terakhir (global-news.json), belum terverifikasi.
   Alat bantu edukasi, bukan ajakan beli/jual. */
(function () {
    'use strict';
    var box = document.getElementById('bot-picks-multi');
    if (!box) return;
    var MARKET = box.getAttribute('data-market') || 'global';
    var BASE = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    var V = encodeURIComponent(window.EWOKS_ASSET_V || '1');
    var TFS = [['5m', '5 menit', 300000], ['1h', '1 jam', 3600000], ['4h', '4 jam', 14400000]];
    var CATS = [['all', 'Semua'], ['bow', 'Buy on Weakness'], ['brk', 'Breakout Resist'], ['tl', 'Trendline'], ['rum', 'Rumor / Berita']];
    var LBL = { bow: 'Buy on Weakness', brk: 'Breakout Resist', tl: 'Trendline naik', rum: 'Rumor / Berita' };
    var N = 12;
    var tf = '1h', mode = 'ketat', cat = 'all', timer = null, busy = false, lastAt = 0, assets = [], cards = [], note = '', NEWS = null, firstRun = true;
    try { var s1 = localStorage.getItem('ewoks_bpm_tf'); if (TFS.some(function (t) { return t[0] === s1; })) tf = s1; if (localStorage.getItem('ewoks_bpm_mode') === 'longgar') mode = 'longgar'; } catch (_) {}
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function wib(ts) { return new Date(ts).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.') + ' WIB'; }
    function tfo() { return TFS.filter(function (t) { return t[0] === tf; })[0]; }
    var ENG = window.EwoksPicksEngine; if (!ENG) return;
    var fmtP = function (p, k) { return ENG.fmt(MARKET, p, k); };
    var pre = MARKET === 'forex' ? '' : '$';
    var mkKey = MARKET === 'crypto' ? 'kripto' : MARKET;

    /* ---------- Rumor / Berita ---------- */
    var CUR = { EUR: /\b(euro|ECB)\b/i, GBP: /\b(sterling|pound|BoE|Bank of England)\b/i, JPY: /\b(yen|BoJ)\b/i, AUD: /\b(aussie|RBA)\b/i, NZD: /\b(kiwi|RBNZ)\b/i, CAD: /\b(loonie|Bank of Canada)\b/i, CHF: /\b(Swiss franc|SNB)\b/i, IDR: /rupiah|\bBI Rate\b/i, CNY: /\b(yuan|renminbi)\b/i, TRY: /\blira\b/i, INR: /\brupee\b/i, MXN: /\bpeso\b/i, ZAR: /\brand\b/i, MYR: /ringgit/i, THB: /\bbaht\b/i, XAU: /\bgold\b|\bemas\b/i, XAG: /\bsilver\b|\bperak\b/i };
    var STOP = /^(First|United|American|General|National|Global|International|Western|Public|Texas|Union|Bank|Group|Holdings|Energy|Capital|Financial|Digital|Class|Series|Common|Applied|New|Old|North|South|East|West|Life|Health|Home|Core|Prime|Pacific|Atlantic|Direct)$/;
    function rxEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function matcher(a) {
        var k = a.t;
        if (MARKET === 'forex') {
            var rx = [k.slice(0, 3), k.slice(3, 6)].filter(function (c) { return CUR[c]; }).map(function (c) { return CUR[c]; });
            return rx.length ? function (txt) { return rx.some(function (r) { return r.test(txt); }); } : null;
        }
        var parts = [];
        if (k.length >= (MARKET === 'global' ? 3 : 2)) parts.push(new RegExp('\\b' + rxEsc(k) + '\\b'));
        var nm = String(a.n || '').replace(/\s*(Inc\.?|Corp\.?|Corporation|Ltd\.?|Holdings?|Co\.?|Company|plc|N\.V\.|S\.A\.|Group)\s*$/i, '').trim();
        var w = nm.split(/\s+/)[0] || '';
        if (MARKET === 'crypto' && nm.length >= 4) parts.push(new RegExp('\\b' + rxEsc(nm) + '\\b', 'i'));
        else if (MARKET === 'global' && /^[A-Z][A-Za-z]{4,}$/.test(w) && !STOP.test(w)) parts.push(new RegExp('\\b' + rxEsc(w) + '\\b', w === w.toUpperCase() ? 'i' : ''));
        return parts.length ? function (txt) { return parts.some(function (r) { return r.test(txt); }); } : null;
    }
    function rumors(list) {
        var out = {}, items = (NEWS && NEWS.items) || [], cutoff = Date.now() - 72 * 36e5;
        list.forEach(function (a) {
            var m = matcher(a); if (!m) return;
            for (var i = 0; i < items.length; i++) {
                var it = items[i]; if (Date.parse(it.ts) < cutoff) continue;
                if (m(String(it.title) + ' ' + String(it.desc || ''))) { out[a.t] = { news: it, score: 5 }; return; }
            }
        });
        return out;
    }

    /* ---------- gabung per aset ---------- */
    function merge() {
        var ru = rumors(assets);
        var out = [];
        assets.forEach(function (a) {
            var cats = {}, ks;
            ['bow', 'tl', 'brk'].forEach(function (k) { if (a.cats[k]) cats[k] = a.cats[k]; });
            if (ru[a.t]) cats.rum = ru[a.t];
            ks = Object.keys(cats); if (!ks.length) return;
            var c = { t: a.t, n: a.n, price: a.price, chg: a.chg, cats: cats, nk: ks.length };
            c.lv = cats.bow || cats.tl || cats.brk || null;
            c.score = ks.reduce(function (s, k) { return s + cats[k].score; }, 0) + (ks.length - 1) * 6;
            out.push(c);
        });
        return out;
    }
    function why(c) {
        var o = [], k = c.cats;
        if (k.bow) o.push('Koreksi dekat support dalam tren naik (di atas MA50).');
        if (k.tl) o.push('Pantul garis tren naik di ±' + fmtP(k.tl.line, c.t) + ' (dua swing low makin tinggi, garis belum jebol).');
        if (k.brk) o.push('Harga di/atas resist ±' + fmtP(k.brk.res, c.t) + ' (high 40 candle).');
        return o;
    }
    function card(c) {
        var up = (c.chg || 0) >= 0, v = c.lv, k = c.cats, t = c.t;
        var chips = Object.keys(k).map(function (x) { return '<span class="bp-chip bp-c-' + x + '">' + LBL[x] + '</span>'; }).join('');
        var h = '<div class="bp-card' + (c.nk > 1 ? ' multi' : '') + '"><div class="bp-h"><b>' + esc(t) + '</b><span>Last ' + pre + fmtP(c.price, t) + '</span><i class="' + (up ? 'u' : 'd') + '">' + (up ? '+' : '') + (c.chg == null ? '0' : c.chg.toFixed(1)) + '%</i></div>' +
            (c.n && c.n !== t ? '<div class="bp-nm">' + esc(c.n) + '</div>' : '') + '<div class="bp-chips">' + chips + (c.nk > 1 ? '<span class="bp-chip bp-c-x">' + c.nk + ' sinyal sejalan</span>' : '') + '</div>';
        if (v) {
            h += '<div class="bp-r"><span>Area beli</span><b>' + fmtP(v.lo, t) + ' - ' + fmtP(v.hi, t) + '</b></div><div class="bp-r"><span>TP terdekat</span><b class="g">' + fmtP(v.tp, t) + '</b></div><div class="bp-r"><span>Strict CL (jebol)</span><b class="r">' + fmtP(v.cl, t) + '</b></div>' +
                '<p class="bp-n">' + why(c).join(' ') + ' R/R ±' + v.rr.toFixed(1) + '. Kalau mulai lemas di dekat TP, pertimbangkan trailing stop.</p>';
        }
        if (k.rum) h += '<p class="bp-nw">Berita: <a href="' + esc(k.rum.news.link) + '" target="_blank" rel="noopener noreferrer">' + esc(k.rum.news.title) + '</a> <em>(' + esc(k.rum.news.src) + ')</em>' + (v ? '' : '<br>Belum ada level: ini baru sebutan di berita, bukan sinyal harga. Cek sumber resminya dulu.') + '</p>';
        h += (v ? '<button type="button" class="bp-add" data-add="' + esc(t) + '">+ Pantau</button> ' : '') + (MARKET === 'global' ? '<a class="bp-l" href="global.html#saham-' + esc(t) + '">Lihat grafik ›</a>' : '') + '</div>';
        return h;
    }
    function view() {
        var list = cards.filter(function (c) { return cat === 'all' || c.cats[cat]; });
        list.sort(function (a, b) { return cat === 'all' ? (b.nk - a.nk) || (b.score - a.score) : (b.cats[cat].score - a.cats[cat].score); });
        return list;
    }
    function copyText(list) {
        return 'Rekomendasi Bot ' + { global: 'Saham Global', crypto: 'Kripto', forex: 'Forex' }[MARKET] + ' · ' + tfo()[1] + ' (edukasi, bukan ajakan beli/jual)\n' + list.map(function (c) {
            var v = c.lv; return c.t + ' | ' + Object.keys(c.cats).map(function (k) { return LBL[k]; }).join(' + ') + ' | Last ' + pre + fmtP(c.price, c.t) + (v ? ' | Area ' + fmtP(v.lo, c.t) + '-' + fmtP(v.hi, c.t) + ' | TP ' + fmtP(v.tp, c.t) + ' | CL ' + fmtP(v.cl, c.t) : '');
        }).join('\n');
    }
    function paint(loading) {
        var list = view(), top = list.slice(0, N), tfl = tfo();
        var title = { global: 'Saham Global', crypto: 'Kripto', forex: 'Forex' }[MARKET];
        var empty = cat === 'rum' ? 'Belum ada ' + (MARKET === 'forex' ? 'mata uang' : 'aset') + ' di daftar ini yang disebut di judul berita 72 jam terakhir.' : 'Belum ada aset yang memenuhi syarat' + (cat === 'all' ? '' : ' kategori ini') + ' saat ini. Coba mode Longgar atau timeframe lain.';
        var sub = loading ? 'Menghitung dari candle ' + tfl[1] + '…' : (lastAt ? (top.length ? list.length + ' aset' + (cat === 'all' ? ' lolos minimal satu kategori' : ' di kategori ini') + '; tampil ' + top.length + ' teratas. ' : empty + ' ') + 'Diperbarui ' + wib(lastAt) + ', otomatis tiap ' + tfl[1] + '.' : '');
        var tabs = CATS.map(function (c) {
            var n = c[0] === 'all' ? cards.length : cards.filter(function (x) { return x.cats[c[0]]; }).length;
            return '<button type="button" data-c="' + c[0] + '" class="' + (cat === c[0] ? 'on' : '') + '">' + c[1] + ' <em>' + n + '</em></button>';
        }).join('');
        box.innerHTML = '<div class="bp-wrap"><div class="bp-top"><div><h2>Rekomendasi Bot · ' + title + '</h2><p>' + esc(sub) + (note ? ' ' + esc(note) : '') + '</p></div>' +
            '<div class="bp-btn">' + TFS.map(function (t) { return '<button type="button" data-tf="' + t[0] + '" class="' + (t[0] === tf ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') +
            '<button type="button" data-m="ketat" class="' + (mode === 'ketat' ? 'on' : '') + '">Ketat</button><button type="button" data-m="longgar" class="' + (mode === 'longgar' ? 'on' : '') + '">Longgar</button>' +
            '<button type="button" data-r="1">Segarkan</button><button type="button" id="bpm-copy">Salin</button></div></div>' +
            '<div class="bp-tabs">' + tabs + '</div>' +
            '<div class="bp-grid">' + (top.length ? top.map(card).join('') : (loading ? '' : '<p class="bp-n" style="grid-column:1/-1">' + esc(empty) + '</p>')) + '</div>' +
            '<p class="bp-d">DISCLAIMER: hasil screener otomatis dari candle ' + tfl[1] + ', bukan ajakan beli/jual. Tren naik = harga ≥ MA50; Buy on Weakness = koreksi dekat support swing; Breakout = harga di dekat/atas high 40 candle; Trendline = garis dari dua swing low terakhir; Rumor/Berita hanya sebutan di judul berita, belum terverifikasi. TP = resist terdekat, CL = di bawah area beli (ukuran berdasarkan ATR). Hanya posisi beli (long). Selalu pakai manajemen risiko.</p></div>';
    }
    function refresh(force) {
        if (busy) return Promise.resolve();
        busy = true; paint(true);
        var m = mode;
        return ENG.forMarket(MARKET).runAll(tf, m, force).then(function (r) {
            assets = r.assets; cards = merge();
            if (firstRun && cards.length < 6 && m === 'ketat' && r.fail < r.total) { firstRun = false; mode = 'longgar'; return ENG.forMarket(MARKET).runAll(tf, 'longgar').then(function (r2) { assets = r2.assets; cards = merge(); return r2; }); }
            firstRun = false; return r;
        }).then(function (r) {
            note = r.fail === r.total ? 'Data candle belum tersedia (cek koneksi atau Worker).' + (ENG.lastErr && ENG.lastErr() ? ' Detail: ' + ENG.lastErr() + '.' : '') : (r.fail > r.total / 2 ? 'Sebagian data candle belum tersedia.' : '');
            lastAt = Date.now();
            window.__ewoksPicks = window.__ewoksPicks || {};
            window.__ewoksPicks[mkKey] = { list: cards.filter(function (c) { return c.lv; }).map(function (c) { var v = c.lv; return { t: c.t, price: c.price, chg: c.chg, lo: v.lo, hi: v.hi, tp: v.tp, cl: v.cl, rr: v.rr }; }), tfLabel: tfo()[1], at: wib(lastAt) };
        }).catch(function () { note = 'Gagal memuat data.'; }).then(function () { busy = false; paint(false); });
    }
    function sched() { clearInterval(timer); timer = setInterval(function () { if (!document.hidden) refresh(true); }, tfo()[2]); }
    box.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.add) {
            var c = cards.filter(function (i) { return i.t === b.dataset.add; })[0], x = c && c.lv; if (!x || typeof window.ewoksBowWatchAdd !== 'function') return;
            var r = window.ewoksBowWatchAdd({ t: c.t, mk: mkKey, price: c.price, bow: { lo: x.lo, hi: x.hi, tp: x.tp, cl: x.cl, rr: x.rr } });
            b.textContent = r === 'ok' ? 'Dipantau ✓' : r === 'dup' ? 'Sudah dipantau ✓' : 'Gagal'; b.disabled = true;
            if (typeof showToast === 'function') showToast(r === 'dup' ? c.t + ' sudah ada di Watchlist' : c.t + ' masuk Watchlist dengan level', r === 'dup' ? 'warning' : 'success');
            return;
        }
        if (b.id === 'bpm-copy') { try { navigator.clipboard.writeText(copyText(view().slice(0, N))); b.textContent = 'Tersalin ✓'; } catch (_) { b.textContent = 'Gagal'; } return; }
        if (b.dataset.c) { cat = b.dataset.c; paint(false); return; }
        if (b.dataset.tf) { tf = b.dataset.tf; try { localStorage.setItem('ewoks_bpm_tf', tf); } catch (_) {} sched(); refresh(false); }
        else if (b.dataset.m) { mode = b.dataset.m; try { localStorage.setItem('ewoks_bpm_mode', mode); } catch (_) {} refresh(false); }
        else if (b.dataset.r) refresh(true);
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && lastAt && Date.now() - lastAt > tfo()[2]) refresh(true); });
    paint(true); sched();
    fetch(BASE + 'assets/data/global-news.json?v=' + V).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) { NEWS = d; return refresh(false); });
})();
