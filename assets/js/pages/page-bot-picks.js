/* Rekomendasi Bot IHSG — empat kategori, dihitung otomatis di browser dari data statis (tanpa Worker):
   - Buy on Weakness : tren naik (harga >= MA50), koreksi dekat support, ada ruang ke resist, R/R >= 1,5.
   - Breakout Resist : harga di atas/dekat resist (>= 98%) dan belum terlalu jauh (<= +6%), tren naik, tidak turun hari ini.
   - Trendline       : pantul garis tren naik (dua swing low terakhir yang makin tinggi) dan garis belum jebol.
   - Rumor / Berita  : kode saham disebut di judul berita CNBC Indonesia 72 jam terakhir (belum terverifikasi).
   Saham yang lolos lebih dari satu kategori digabung jadi satu kartu (konfluensi). Tiap kartu menandai apakah emiten ada di peta konglo.
   Likuiditas memakai rata-rata transaksi 20 hari (bukan volume hari ini, yang masih kecil di pagi hari).
   Hanya alat bantu edukasi, bukan ajakan beli/jual. */
(function () {
    'use strict';
    var box = document.getElementById('bot-picks');
    if (!box) return;
    var BASE = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    var V = encodeURIComponent(window.EWOKS_ASSET_V || '1');
    function get(n, soft) {
        var p = fetch(BASE + 'assets/data/' + n + '?v=' + V).then(function (r) { if (!r.ok) throw new Error(n); return r.json(); });
        return soft ? p.catch(function () { return null; }) : p;
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function tick(p) { return p < 200 ? 1 : p < 500 ? 2 : p < 2000 ? 5 : p < 5000 ? 10 : 25; }
    function rUp(p) { var t = tick(p); return Math.ceil(p / t - 1e-9) * t; }
    function rDn(p) { var t = tick(p); return Math.floor(p / t + 1e-9) * t; }
    function idr(n) { return Math.round(n).toLocaleString('id-ID'); }
    var N = 12;
    var CATS = [['all', 'Semua'], ['bow', 'Buy on Weakness'], ['brk', 'Breakout Resist'], ['tl', 'Trendline'], ['rum', 'Rumor / Berita']];
    var LBL = { bow: 'Buy on Weakness', brk: 'Breakout Resist', tl: 'Trendline naik', rum: 'Rumor / Berita' };
    var PRIO = ['bow', 'tl', 'brk'];
    var D = null, S = null, C = null, VOL = null, NEWS = null, KM = null;
    var cat = 'all', mode = 'ketat', cards = [], L = null, status = '', SM = {};

    function loose() { return mode === 'longgar'; }
    function flagsOf(t) { return ((S && S.items && S.items[t]) || []).map(function (x) { return x[0]; }); }
    function blocked(t) {
        if (/SUSPEN|DELIST|PPK|UMA/.test(flagsOf(t).join(' '))) return true;
        var b = D.info && D.info[t] && D.info[t][0];
        return !!(b && /pemantauan khusus|pengembangan/i.test(b) && b !== 'Utama');
    }
    function nameOf(r) { return String((D.names && D.names[r[0]]) || r[11] || '').replace(/^PT\s+/i, '').replace(/\s+Tbk\.?$/i, ''); }
    // Likuiditas dari rata-rata 20 hari (idx-vol.json); kalau tidak ada, jatuh ke volume hari ini.
    function liq(t, price, vol) {
        var v = VOL && VOL[t], a = 0;
        if (v && v[1] && v[1].length) { var s = v[1].slice(-20); a = s.reduce(function (x, y) { return x + y; }, 0) / s.length; } else a = vol || 0;
        return { val: a * price, ratio: a > 0 && vol ? vol / a : null };
    }
    function levelsOut(x, lo, hi, cl, tp) {
        if (hi <= lo) hi = lo + tick(lo);
        var mid = (lo + hi) / 2, rr = (tp - mid) / (mid - cl);
        x.lo = lo; x.hi = hi; x.cl = cl; x.tp = tp; x.rr = rr;
        return rr;
    }

    /* ---------- kategori ---------- */
    function bowRough(x) {
        var lo2 = loose(), dist = (x.price - x.sup) / x.price * 100, room = (x.res - x.price) / x.price * 100;
        if (x.price < x.ma50 * (lo2 ? 0.96 : 0.99)) return null;
        if (dist < -0.5 || dist > (lo2 ? 10 : 6.5)) return null;
        if (room < (lo2 ? 5 : 8)) return null;
        var o = { t: x.t, n: x.n, price: x.price, chg: x.chg };
        var rr = levelsOut(o, rUp(x.sup), rUp(x.sup * 1.02), rDn(x.sup * 0.97), rDn(x.res));
        if (!(rr >= (lo2 ? 1.2 : 1.5)) || o.cl >= o.lo) return null;
        o.score = rr * 10 + Math.max(0, 6 - dist) * 2 + (x.chg != null && x.chg <= 0.5 ? 3 : 0) + Math.min(5, Math.log10(Math.max(1, x.lq.val) / 1e9));
        return o;
    }
    function brk(x) {
        var lo2 = loose();
        if (!(x.res > x.sup * 1.01) || x.price < x.res * 0.98 || x.price > x.res * (lo2 ? 1.08 : 1.06)) return null;
        if (x.price < x.ma50 || (x.chg != null && x.chg < (lo2 ? -1.5 : -0.5))) return null;
        var o = { t: x.t, n: x.n, price: x.price, chg: x.chg, res: x.res, vr: x.lq.ratio };
        var tp = Math.min(x.res + 0.8 * (x.res - x.sup), x.res * 1.15);
        var rr = levelsOut(o, rUp(x.res), rUp(x.res * 1.02), rDn(x.res * 0.97), rDn(tp));
        if (!(rr >= (lo2 ? 1.0 : 1.3)) || o.cl >= o.lo) return null;
        o.score = rr * 8 + Math.min(3, x.lq.ratio || 0) * 3 + Math.min(5, Math.log10(Math.max(1, x.lq.val) / 1e9));
        return o;
    }
    function tline(x) {
        var a = C && C[x.t]; if (!a || !a[1] || a[1].length < 30) return null;
        var l = a[1], cl = a[2], n = l.length, i, p = [];
        for (i = Math.max(2, n - 50); i < n - 2; i++) if (l[i] <= l[i - 1] && l[i] <= l[i - 2] && l[i] <= l[i + 1] && l[i] <= l[i + 2]) p.push(i);
        if (p.length < 2) return null;
        var i2 = p[p.length - 1], i1 = p[p.length - 2];
        if (i2 - i1 < 5 || l[i2] <= l[i1] * 1.02) return null;
        var sl = (l[i2] - l[i1]) / (i2 - i1), line = l[i2] + sl * (n - i2);
        for (i = i2 + 1; i < n; i++) if (cl[i] < (l[i2] + sl * (i - i2)) * 0.985) return null; // garis sudah jebol
        var lo2 = loose(), dist = (x.price - line) / line * 100;
        if (dist < (lo2 ? -1 : -0.5) || dist > (lo2 ? 4.5 : 3) || x.price < x.ma50 * 0.98) return null;
        var o = { t: x.t, n: x.n, price: x.price, chg: x.chg, line: line };
        var tp = x.res > x.price * 1.04 ? x.res : x.price * 1.08;
        var rr = levelsOut(o, rUp(line), rUp(line * 1.015), rDn(Math.min(line * 0.97, l[i2] * 0.99)), rDn(tp));
        if (!(rr >= (lo2 ? 1.0 : 1.2)) || o.cl >= o.lo) return null;
        o.score = rr * 8 + Math.max(0, 3 - Math.abs(dist)) * 2 + Math.min(5, Math.log10(Math.max(1, x.lq.val) / 1e9));
        return o;
    }
    function rumors(byT) {
        var out = {}, items = (NEWS && NEWS.items) || [], cutoff = Date.now() - 72 * 36e5;
        items.forEach(function (it) {
            if (it.lang !== 'id' || Date.parse(it.ts) < cutoff) return;
            var seen = {};
            (String(it.title) + ' ' + String(it.desc || '')).replace(/\b[A-Z]{4}\b/g, function (c) {
                if (byT[c] && !seen[c] && !out[c]) { seen[c] = 1; out[c] = { t: c, n: byT[c].n, price: byT[c].price, chg: byT[c].chg, news: it, score: 5 }; }
                return c;
            });
        });
        return out;
    }
    function compute() {
        var cutoff = Date.now() - 6 * 864e5, byT = {}, R = { bow: [], brk: [], tl: [], rum: [] };
        D.rows.forEach(function (r) {
            var price = r[1], date = r[10];
            if (!(price >= 60) || !date || new Date(date).getTime() < cutoff) return;
            var x = { t: r[0], n: nameOf(r), price: price, chg: r[3], sup: r[6], res: r[7], ma50: r[8], vol: r[9] };
            byT[x.t] = x;
            if (!x.sup || !x.res || !x.ma50 || blocked(x.t)) return;
            x.lq = liq(x.t, price, x.vol);
            if (x.lq.val < (loose() ? 2e8 : 5e8)) return;
            var a = bowRough(x), b = brk(x), c = tline(x);
            if (a) R.bow.push(a); if (b) R.brk.push(b); if (c) R.tl.push(c);
        });
        var ru = rumors(byT); Object.keys(ru).forEach(function (t) { R.rum.push(ru[t]); });
        return R;
    }
    function merge() {
        var map = {};
        ['bow', 'tl', 'brk', 'rum'].forEach(function (k) {
            L[k].forEach(function (x) {
                var c = map[x.t] || (map[x.t] = { t: x.t, n: x.n, price: x.price, chg: x.chg, cats: {}, flags: flagsOf(x.t) });
                c.cats[k] = x;
            });
        });
        return Object.keys(map).map(function (t) {
            var c = map[t], ks = Object.keys(c.cats);
            c.lv = c.cats.bow || c.cats.tl || c.cats.brk || null;
            c.score = ks.reduce(function (s, k) { return s + c.cats[k].score; }, 0) + (ks.length - 1) * 6;
            c.nk = ks.length;
            return c;
        });
    }

    /* ---------- tampilan ---------- */
    function kg(t) {
        var m = KM && KM.m && KM.m[t], href = BASE + 'konglo.html?q=' + encodeURIComponent(t);
        if (!m || !m.length) return '<span class="bp-kg no" title="Belum ada di peta konglo situs ini">Bukan konglo di peta kami</span>';
        var names = m.slice(0, 2).map(function (g) { return esc(g[0]); }).join(', ') + (m.length > 2 ? ' +' + (m.length - 2) : '');
        var sure = m.some(function (g) { return g[1]; });
        return '<a class="bp-kg' + (sure ? '' : ' weak') + '" href="' + href + '" title="' + (sure ? 'Keterkaitan terlihat di data pemegang saham' : 'Tercatat di grup ini, keterkaitan belum terlihat di daftar pemegang saham') + '">Konglo: ' + names + ' ›</a>';
    }
    function why(c) {
        var o = [], k = c.cats;
        if (k.bow) o.push('Koreksi dekat support dalam tren naik (di atas MA50).');
        if (k.tl) o.push('Pantul garis tren naik di ±' + idr(k.tl.line) + ' (dua swing low makin tinggi, garis belum jebol).');
        if (k.brk) o.push('Harga di/atas resist ±' + idr(k.brk.res) + (k.brk.vr && k.brk.vr >= 1.5 ? ', volume ±' + k.brk.vr.toFixed(1) + '× rata-rata' : '') + '.');
        return o;
    }
    function card(c) {
        var up = (c.chg || 0) >= 0, v = c.lv, k = c.cats;
        var chips = Object.keys(k).map(function (x) { return '<span class="bp-chip bp-c-' + x + '">' + LBL[x] + '</span>'; }).join('');
        var fl = c.flags.length ? '<span class="bp-chip bp-c-fl">' + esc(c.flags.join(' · ')) + '</span>' : '';
        var h = '<div class="bp-card' + (c.nk > 1 ? ' multi' : '') + '"><div class="bp-h"><b>' + esc(c.t) + '</b><span>Last Rp ' + idr(c.price) + '</span><i class="' + (up ? 'u' : 'd') + '">' + (up ? '+' : '') + (c.chg == null ? '0' : c.chg.toFixed(2)) + '%</i></div>' +
            '<div class="bp-nm">' + esc(c.n) + '</div><div class="bp-chips">' + chips + (c.nk > 1 ? '<span class="bp-chip bp-c-x">' + c.nk + ' sinyal sejalan</span>' : '') + fl + '</div>' + kg(c.t);
        if (v) {
            h += '<div class="bp-r"><span>Area beli</span><b>' + idr(v.lo) + ' - ' + idr(v.hi) + '</b></div><div class="bp-r"><span>TP terdekat</span><b class="g">' + idr(v.tp) + '</b></div><div class="bp-r"><span>Strict CL (jebol)</span><b class="r">' + idr(v.cl) + '</b></div>' +
                '<p class="bp-n">' + why(c).join(' ') + ' R/R ±' + v.rr.toFixed(1) + '. Kalau mulai lemas di dekat TP, pertimbangkan trailing stop.</p>';
        }
        if (k.rum) h += '<p class="bp-nw">Berita: <a href="' + esc(k.rum.news.link) + '" target="_blank" rel="noopener noreferrer">' + esc(k.rum.news.title) + '</a> <em>(' + esc(k.rum.news.src) + ')</em>' + (v ? '' : '<br>Belum ada level: ini baru sebutan di berita, bukan sinyal harga. Cek keterbukaan informasi BEI dulu.') + '</p>';
        h += (v ? '<button type="button" class="bp-add" data-add="' + esc(c.t) + '">+ Pantau</button> ' : '') + '<a class="bp-l" href="?t=' + esc(c.t) + '#chart" onclick="try{tpPickTicker&&tpPickTicker(\'' + esc(c.t) + '\')}catch(e){}">Lihat grafik ›</a></div>';
        return h;
    }
    function view() {
        var list = cards.filter(function (c) { return cat === 'all' || c.cats[cat]; });
        list.sort(function (a, b) { return cat === 'all' ? (b.nk - a.nk) || (b.score - a.score) : (b.cats[cat].score - a.cats[cat].score); });
        return list;
    }
    function copyText(list) {
        return 'Rekomendasi Bot IHSG (edukasi, bukan ajakan beli/jual)\n' + list.map(function (c) {
            var v = c.lv; return c.t + ' | ' + Object.keys(c.cats).map(function (k) { return LBL[k]; }).join(' + ') + ' | Last ' + idr(c.price) + (v ? ' | Area ' + idr(v.lo) + '-' + idr(v.hi) + ' | TP ' + idr(v.tp) + ' | CL ' + idr(v.cl) : '') + ((KM && KM.m && KM.m[c.t]) ? ' | Konglo: ' + KM.m[c.t][0][0] : '');
        }).join('\n');
    }
    function addWatch(t, btn) {
        var c = cards.filter(function (i) { return i.t === t; })[0], x = c && c.lv; if (!x || typeof watchlist === 'undefined') return;
        if (watchlist.some(function (w) { return w.ticker === t; })) { if (typeof showToast === 'function') showToast(t + ' sudah ada di Watchlist', 'warning'); btn.textContent = 'Sudah dipantau ✓'; return; }
        watchlist.push({ id: Date.now(), ticker: t, price: String(x.hi), note: 'Dari Bot · ' + Object.keys(c.cats).map(function (k) { return LBL[k]; }).join(' + ') + ' · R/R ±' + x.rr.toFixed(1), foreign: '', bow: { lo: x.lo, hi: x.hi, tp: x.tp, cl: x.cl, ref: c.price, date: (D.rows.filter(function (r) { return r[0] === t; })[0] || [])[10] || '' } });
        try { localStorage.setItem('ewoks_watchlist', JSON.stringify(watchlist)); } catch (e) {}
        if (typeof renderWatchlist === 'function') renderWatchlist();
        if (typeof showToast === 'function') showToast(t + ' masuk Watchlist dengan level', 'success');
        btn.textContent = 'Dipantau ✓';
    }
    function draw() {
        var list = view(), top = list.slice(0, N);
        var when = D.meta && D.meta.built ? new Date(D.meta.built).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB' : '';
        var tabs = CATS.map(function (c) {
            var n = c[0] === 'all' ? cards.length : cards.filter(function (x) { return x.cats[c[0]]; }).length;
            return '<button type="button" data-c="' + c[0] + '" class="' + (cat === c[0] ? 'on' : '') + '">' + c[1] + ' <em>' + n + '</em></button>';
        }).join('');
        var empty = cat === 'rum' ? 'Belum ada kode saham IHSG di judul berita 72 jam terakhir (sumber: RSS CNBC Indonesia).' : 'Belum ada saham yang memenuhi syarat' + (cat === 'all' ? '' : ' kategori ini') + ' saat ini. Coba mode Longgar.';
        box.innerHTML = '<div class="bp-wrap"><div class="bp-top"><div><h2>Rekomendasi Bot · IHSG</h2><p>' + (top.length ? list.length + ' saham' + (cat === 'all' ? ' lolos minimal satu kategori' : ' di kategori ini') + '; tampil ' + top.length + ' teratas. ' + esc(status) : esc(empty)) + ' Data ' + esc(when) + '</p></div>' +
            '<div class="bp-btn"><button type="button" data-m="ketat" class="' + (mode === 'ketat' ? 'on' : '') + '">Ketat</button><button type="button" data-m="longgar" class="' + (mode === 'longgar' ? 'on' : '') + '">Longgar</button><button type="button" id="bp-copy">Salin</button></div></div>' +
            '<div class="bp-tabs">' + tabs + '</div><div class="bp-grid">' + top.map(card).join('') + '</div>' +
            '<p class="bp-d">DISCLAIMER: hasil screener otomatis dari harga penutupan, bukan ajakan beli/jual. Tren naik = harga ≥ MA50; Breakout = harga ≥ 98% resist; Trendline = garis dari dua swing low terakhir; Rumor/Berita hanya sebutan kode saham di judul berita, belum terverifikasi. Tanda konglo mengacu ke peta konglo situs ini (ikuti tautannya untuk rincian). TP = resist terdekat, CL = di bawah area beli. Lakukan analisa sendiri &amp; manage risk.</p></div>';
        box.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { mode = b.dataset.m; paint(); }; });
        box.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { cat = b.dataset.c; draw(); }; });
        box.querySelectorAll('[data-add]').forEach(function (b) { b.onclick = function () { addWatch(b.dataset.add, b); }; });
        var c = document.getElementById('bp-copy'); if (c) c.onclick = function () { try { navigator.clipboard.writeText(copyText(top)); c.textContent = 'Tersalin ✓'; } catch (e) { c.textContent = 'Gagal'; } };
    }

    /* Level BoW dari candle harian (swing support/resist + ATR) kalau mesin candle tersedia; kalau tidak, tetap pakai level kasar. */
    function loadEng() {
        if (window.EwoksPicksEngine) return Promise.resolve(window.EwoksPicksEngine);
        return new Promise(function (res) { var sc = document.createElement('script'); sc.src = BASE + 'assets/js/picks-engine.js?v=' + V; sc.onload = function () { res(window.EwoksPicksEngine || null); }; sc.onerror = function () { res(null); }; document.head.appendChild(sc); });
    }
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
    function paint() {
        var key = mode; L = compute(); cards = merge(); status = L.bow.length ? 'Level BoW dihitung dari candle…' : '';
        draw();
        if (!L.bow.length) return;
        refine(L.bow, key).then(function (sl) {
            if (key !== mode) return;
            if (sl && sl.length) { L.bow = sl; cards = merge(); status = 'Level BoW dari candle harian (swing support/resist + ATR).'; } else status = 'Level BoW kasar dari support/resist 20 hari (candle belum tersedia).';
            draw();
        });
    }
    Promise.all([get('idx-screener.json'), get('idx-status.json', true), get('candles/idx-1d.json', true), get('candles/idx-vol.json', true), get('global-news.json', true), get('konglo-map.json', true)])
        .then(function (r) {
            D = r[0]; S = r[1]; C = r[2] && r[2].s; VOL = r[3] && r[3].s; NEWS = r[4]; KM = r[5];
            L = compute(); if (merge().length < 6) mode = 'longgar';
            paint();
        }).catch(function () { box.innerHTML = ''; });
})();
