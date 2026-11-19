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

    /* ---------- Harga live (Worker /gquotes) ---------- */
    var live = {}, liveTs = null, liveOk = null, commData = null, commTargets = [], liveTimer = null, onLive = [];
    function liveApi() { return (typeof getEwoksLiveApi === 'function' ? getEwoksLiveApi() : ''); }
    function liveSymbols() {
        var out = [];
        if (commData) commData.items.forEach(function (x) { if (x.s) out.push(x.s); });
        if (window.__gRows) window.__gRows.forEach(function (r) { out.push(r[0]); });
        return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
    }
    function liveFetch() {
        var api = liveApi(), syms = liveSymbols();
        if (!api || !syms.length) return Promise.resolve(false);
        var parts = []; for (var i = 0; i < syms.length; i += 100) parts.push(syms.slice(i, i + 100));
        return Promise.all(parts.map(function (p) {
            var ctl = new AbortController(), tm = setTimeout(function () { ctl.abort(); }, 15000);
            return fetch(api + '/gquotes?s=' + encodeURIComponent(p.join(',')), { signal: ctl.signal, cache: 'no-store' })
                .then(function (r) { clearTimeout(tm); return r.json(); }).then(function (d) { return d && d.ok ? d.q : null; }).catch(function () { clearTimeout(tm); return null; });
        })).then(function (res) {
            var n = 0;
            res.forEach(function (q) { if (q) Object.keys(q).forEach(function (k) { if (q[k] && Number.isFinite(q[k][0])) { live[k] = q[k]; n++; } }); });
            liveOk = n > 0; if (liveOk) liveTs = new Date();
            return liveOk;
        });
    }
    function liveBadge() {
        if (liveOk === null) return '';
        if (!liveOk) return 'Harga live belum tersedia, memakai data snapshot';
        return '● Live (tertunda ±15 menit) · ' + liveTs.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }
    function mergeItem(it) {
        var l = it.s && live[it.s]; if (!l) return it;
        var c = {}; for (var k in it) c[k] = it[k];
        c.price = l[0]; if (Number.isFinite(l[2])) c.chg = l[2];
        return c;
    }
    function paintComm() {
        if (!commData) return;
        var by = {}; commData.items.forEach(function (x) { by[x.id] = mergeItem(x); });
        var gold = by.gold, idr = by.usdidr;
        var gram = gold && idr ? Math.round(gold.price * idr.price / 31.1034768) : (commData.derived && commData.derived.goldIdrGram);
        commTargets.forEach(function (t) {
            t.el.innerHTML = t.ids.map(function (id) {
                var it = by[id]; if (!it) return '';
                return card(it, id === 'gold' && gram ? '≈ Rp' + gram.toLocaleString('id-ID') + '/gram' : '');
            }).join('');
            if (t.opts && t.opts.stamp) t.opts.stamp.textContent = (liveBadge() || ('Snapshot ' + ago(commData.meta.built))) + ' · ' + (commData.meta.note || '');
        });
        onLive.forEach(function (f) { try { f(); } catch (_) {} });
    }
    function liveTick() {
        if (document.hidden) return;
        liveFetch().then(function () { paintComm(); });
    }
    function startLive() {
        if (liveTimer) return;
        liveTick();
        liveTimer = setInterval(liveTick, 60000);
        document.addEventListener('visibilitychange', function () { if (!document.hidden) liveTick(); });
    }

    /* ---------- Komoditas (dipakai beranda & halaman Global) ---------- */
    function renderCommodities(el, ids, opts) {
        opts = opts || {};
        return get('global-commodities.json').then(function (d) {
            commData = d; commTargets.push({ el: el, ids: ids, opts: opts });
            paintComm();
            startLive();
            return d;
        }).catch(function () {
            el.innerHTML = '<div class="col-span-full text-sm text-slate-500 premium-card glass-card rounded-2xl p-4 border border-slate-200">Data komoditas belum tersedia. Jalankan workflow <b>Sync global</b> di GitHub Actions untuk mengisinya.</div>';
        });
    }
    window.EwoksGlobal = { renderCommodities: renderCommodities, get: get, onLive: function (f) { onLive.push(f); } };

    var root = document.getElementById('page-global');
    if (!root) return;

    /* ---------- Tab ---------- */
    var TABS = ['ringkasan', 'screener', 'funda', 'ipo', 'berita'];
    var loaded = {};
    function show(tab) {
        if (TABS.indexOf(tab) < 0) tab = 'ringkasan';
        TABS.forEach(function (t) { document.getElementById('g-' + t).classList.toggle('hidden', t !== tab); });
        document.querySelectorAll('#g-tabs [data-tab]').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
        try { history.replaceState(null, '', '#' + tab); } catch (_) {}
        if (!loaded[tab]) { loaded[tab] = true; ({ ringkasan: initSummary, screener: initScreener, funda: initFunda, ipo: initIpo, berita: initNews })[tab](); }
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
            window.__gRows = d.rows; startLive();
            function paintMovers() {
            var rows = d.rows.filter(function (r) { return r[11] !== 'ETF' && Number.isFinite(r[3]); }).sort(function (a, b) { return b[3] - a[3]; });
            var li = function (r) { return '<li class="flex justify-between gap-2"><a href="' + yh(r[0]) + '" target="_blank" rel="noopener" class="font-bold text-slate-800 hover:text-blue-600">' + esc(r[0]) + '</a>' + pct(r[3]) + '</li>'; };
            document.getElementById('g-movers').innerHTML = '<div><div class="text-[11px] font-bold text-emerald-600 mb-1">Naik</div><ul class="space-y-1">' + rows.slice(0, 6).map(li).join('') + '</ul></div><div><div class="text-[11px] font-bold text-rose-600 mb-1">Turun</div><ul class="space-y-1">' + rows.slice(-6).reverse().map(li).join('') + '</ul></div>';
            }
            paintMovers(); onLive.push(paintMovers);
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
            S.rows = d.rows; window.__gRows = d.rows; startLive();
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
            draw(); onLive.push(function () { if (!document.getElementById('g-screener').classList.contains('hidden')) draw(); });
        }).catch(function () { document.getElementById('gs-body').innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-500">Data saham AS belum tersedia. Jalankan workflow <b>Sync global</b> di GitHub Actions.</td></tr>'; });
    }
    var KEY = { 'chg-d': [3, -1], 'chg-a': [3, 1], 'm1-d': [4, -1], 'vol-d': [7, -1], 't-a': [0, 1] };
    function nearHi(r) { return r[6] ? r[1] / r[6] : -1; }
    function nearLo(r) { return r[5] ? r[1] / r[5] : 99; }
    function applyLive() {
        S.rows.forEach(function (r) { var l = live[r[0]]; if (l && Number.isFinite(l[0])) { r[1] = l[0]; if (Number.isFinite(l[1])) r[2] = l[1]; if (Number.isFinite(l[2])) r[3] = l[2]; if (Number.isFinite(l[3]) && l[3] > 0) r[7] = l[3]; } });
        var m = document.getElementById('gs-meta'); if (m && S.rows.length) m.textContent = S.rows.length + ' saham & ETF · Yahoo Finance · ' + (liveBadge() || 'snapshot') + ' · harga tertunda';
    }
    function draw() {
        applyLive();
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

    /* ---------- Funda saham AS ---------- */
    var gfChart = null;
    function initFunda() {
        get('global-screener.json').then(function (r) { window.__gRows = r.rows; startLive(); }).catch(function () {});
        get('global-funda.json').then(function (d) {
            var keys = Object.keys(d.t).sort();
            document.getElementById('gf-list').innerHTML = keys.map(function (k) { return '<option value="' + esc(k) + '">' + esc(d.t[k].n) + '</option>'; }).join('');
            document.getElementById('gf-note').textContent = d.meta.source + ' · diperbarui ' + ago(d.meta.built) + ' · ' + d.meta.unit + '. ' + (d.meta.note || '') + ' Hanya edukasi, bukan rekomendasi.';
            var inp = document.getElementById('gf-q');
            function pick() { var k = inp.value.trim().toUpperCase(); if (d.t[k]) showFunda(d, k); }
            inp.addEventListener('input', pick); inp.addEventListener('change', pick);
            var h = (location.hash.match(/funda:([A-Z.-]+)/) || [])[1]; if (h && d.t[h]) { inp.value = h; pick(); }
        }).catch(function () { document.getElementById('gf-body').innerHTML = '<div class="text-sm text-slate-500 premium-card glass-card rounded-2xl p-4 border border-slate-200">Data funda belum tersedia. Jalankan workflow <b>Sync global funda</b> di GitHub Actions.</div>'; });
    }
    function last(a) { for (var i = a.length - 1; i >= 0; i--) if (Number.isFinite(a[i])) return a[i]; return null; }
    function ratio(a, b) { return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b * 100 : null; }
    function showFunda(d, k) {
        var f = d.t[k], yrs = d.meta.years;
        var price = null; if (window.__gRows) window.__gRows.forEach(function (r) { if (r[0] === k) price = r[1]; });
        var rev = f.ttm.rev != null ? f.ttm.rev : last(f.rev), ni = f.ttm.ni != null ? f.ttm.ni : last(f.ni);
        var pe = price && f.ttm.eps > 0 ? price / f.ttm.eps : null;
        var cards = [
            ['Pendapatan' + (f.ttm.rev != null ? ' (TTM)' : ''), rev != null ? '$' + fmt(rev, 1) + ' M' : '–'],
            ['Laba bersih' + (f.ttm.ni != null ? ' (TTM)' : ''), ni != null ? '$' + fmt(ni, 1) + ' M' : '–'],
            ['Margin laba bersih', ratio(ni, rev) != null ? fmt(ratio(ni, rev), 1) + '%' : '–'],
            ['ROE', ratio(last(f.ni), last(f.eq)) != null ? fmt(ratio(last(f.ni), last(f.eq)), 1) + '%' : '–'],
            ['Arus kas bebas', (f.ttm.fcf != null ? f.ttm.fcf : last(f.fcf)) != null ? '$' + fmt(f.ttm.fcf != null ? f.ttm.fcf : last(f.fcf), 1) + ' M' : '–'],
            ['P/E (harga ÷ EPS TTM)', pe != null ? fmt(pe, 1) + '×' : 'n.a.']
        ];
        function row(label, arr, dd) { return '<tr class="border-t border-slate-100"><td class="p-2 font-bold text-slate-700">' + label + '</td>' + arr.map(function (v) { return '<td class="p-2 text-right">' + (Number.isFinite(v) ? fmt(v, dd == null ? 1 : dd) : '–') + '</td>'; }).join('') + '</tr>'; }
        document.getElementById('gf-body').innerHTML =
            '<div class="mb-3"><span class="text-2xl font-black text-slate-900">' + esc(k) + '</span> <span class="text-slate-500">' + esc(f.n) + ' · ' + esc(f.s || '') + '</span></div>' +
            '<div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">' + cards.map(function (c) { return '<div class="premium-card glass-card rounded-2xl p-4 border border-slate-200"><div class="text-[11px] font-bold text-slate-500">' + c[0] + '</div><div class="text-xl font-black text-slate-900 mt-1">' + c[1] + '</div></div>'; }).join('') + '</div>' +
            '<div class="premium-card glass-card rounded-2xl p-4 border border-slate-200 mb-5"><div style="height:240px"><canvas id="gf-canvas"></canvas></div></div>' +
            '<div class="overflow-x-auto premium-card glass-card rounded-2xl border border-slate-200"><table class="w-full text-sm"><thead><tr class="text-[11px] text-slate-500"><th class="p-2 text-left">USD miliar</th>' + yrs.map(function (y) { return '<th class="p-2 text-right">' + y + '</th>'; }).join('') + '</tr></thead><tbody>' +
            row('Pendapatan', f.rev) + row('Laba kotor', f.gp) + row('Laba operasi', f.op) + row('Laba bersih', f.ni) + row('Total aset', f.asset) + row('Ekuitas', f.eq) + row('Total utang', f.debt) + row('Arus kas operasi', f.ocf) + row('Arus kas bebas', f.fcf) + row('EPS (USD)', f.eps, 2) + '</tbody></table></div>';
        try {
            if (gfChart) gfChart.destroy();
            if (window.Chart) gfChart = new Chart(document.getElementById('gf-canvas'), { type: 'bar', data: { labels: yrs, datasets: [{ label: 'Pendapatan', data: f.rev, backgroundColor: '#6366f1' }, { label: 'Laba bersih', data: f.ni, backgroundColor: '#10b981' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
        } catch (_) {}
        try { history.replaceState(null, '', '#funda:' + k); } catch (_) {}
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

    var h0 = (location.hash || '').replace('#', '').split(':')[0]; show(h0 || 'ringkasan');
})();
