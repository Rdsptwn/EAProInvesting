/* Mode Global: ringkasan komoditas/indeks, screener saham AS, IPO AS, berita dunia.
   Data: assets/data/global-*.json (dibangun tools/build-global.mjs oleh workflow "Sync global"). */
(function () {
    'use strict';
    var V = function () { return encodeURIComponent(window.EWOKS_ASSET_V || '1'); };
    var base = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    var cache = {};
    function get(name) {
        if (!cache[name]) cache[name] = fetch(base + 'assets/data/' + name + '?v=' + V(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
        return cache[name];
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function fmt(n, d) { if (!Number.isFinite(n)) return '–'; return n.toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); }
    function pct(n) { if (!Number.isFinite(n)) return '<span class="text-slate-400">–</span>'; return '<span class="' + (n > 0 ? 'text-emerald-600' : n < 0 ? 'text-rose-600' : 'text-slate-500') + ' font-bold">' + (n > 0 ? '+' : '') + n.toFixed(2) + '%</span>'; }
    function ago(iso) {
        var t = Date.parse(iso); if (!t) return '';
        var m = Math.round((Date.now() - t) / 60000);
        if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu';
        if (m < 1440) return Math.round(m / 60) + ' jam lalu';
        return Math.round(m / 1440) + ' hari lalu';
    }
    function spark(vals, up) {
        if (!vals || vals.length < 2) return '';
        var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), w = 80, h = 26;
        var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * w).toFixed(1) + ',' + (h - 2 - (mx === mn ? h / 2 : (v - mn) / (mx - mn) * (h - 4))).toFixed(1); }).join(' ');
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="80" height="26" aria-hidden="true"><polyline fill="none" stroke="' + (up ? '#10b981' : '#f43f5e') + '" stroke-width="1.8" stroke-linejoin="round" points="' + pts + '"/></svg>';
    }
    function priceFmt(it) {
        var d = it.id === 'usdidr' ? 0 : (it.price >= 1000 ? 0 : 2);
        return fmt(it.price, d);
    }
    function card(it, extra) {
        var up = (it.chg || 0) >= 0;
        return '<div class="premium-card glass-card rounded-2xl p-4 border border-slate-200">' +
            '<div class="flex items-start justify-between gap-2"><div class="min-w-0"><div class="text-[11px] font-bold text-slate-500 truncate">' + esc(it.n) + '</div>' +
            '<div class="text-xl font-black text-slate-900 mt-0.5">' + priceFmt(it) + '</div>' +
            '<div class="text-[10px] text-slate-400">' + esc(it.u || '') + '</div></div>' + spark(it.spark, up) + '</div>' +
            '<div class="mt-1 text-xs">' + pct(it.chg) + (extra ? '<div class="text-[11px] text-slate-500 mt-1">' + extra + '</div>' : '') + '</div></div>';
    }

    /* ---------- Komoditas (dipakai beranda & halaman Global) ---------- */
    function renderCommodities(el, ids, opts) {
        opts = opts || {};
        return get('global-commodities.json').then(function (d) {
            var by = {}; d.items.forEach(function (x) { by[x.id] = x; });
            var html = ids.map(function (id) {
                var it = by[id]; if (!it) return '';
                var extra = '';
                if (id === 'gold' && d.derived && d.derived.goldIdrGram) extra = '≈ Rp' + d.derived.goldIdrGram.toLocaleString('id-ID') + '/gram';
                return card(it, extra);
            }).join('');
            if (!html) throw new Error('kosong');
            el.innerHTML = html;
            if (opts.stamp) opts.stamp.textContent = 'Diperbarui ' + ago(d.meta.built) + ' · ' + (d.meta.note || '');
            return d;
        }).catch(function () {
            el.innerHTML = '<div class="col-span-full text-sm text-slate-500 premium-card glass-card rounded-2xl p-4 border border-slate-200">Data komoditas belum tersedia. Jalankan workflow <b>Sync global</b> di GitHub Actions untuk mengisinya.</div>';
        });
    }
    window.EwoksGlobal = { renderCommodities: renderCommodities, get: get };

    var root = document.getElementById('page-global');
    if (!root) return;

    /* ---------- Tab ---------- */
    var TABS = ['ringkasan', 'screener', 'ipo', 'berita'];
    var loaded = {};
    function show(tab) {
        if (TABS.indexOf(tab) < 0) tab = 'ringkasan';
        TABS.forEach(function (t) { document.getElementById('g-' + t).classList.toggle('hidden', t !== tab); });
        document.querySelectorAll('#g-tabs [data-tab]').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
        try { history.replaceState(null, '', '#' + tab); } catch (_) {}
        if (!loaded[tab]) { loaded[tab] = true; ({ ringkasan: initSummary, screener: initScreener, ipo: initIpo, berita: initNews })[tab](); }
    }
    document.querySelectorAll('#g-tabs [data-tab]').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.tab); }); });
    root.addEventListener('click', function (e) { var g = e.target.closest('[data-goto]'); if (g) show(g.dataset.goto); });

    /* ---------- Ringkasan ---------- */
    function initSummary() {
        renderCommodities(document.getElementById('g-commodities'), ['brent', 'wti', 'gold', 'silver', 'copper', 'gas', 'coal', 'usdidr'], { stamp: document.getElementById('g-stamp') });
        get('global-commodities.json').then(function (d) {
            var ids = ['spx', 'ndx', 'dji', 'n225', 'hsi', 'sti', 'ftse', 'dax', 'vix', 'ust10', 'dxy', 'btc', 'eth'];
            var by = {}; d.items.forEach(function (x) { by[x.id] = x; });
            document.getElementById('g-indices').innerHTML = ids.filter(function (i) { return by[i]; }).map(function (i) {
                var it = by[i]; return '<div class="premium-card glass-card rounded-2xl p-3 border border-slate-200"><div class="text-[11px] font-bold text-slate-500 truncate">' + esc(it.n) + '</div><div class="font-black text-slate-900">' + fmt(it.price, it.price >= 1000 ? 0 : 2) + '</div><div class="text-xs">' + pct(it.chg) + '</div></div>';
            }).join('');
        }).catch(function () {});
        get('global-screener.json').then(function (d) {
            var rows = d.rows.filter(function (r) { return r[11] !== 'ETF' && Number.isFinite(r[3]); }).sort(function (a, b) { return b[3] - a[3]; });
            var li = function (r) { return '<li class="flex justify-between gap-2"><a href="' + yh(r[0]) + '" target="_blank" rel="noopener" class="font-bold text-slate-800 hover:text-blue-600">' + esc(r[0]) + '</a>' + pct(r[3]) + '</li>'; };
            document.getElementById('g-movers').innerHTML = '<div><div class="text-[11px] font-bold text-emerald-600 mb-1">Naik</div><ul class="space-y-1">' + rows.slice(0, 6).map(li).join('') + '</ul></div><div><div class="text-[11px] font-bold text-rose-600 mb-1">Turun</div><ul class="space-y-1">' + rows.slice(-6).reverse().map(li).join('') + '</ul></div>';
        }).catch(function () { document.getElementById('g-movers').innerHTML = '<div class="col-span-2 text-slate-500">Data saham AS belum tersedia.</div>'; });
        get('global-news.json').then(function (d) {
            document.getElementById('g-news-mini').innerHTML = d.items.slice(0, 6).map(newsRow).join('');
        }).catch(function () { document.getElementById('g-news-mini').innerHTML = '<div class="text-slate-500">Berita belum tersedia.</div>'; });
    }
    function yh(t) { return 'https://finance.yahoo.com/quote/' + encodeURIComponent(t); }
    function newsRow(n) {
        return '<a href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer" class="block group"><div class="font-bold text-slate-800 group-hover:text-blue-600 leading-snug">' + esc(n.title) + '</div><div class="text-[11px] text-slate-500 mt-0.5">' + esc(n.src) + ' · ' + ago(n.ts) + '</div></a>';
    }

    /* ---------- Screener ---------- */
    var S = { rows: [], sector: '', q: '', sort: 'chg-d', star: false, shown: 50 };
    function watch() { try { return JSON.parse(localStorage.getItem('ewoks_gwatch') || '[]'); } catch (_) { return []; } }
    function saveWatch(a) { try { localStorage.setItem('ewoks_gwatch', JSON.stringify(a)); } catch (_) {} }
    function initScreener() {
        get('global-screener.json').then(function (d) {
            S.rows = d.rows;
            document.getElementById('gs-meta').textContent = d.rows.length + ' saham & ETF · Yahoo Finance · diperbarui ' + ago(d.meta.built) + ' · harga tertunda';
            var secs = {}; d.rows.forEach(function (r) { if (r[11]) secs[r[11]] = (secs[r[11]] || 0) + 1; });
            var box = document.getElementById('gs-sectors');
            box.innerHTML = '<button class="kg-btn active" data-s="">Semua</button>' + Object.keys(secs).sort().map(function (s) { return '<button class="kg-btn" data-s="' + esc(s) + '">' + esc(s) + '</button>'; }).join('');
            box.addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; S.sector = b.dataset.s; S.shown = 50; box.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); }); draw(); });
            document.getElementById('gs-q').addEventListener('input', function (e) { S.q = e.target.value.trim().toLowerCase(); S.shown = 50; draw(); });
            document.getElementById('gs-sort').addEventListener('change', function (e) { S.sort = e.target.value; draw(); });
            document.getElementById('gs-star').addEventListener('change', function (e) { S.star = e.target.checked; draw(); });
            document.getElementById('gs-more').addEventListener('click', function () { S.shown += 50; draw(); });
            document.getElementById('gs-body').addEventListener('click', function (e) {
                var b = e.target.closest('[data-star]'); if (!b) return;
                var w = watch(), t = b.dataset.star, i = w.indexOf(t); if (i < 0) w.push(t); else w.splice(i, 1); saveWatch(w); draw();
            });
            draw();
        }).catch(function () { document.getElementById('gs-body').innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-500">Data saham AS belum tersedia. Jalankan workflow <b>Sync global</b> di GitHub Actions.</td></tr>'; });
    }
    var KEY = { 'chg-d': [3, -1], 'chg-a': [3, 1], 'm1-d': [4, -1], 'vol-d': [7, -1], 't-a': [0, 1] };
    function nearHi(r) { return r[6] ? r[1] / r[6] : -1; }
    function nearLo(r) { return r[5] ? r[1] / r[5] : 99; }
    function draw() {
        var w = watch(), q = S.q;
        var list = S.rows.filter(function (r) {
            if (S.sector && r[11] !== S.sector) return false;
            if (S.star && w.indexOf(r[0]) < 0) return false;
            if (q && (r[0] + ' ' + r[10] + ' ' + r[11]).toLowerCase().indexOf(q) < 0) return false;
            return true;
        });
        list.sort(function (a, b) {
            if (S.sort === 'hi-d') return nearHi(b) - nearHi(a);
            if (S.sort === 'lo-a') return nearLo(a) - nearLo(b);
            var k = KEY[S.sort] || KEY['chg-d'], x = a[k[0]], y = b[k[0]];
            if (k[0] === 0) return String(x).localeCompare(String(y)) * k[1];
            x = Number.isFinite(x) ? x : -1e18; y = Number.isFinite(y) ? y : -1e18;
            return (x - y) * k[1];
        });
        var part = list.slice(0, S.shown);
        document.getElementById('gs-body').innerHTML = part.map(function (r) {
            var on = w.indexOf(r[0]) >= 0;
            var rng = r[5] && r[6] ? '<span class="text-[11px] text-slate-500">' + fmt(r[5], 0) + '–' + fmt(r[6], 0) + '</span>' : '–';
            return '<tr class="border-t border-slate-100"><td class="p-3"><button data-star="' + esc(r[0]) + '" aria-label="Watchlist" class="' + (on ? 'text-amber-400' : 'text-slate-300') + '"><i class="fas fa-star"></i></button></td>' +
                '<td class="p-3"><div class="font-extrabold text-slate-900">' + esc(r[0]) + '</div><div class="text-[11px] text-slate-500 max-w-[200px] truncate">' + esc(r[10]) + '</div></td>' +
                '<td class="p-3 text-right font-bold">' + fmt(r[1]) + '</td><td class="p-3 text-right">' + pct(r[3]) + '</td>' +
                '<td class="p-3 text-right hidden sm:table-cell">' + pct(r[4]) + '</td><td class="p-3 text-right hidden md:table-cell">' + rng + '</td>' +
                '<td class="p-3 text-right hidden md:table-cell text-[11px] text-slate-500">' + (r[7] ? (r[7] >= 1e6 ? (r[7] / 1e6).toFixed(1) + ' jt' : Math.round(r[7] / 1e3) + ' rb') : '–') + '</td>' +
                '<td class="p-3 text-right whitespace-nowrap"><a class="text-xs font-bold text-blue-600" target="_blank" rel="noopener" href="https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(r[0].replace('-', '.')) + '">Chart</a> <a class="text-xs font-bold text-slate-500 ml-2" target="_blank" rel="noopener" href="' + yh(r[0]) + '">Yahoo</a></td></tr>';
        }).join('') || '<tr><td colspan="8" class="p-6 text-center text-slate-500">Tidak ada yang cocok.</td></tr>';
        document.getElementById('gs-more').classList.toggle('hidden', list.length <= S.shown);
    }

    /* ---------- IPO AS ---------- */
    function initIpo() {
        var box = document.getElementById('g-ipo-body');
        get('global-ipo.json').then(function (d) {
            var G = [['upcoming', 'Akan datang'], ['priced', 'Sudah harga (listing)'], ['filed', 'Baru mendaftar (filed)']];
            box.innerHTML = G.map(function (g) {
                var it = d.items.filter(function (x) { return x.status === g[0]; });
                if (!it.length) return '';
                return '<div><h3 class="font-extrabold text-slate-900 mb-2">' + g[1] + ' <span class="text-xs text-slate-400">(' + it.length + ')</span></h3><div class="overflow-x-auto premium-card glass-card rounded-2xl border border-slate-200"><table class="w-full text-sm"><thead><tr class="text-left text-[11px] text-slate-500"><th class="p-3">Kode</th><th class="p-3">Perusahaan</th><th class="p-3">Bursa</th><th class="p-3 text-right">Harga</th><th class="p-3 text-right hidden sm:table-cell">Saham</th><th class="p-3 text-right">Tanggal</th></tr></thead><tbody>' +
                    it.map(function (x) { return '<tr class="border-t border-slate-100"><td class="p-3 font-extrabold">' + esc(x.t || '–') + '</td><td class="p-3">' + esc(x.name) + '</td><td class="p-3 text-slate-500">' + esc(x.exch) + '</td><td class="p-3 text-right">' + esc(x.price ? (/^[0-9.]+$/.test(x.price) ? '$' : '') + x.price : '–') + '</td><td class="p-3 text-right hidden sm:table-cell text-slate-500">' + esc(x.shares || '–') + '</td><td class="p-3 text-right text-slate-500">' + esc(x.date || '–') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
            }).join('') || '<div class="text-slate-500 text-sm">Belum ada data IPO.</div>';
        }).catch(function () { box.innerHTML = '<div class="text-sm text-slate-500 premium-card glass-card rounded-2xl p-4 border border-slate-200">Data IPO AS belum tersedia. Jalankan workflow <b>Sync global</b> di GitHub Actions. Jika Nasdaq memblokir server GitHub, kalender bisa dilihat langsung di nasdaq.com/market-activity/ipos.</div>'; });
    }

    /* ---------- Berita ---------- */
    function initNews() {
        get('global-news.json').then(function (d) {
            var srcs = []; d.items.forEach(function (x) { if (srcs.indexOf(x.src) < 0) srcs.push(x.src); });
            var f = document.getElementById('gn-filter'), cur = '';
            f.innerHTML = '<button class="kg-btn active" data-n="">Semua</button>' + srcs.map(function (s) { return '<button class="kg-btn" data-n="' + esc(s) + '">' + esc(s) + '</button>'; }).join('');
            function paint() {
                document.getElementById('gn-body').innerHTML = d.items.filter(function (x) { return !cur || x.src === cur; }).slice(0, 60).map(function (n) {
                    return '<a href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer" class="premium-card glass-card rounded-2xl p-4 border border-slate-200 block hover:shadow-lg transition-shadow"><div class="text-[11px] font-bold text-blue-600">' + esc(n.src) + ' <span class="text-slate-400 font-normal">· ' + ago(n.ts) + '</span></div><div class="font-extrabold text-slate-900 mt-1 leading-snug">' + esc(n.title) + '</div>' + (n.desc ? '<div class="text-xs text-slate-500 mt-1">' + esc(n.desc) + '</div>' : '') + '</a>';
                }).join('');
            }
            f.addEventListener('click', function (e) { var b = e.target.closest('[data-n]'); if (!b) return; cur = b.dataset.n; f.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); }); paint(); });
            paint();
        }).catch(function () { document.getElementById('gn-body').innerHTML = '<div class="text-sm text-slate-500 premium-card glass-card rounded-2xl p-4 border border-slate-200 col-span-full">Berita belum tersedia. Jalankan workflow <b>Sync global</b> di GitHub Actions.</div>'; });
    }

    show((location.hash || '').replace('#', '') || 'ringkasan');
})();
