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
        return '<div data-grp="' + esc(it.id) + '" role="button" tabindex="0" class="premium-card glass-card rounded-2xl p-4 border border-slate-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition">' +
            '<div class="flex items-start justify-between gap-2"><div class="min-w-0"><div class="text-[11px] font-bold text-slate-500 truncate">' + esc(it.n) + '</div>' +
            '<div class="text-xl font-black text-slate-900 mt-0.5">' + priceFmt(it) + '</div>' +
            '<div class="text-[10px] text-slate-400">' + esc(it.u || '') + '</div></div>' + spark(it.spark, up) + '</div>' +
            '<div class="mt-1 text-xs">' + pct(it.chg) + (extra ? '<div class="text-[11px] text-slate-500 mt-1">' + extra + '</div>' : '') + '</div><div class="text-[10px] font-bold text-blue-600 mt-2">Lihat saham terkait ›</div></div>';
    }

    /* ---------- Harga live (Worker /gquotes) ---------- */
    var live = {}, liveTs = null, liveOk = null, commData = null, commTargets = [], liveTimer = null, onLive = [];
    function liveApi() { return (typeof getEwoksLiveApi === 'function' ? getEwoksLiveApi() : ''); }
    function liveSymbols() {
        var out = [];
        if (commData) commData.items.forEach(function (x) { if (x.s) out.push(x.s); });
        var want = window.__gWant || {};
        Object.keys(want).forEach(function (k) { (want[k] || []).forEach(function (t) { out.push(t); }); });
        return out.filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 200);
    }
    var wantT = null;
    function want(key, arr) {
        window.__gWant = window.__gWant || {};
        var same = (window.__gWant[key] || []).join(',') === arr.join(',');
        window.__gWant[key] = arr;
        if (!same) { clearTimeout(wantT); wantT = setTimeout(function () { if (liveTimer) liveTick(); }, 400); }
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
        return '● Live · ' + liveTs.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
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
            if (t.opts && t.opts.stamp) t.opts.stamp.textContent = (liveBadge() || ('Snapshot ' + ago(commData.meta.built)));
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

    /* ---------- Daftar saham terkait (klik indeks / komoditas) ---------- */
    var IS_IDX = document.body.getAttribute('data-page') === 'home';
    function shortName(n) { return String(n || '').replace(/^PT\.?\s*/i, '').replace(/\s*Tbk\.?$/i, '').trim(); }
    function pill(c) { if (!Number.isFinite(c)) return '<span class="text-slate-400 text-xs">–</span>'; var up = c >= 0; return '<span class="inline-block min-w-[64px] text-center text-[11px] font-black px-2 py-1 rounded-lg ' + (up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700') + '">' + (up ? '+' : '') + c.toFixed(2) + '%</span>'; }
    function closeGrp() { var m = document.getElementById('grp-modal'); if (m) m.classList.add('hidden'); document.body.style.overflow = ''; }
    var SY = null, SYD = null;
    var IX_NAME = { ISSI: ['Saham Syariah (ISSI)', true], JII: ['JII · Jakarta Islamic Index (30)', true], JII70: ['JII70 (70 saham syariah)', true], SHAGROW: ['IDX Sharia Growth', true], MESBUMN17: ['IDX-MES BUMN 17 (syariah)', true], VESTA28: ['IDX VESTA28', false], ECONOMIC30: ['Economic 30', false], SRIKEHATI: ['SRI-KEHATI', false], ESGQ: ['ESG Quality 45 KEHATI', false], ESGS: ['ESG Sector Leaders KEHATI', false], INVESTOR33: ['Investor33', false] };
    function loadSy() { if (SY || !IS_IDX) return Promise.resolve(); return get('syariah.json').then(function (d) { SY = {}; SYD = d; (d.t || []).forEach(function (t) { SY[t] = 1; }); }).catch(function () { SY = {}; }); }
    function openGrp(id) {
        loadSy().then(function () { openGrp2(id); });
    }
    function openGrp2(id) {
        Promise.all([get('market-groups.json'), IS_IDX ? get('idx-screener.json') : get('global-screener.json'), IS_IDX ? Promise.resolve(null) : get('global-index-members.json').catch(function () { return null; })]).then(function (res) {
            var def = res[0][IS_IDX ? 'idx' : 'global'][id];
            if (/^sec:/.test(id)) {
                var sn = id.slice(4), st = [];
                if (IS_IDX) { var inf = res[1].info || {}; res[1].rows.forEach(function (r) { if (inf[r[0]] && inf[r[0]][1] === sn && r[1] > 0) st.push(r[0]); }); }
                else { res[1].rows.forEach(function (r) { if (r[11] === sn && r[11] !== 'ETF') st.push(r[0]); }); }
                def = { n: 'Sektor ' + (IS_IDX ? (SEC_ID[sn] || sn) : sn), d: st.length + ' saham di sektor ini. Diurutkan dari yang paling naik.', t: st };
            }
            if (/^ix:/.test(id) && SYD) { var ik = id.slice(3), il = (SYD.lists && SYD.lists[ik]) || []; var inm = IX_NAME[ik] || [ik, false]; def = { n: inm[0], d: il.length + ' saham. Periode efektif ' + (SYD.period || '-') + ' (' + (SYD.source || 'BEI') + '). ' + (inm[1] ? 'Bukan fatwa; daftar resmi ada di OJK/BEI.' : ''), t: il }; }
            if (!def) { def = { n: id, d: 'Belum ada daftar saham terkait.', t: [] }; }
            var rows = [];
            var mem = res[2];
            if (mem && mem[id] && mem[id].length >= 20) { def = { n: def.n, d: def.n + ': daftar anggota lengkap (' + mem[id].length + ' perusahaan). Yang belum tampil harganya berarti datanya belum tersedia.' + (id === 'rut' && mem.meta && mem.meta.rutNote ? ' ' + mem.meta.rutNote : ''), t: mem[id] }; }
            if (IS_IDX) {
                var all = res[1].rows.filter(function (r) { return Number.isFinite(r[1]) && r[1] > 0; });
                var by = {}; all.forEach(function (r) { by[r[0]] = r; });
                var pick = def.top ? all.slice().sort(function (a, b) { return (b[1] * (b[9] || 0)) - (a[1] * (a[9] || 0)); }).slice(0, def.top) : (def.t || []).map(function (t) { return by[t]; }).filter(Boolean);
                rows = pick.map(function (r) { return { sy: SY && SY[r[0]], t: r[0], n: shortName(r[11]), p: r[1], c: r[3], href: 'watchlist.html?t=' + r[0] }; });
            } else {
                var by2 = {}; res[1].rows.forEach(function (r) { by2[r[0]] = r; });
                rows = (def.t || []).map(function (t) { return by2[t]; }).filter(Boolean).map(function (r) {
                    var l = live[r[0]];
                    return { t: r[0], n: r[10], p: l && Number.isFinite(l[0]) ? l[0] : r[1], c: l && Number.isFinite(l[2]) ? l[2] : r[3], href: '#saham-' + encodeURIComponent(r[0]) };
                });
            }
            rows.sort(function (a, b) { return (b.c || -99) - (a.c || -99); }); if (rows.length > 300) rows = rows.slice(0, 300);
            var m = document.getElementById('grp-modal');
            if (!m) {
                m = document.createElement('div'); m.id = 'grp-modal';
                m.className = 'fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4';
                document.body.appendChild(m);
                m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close]')) closeGrp(); var a = e.target.closest('a[data-row]'); if (a) closeGrp(); });
                document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeGrp(); });
            }
            var cur = IS_IDX ? 'Rp' : '$';
            m.innerHTML = '<div class="premium-card glass-card w-full md:max-w-2xl max-h-[88vh] flex flex-col rounded-t-3xl md:rounded-3xl border border-slate-200 overflow-hidden" role="dialog" aria-modal="true" aria-label="' + esc(def.n) + '">' +
                '<div class="p-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-3"><div><div class="text-[11px] font-black text-blue-600">Saham terkait</div><h3 class="text-xl font-black text-slate-900">' + esc(def.n) + '</h3><p class="text-xs text-slate-500 mt-1 max-w-md">' + esc(def.d) + '</p></div><button data-close aria-label="Tutup" class="text-3xl leading-none text-slate-400 hover:text-slate-700">&times;</button></div>' +
                '<div class="overflow-y-auto p-2 md:p-3">' + (rows.length ? rows.map(function (r) {
                    return '<a data-row href="' + r.href + '" class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"><span class="font-black text-sm text-slate-900 w-16">' + esc(r.t) + (r.sy ? '<i class="ml-1 text-[9px] font-black text-emerald-600 not-italic" title="Saham syariah (ISSI)">S</i>' : '') + '</span><span class="flex-1 min-w-0 text-xs text-slate-500 truncate">' + esc(r.n) + '</span><span class="text-sm font-bold text-slate-700">' + cur + (IS_IDX ? Number(r.p).toLocaleString('id-ID', { maximumFractionDigits: 0 }) : fmt(r.p)) + '</span>' + pill(r.c) + '</a>';
                }).join('') : '<p class="p-6 text-sm text-slate-500 text-center">Belum ada saham yang cocok di daftar pantauan.</p>') + '</div>' +
                '<div class="px-5 py-3 border-t border-slate-100 text-[10px] text-slate-400">' + (IS_IDX ? 'Snapshot harian · ' : '') + 'Klik saham untuk melihat fundamental. Hubungan dengan komoditas/indeks bersifat umum, bukan rekomendasi.</div></div>';
            m.classList.remove('hidden'); document.body.style.overflow = 'hidden';
        });
    }
    document.addEventListener('click', function (e) { var c = e.target.closest('[data-grp]'); if (c) openGrp(c.getAttribute('data-grp')); });
    document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-grp]')) { e.preventDefault(); openGrp(e.target.getAttribute('data-grp')); } });


    /* ---------- Performa sektor (bar ala Stockbit, klik = daftar saham) ---------- */
    var SEC_ID = { 'Energy': 'Energi', 'Basic Materials': 'Bahan Baku', 'Industrials': 'Perindustrian', 'Consumer Non-Cyclicals': 'Konsumer Primer', 'Consumer Cyclicals': 'Konsumer Siklikal', 'Healthcare': 'Kesehatan', 'Financials': 'Keuangan', 'Properties & Real Estate': 'Properti', 'Technology': 'Teknologi', 'Infrastructure': 'Infrastruktur', 'Transportation & Logistics': 'Transportasi & Logistik' };
    function sectorStats() {
        return Promise.all([IS_IDX ? get('idx-screener.json') : get('global-screener.json')]).then(function (r) {
            var d = r[0], acc = {};
            d.rows.forEach(function (x) {
                var sec, c, w;
                if (IS_IDX) { var inf = d.info && d.info[x[0]]; sec = inf && inf[1]; c = x[3]; w = x[1] * (x[9] || 0); }
                else { sec = x[11]; if (sec === 'ETF') return; var l = live[x[0]]; c = l && Number.isFinite(l[2]) ? l[2] : x[3]; w = x[1] * (x[7] || 0); }
                if (!sec || !Number.isFinite(c) || !(x[1] > 0) || Math.abs(c) > 60) return;
                var a = acc[sec] || (acc[sec] = { n: sec, sw: 0, s: 0, cnt: 0, up: 0, dn: 0 });
                var ww = w > 0 ? w : 1; a.sw += ww; a.s += c * ww; a.cnt++; if (c > 0) a.up++; else if (c < 0) a.dn++;
            });
            return Object.keys(acc).map(function (k) { var a = acc[k]; a.avg = a.s / a.sw; return a; }).sort(function (a, b) { return b.avg - a.avg; });
        });
    }
    function renderSectors(el) {
        function paint() {
            sectorStats().then(function (list) {
                if (!list.length) { el.innerHTML = '<p class="text-sm text-slate-500 p-3">Data sektor belum tersedia.</p>'; return; }
                var mx = Math.max.apply(null, list.map(function (a) { return Math.abs(a.avg); })) || 1;
                el.innerHTML = list.map(function (a) {
                    var w = Math.max(3, Math.abs(a.avg) / mx * 100), up = a.avg >= 0;
                    return '<div data-grp="sec:' + esc(a.n) + '" role="button" tabindex="0" class="flex items-center gap-3 py-2 px-1 rounded-lg cursor-pointer hover:bg-slate-50">' +
                        '<div class="w-36 sm:w-44 shrink-0 text-sm font-bold text-slate-700 truncate">' + esc(IS_IDX ? (SEC_ID[a.n] || a.n) : a.n) + '<div class="text-[10px] font-medium text-slate-400">' + a.cnt + ' saham · ' + a.up + ' naik · ' + a.dn + ' turun</div></div>' +
                        '<div class="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full rounded-full ' + (up ? 'bg-emerald-500' : 'bg-rose-500') + '" style="width:' + w.toFixed(1) + '%"></div></div>' +
                        '<div class="w-16 text-right text-sm font-black ' + (up ? 'text-emerald-600' : 'text-rose-600') + '">' + (up ? '+' : '') + a.avg.toFixed(2) + '%</div></div>';
                }).join('') + '<p class="text-[10px] text-slate-400 mt-2">Rata-rata perubahan harga, dibobot nilai transaksi. Klik sektor untuk melihat sahamnya.</p>';
            }).catch(function () { el.innerHTML = '<p class="text-sm text-slate-500 p-3">Data sektor belum tersedia.</p>'; });
        }
        if (IS_IDX) get('syariah.json').then(function (d) { if (!d || !d.lists) return; var order = ['ISSI', 'JII', 'JII70', 'SHAGROW', 'MESBUMN17', 'VESTA28', 'ECONOMIC30', 'SRIKEHATI', 'ESGQ', 'ESGS', 'INVESTOR33']; el.insertAdjacentHTML('beforebegin', '<div class="flex flex-wrap gap-2 mb-3">' + order.filter(function (k) { return d.lists[k]; }).map(function (k) { return '<button type="button" data-grp="ix:' + k + '" class="hm-chip">' + esc(IX_NAME[k][0].replace(/ \(.*\)/, '')) + ' · ' + d.lists[k].length + '</button>'; }).join('') + '</div>'); }).catch(function () {});
        paint(); startLive(); onLive.push(paint);
    }
    window.EwoksGlobal.renderSectors = renderSectors;

    var root = document.getElementById('page-global');
    if (!root) return;

    /* ---------- Tab (menu ada di header; halaman ini mengikuti #hash) ---------- */
    var TABS = ['ringkasan', 'screener', 'ipo', 'berita', 'detail'];
    var loaded = {};
    function parseHash() {
        var h = (location.hash || '').replace('#', '');
        var m = h.match(/^saham-(.+)$/);
        if (m) return { tab: 'detail', sym: decodeURIComponent(m[1]).toUpperCase() };
        if (h === 'funda') h = 'screener';
        return { tab: TABS.indexOf(h) >= 0 && h !== 'detail' ? h : 'ringkasan' };
    }
    function show() {
        var st = parseHash(), tab = st.tab;
        TABS.forEach(function (t) { document.getElementById('g-' + t).classList.toggle('hidden', t !== tab); });
        document.getElementById('g-heading').classList.toggle('hidden', tab === 'detail');
        if (window.ewoksGlobalNavMark) ewoksGlobalNavMark(tab === 'detail' ? 'screener' : tab);
        window.scrollTo(0, 0);
        if (tab === 'detail') { initDetail(st.sym); return; }
        if (!loaded[tab]) { loaded[tab] = true; ({ ringkasan: initSummary, screener: initScreener, ipo: initIpo, berita: initNews })[tab](); }
    }
    window.addEventListener('hashchange', show);
    root.addEventListener('click', function (e) {
        var g = e.target.closest('[data-goto]'); if (g) { e.preventDefault(); location.hash = g.dataset.goto; return; }
        if (e.target.closest('[data-star]')) return;
        var c = e.target.closest('[data-chart]'); if (c) { e.preventDefault(); location.hash = 'saham-' + encodeURIComponent(c.dataset.chart); }
    });


    /* ---------- Daftar pasar ala Stockbit: Indeks | Komoditas | Mata Uang | Kripto ---------- */
    var FLAG = { spx: '🇺🇸', ndx: '🇺🇸', dji: '🇺🇸', rut: '🇺🇸', vix: '🇺🇸', ust10: '🇺🇸', dxy: '🇺🇸', ihsg: '🇮🇩', n225: '🇯🇵', hsi: '🇭🇰', sti: '🇸🇬', ftse: '🇬🇧', dax: '🇩🇪', kospi: '🇰🇷', sse: '🇨🇳', szse: '🇨🇳', cac: '🇫🇷', stoxx: '🇪🇺', asx: '🇦🇺', twii: '🇹🇼', sensex: '🇮🇳', nifty: '🇮🇳', klci: '🇲🇾', set: '🇹🇭', bvsp: '🇧🇷', tsx: '🇨🇦',
        usdidr: '🇺🇸', sgdidr: '🇸🇬', euridr: '🇪🇺', audidr: '🇦🇺', cnyidr: '🇨🇳', jpyidr: '🇯🇵', gbpidr: '🇬🇧', myridr: '🇲🇾', hkdidr: '🇭🇰', saridr: '🇸🇦', krwidr: '🇰🇷', thbidr: '🇹🇭', inridr: '🇮🇳', nzdidr: '🇳🇿', chfidr: '🇨🇭', eurusd: '🇪🇺', gbpusd: '🇬🇧', usdjpy: '🇯🇵', audusd: '🇦🇺', usdcny: '🇨🇳', usdsgd: '🇸🇬',
        brent: '🛢️', wti: '🛢️', gas: '🔥', coal: '⚫', gold: '🥇', silver: '🥈', copper: '🟠', platinum: '⚪', palladium: '⚪', aluminium: '🔩', zinc: '🔩', nickel: '🔩', tin: '🔩', cpo: '🌴', rubber: '🛞', heating: '🛢️', gasoline: '⛽', cotton: '☁️', rice: '🌾', lumber: '🪵', wheat: '🌾', corn: '🌽', soy: '🫘', sugar: '🍬', coffee: '☕', cocoa: '🍫', btc: '₿', eth: 'Ξ', sol: '◎', bnb: '◆', xrp: '✕' };
    var MK_TABS = [['indeks', 'Indeks'], ['komoditas', 'Komoditas'], ['kurs', 'Mata uang'], ['kripto', 'Kripto']];
    var MK_PRIO = ['spx', 'ndx', 'dji', 'rut', 'ihsg', 'n225', 'hsi', 'kospi', 'sse', 'dax', 'ftse', 'cac', 'sti', 'vix', 'ust10', 'dxy', 'usdidr'];
    var mkTab = 'indeks', mkGroups = {};
    try { var sv = localStorage.getItem('ewoks_gmk'); if (sv) mkTab = sv; } catch (_) {}
    function mkRow(it) {
        var up = (it.chg || 0) >= 0, has = mkGroups[it.id];
        var d = it.price >= 1000 ? 0 : (it.price >= 10 ? 2 : 4);
        var attr = has ? ' data-grp="' + esc(it.id) + '" role="button" tabindex="0"' : '';
        return '<div' + attr + ' class="flex items-center gap-3 py-2.5 border-b border-slate-100 ' + (has ? 'cursor-pointer hover:bg-slate-50' : '') + ' rounded-lg px-1">' +
            '<span class="w-9 h-9 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-lg">' + (FLAG[it.id] || '•') + '</span>' +
            '<div class="min-w-0 flex-1"><div class="text-sm font-bold text-slate-800 truncate">' + esc(it.n) + '</div><div class="text-[10px] text-slate-400 truncate">' + esc(it.s || '') + (it.u ? ' · ' + esc(it.u) : '') + (has ? ' · saham terkait ›' : '') + '</div></div>' +
            '<span class="hidden sm:block">' + spark(it.spark, up) + '</span>' +
            '<div class="text-right shrink-0"><div class="text-sm font-black text-slate-900">' + fmt(it.price, d) + '</div><div class="text-xs">' + pct(it.chg) + '</div></div></div>';
    }
    function paintMarkets() {
        if (!commData) return;
        var all = commData.items.map(mergeItem);
        var gold = all.filter(function (x) { return x.id === 'gold'; })[0], idr = all.filter(function (x) { return x.id === 'usdidr'; })[0];
        var tabs = document.getElementById('gk-tabs');
        tabs.innerHTML = MK_TABS.map(function (t) { return '<button type="button" class="hm-chip shrink-0 ' + (t[0] === mkTab ? 'on' : '') + '" data-mk="' + t[0] + '">' + t[1] + '</button>'; }).join('');
        var items = all.filter(function (x) { return x.g === mkTab; });
        items.sort(function (a, b) { var ia = MK_PRIO.indexOf(a.id), ib = MK_PRIO.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
        var html = items.map(mkRow).join('');
        if (mkTab === 'komoditas' && gold && idr) html = '<div class="md:col-span-2 text-[11px] text-slate-500 pb-2">Emas ≈ Rp' + Math.round(gold.price * idr.price / 31.1034768).toLocaleString('id-ID') + '/gram (harga dunia × kurs, bukan harga toko)</div>' + html;
        document.getElementById('gk-list').innerHTML = html || '<p class="text-sm text-slate-500 p-3">Belum ada data.</p>';
        document.getElementById('gk-stamp').textContent = liveBadge() || (commData.meta ? 'Snapshot ' + ago(commData.meta.built) : '');
    }
    function initMarkets() {
        Promise.all([get('global-commodities.json'), get('market-groups.json').catch(function () { return null; })]).then(function (r) {
            commData = r[0]; mkGroups = r[1] ? r[1][IS_IDX ? 'idx' : 'global'] : {};
            paintMarkets(); startLive(); onLive.push(paintMarkets);
        }).catch(function () { document.getElementById('gk-list').innerHTML = '<p class="text-sm text-slate-500 p-3">Data pasar belum tersedia. Jalankan workflow Sync global.</p>'; });
        document.getElementById('gk-tabs').addEventListener('click', function (e) {
            var b = e.target.closest('[data-mk]'); if (!b) return; mkTab = b.dataset.mk; try { localStorage.setItem('ewoks_gmk', mkTab); } catch (_) {} paintMarkets();
        });
    }

    /* ---------- Ringkasan ---------- */
    function initSummary() {
        initMarkets();
        renderSectors(document.getElementById('g-sectors'));
        get('global-screener.json').then(function (d) {
            window.__gRows = d.rows; startLive();
            var N = 5; try { if (+localStorage.getItem('ewoks_gmovers_n') === 10) N = 10; } catch (_) {}
            function row(r, up) {
                return '<a href="#" data-chart="' + esc(r[0]) + '" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"><span class="font-black text-xs text-slate-900 w-14">' + esc(r[0]) + '</span><span class="flex-1 min-w-0 text-[11px] text-slate-500 font-medium truncate">' + esc(r[10]) + '</span><span class="text-xs font-bold text-slate-700">$' + fmt(r[1]) + '</span><span class="text-[11px] font-black w-16 text-right ' + (up ? 'text-emerald-600' : 'text-rose-600') + '">' + (up ? '+' : '') + r[3].toFixed(2) + '%</span></a>';
            }
            function paintMovers() {
                var rows = d.rows.filter(function (r) { return r[11] !== 'ETF' && Number.isFinite(r[3]) && Number.isFinite(r[1]); });
                var g = rows.filter(function (r) { return r[3] > 0; }).sort(function (a, b) { return b[3] - a[3]; }).slice(0, N);
                var l = rows.filter(function (r) { return r[3] < 0; }).sort(function (a, b) { return a[3] - b[3]; }).slice(0, N);
                want('movers', g.concat(l).map(function (r) { return r[0]; }));
                document.getElementById('gm-gain').innerHTML = g.map(function (r) { return row(r, true); }).join('') || '<p class="text-xs text-slate-400 p-3">Belum ada data.</p>';
                document.getElementById('gm-loss').innerHTML = l.map(function (r) { return row(r, false); }).join('') || '<p class="text-xs text-slate-400 p-3">Belum ada data.</p>';
                document.getElementById('gm-stamp').textContent = liveBadge() || ('Snapshot ' + ago(d.meta.built));
                document.getElementById('gm-n5').classList.toggle('on', N === 5);
                document.getElementById('gm-n10').classList.toggle('on', N === 10);
            }
            window.gMoversN = function (v) { N = v; try { localStorage.setItem('ewoks_gmovers_n', v); } catch (_) {} paintMovers(); };
            paintMovers(); onLive.push(paintMovers);
        }).catch(function () { document.getElementById('gm-gain').innerHTML = '<p class="text-sm text-slate-500 p-3">Data saham AS belum tersedia.</p>'; });
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
            document.getElementById('gs-meta').textContent = d.rows.length + ' saham & ETF · diperbarui ' + ago(d.meta.built);
            var secs = {}; d.rows.forEach(function (r) { if (r[11]) secs[r[11]] = (secs[r[11]] || 0) + 1; });
            var box = document.getElementById('gs-sectors');
            box.innerHTML = '<button class="kg-btn active shrink-0" data-s="">Semua</button>' + Object.keys(secs).sort().map(function (s) { return '<button class="kg-btn shrink-0" data-s="' + esc(s) + '">' + esc(s) + '</button>'; }).join('');
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
        var m = document.getElementById('gs-meta'); if (m && S.rows.length) m.textContent = S.rows.length + ' saham & ETF · ' + (liveBadge() || 'snapshot');
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
        want('screener', part.map(function (r) { return r[0]; }));
        document.getElementById('gs-body').innerHTML = part.map(function (r) {
            var on = w.indexOf(r[0]) >= 0;
            var rng = r[5] && r[6] ? '<span class="text-[11px] text-slate-500">' + fmt(r[5], 0) + '–' + fmt(r[6], 0) + '</span>' : '–';
            return '<tr data-chart="' + esc(r[0]) + '" class="border-t border-slate-100 cursor-pointer hover:bg-slate-50/60"><td class="p-3"><button data-star="' + esc(r[0]) + '" aria-label="Watchlist" class="' + (on ? 'text-amber-400' : 'text-slate-300') + '"><i class="fas fa-star"></i></button></td>' +
                '<td class="p-3"><div class="font-extrabold text-slate-900">' + esc(r[0]) + '</div><div class="text-[11px] text-slate-500 max-w-[200px] truncate">' + esc(r[10]) + '</div></td>' +
                '<td class="p-3 text-right font-bold">' + fmt(r[1]) + '</td><td class="p-3 text-right">' + pct(r[3]) + '</td>' +
                '<td class="p-3 text-right hidden sm:table-cell">' + pct(r[4]) + '</td><td class="p-3 text-right hidden md:table-cell">' + rng + '</td>' +
                '<td class="p-3 text-right hidden md:table-cell text-[11px] text-slate-500">' + (r[7] ? (r[7] >= 1e6 ? (r[7] / 1e6).toFixed(1) + ' jt' : Math.round(r[7] / 1e3) + ' rb') : '–') + '</td>' +
                '<td class="p-3 text-right whitespace-nowrap"><span class="hidden sm:inline-block text-[11px] font-black px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700">Cek fundamental ›</span><span class="sm:hidden text-indigo-600 font-black">›</span></td></tr>';
        }).join('') || '<tr><td colspan="8" class="p-6 text-center text-slate-500">Tidak ada yang cocok.</td></tr>';
        document.getElementById('gs-more').classList.toggle('hidden', list.length <= S.shown);
    }

    /* ---------- Detail saham: grafik + fundamental dalam satu halaman ---------- */
    var RANGES = [['1d', '5m', '1H'], ['5d', '15m', '5H'], ['1mo', '1d', '1B'], ['3mo', '1d', '3B']];
    var pcChart = null, pcSym = '', pcRange = 0;
    function last(a) { for (var i = a.length - 1; i >= 0; i--) if (Number.isFinite(a[i])) return a[i]; return null; }
    function ratio(a, b) { return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b * 100 : null; }
    function symInfo(sym) { var o = null; (window.__gRows || []).forEach(function (r) { if (r[0] === sym) o = r; }); return o; }
    function initDetail(sym) {
        var box = document.getElementById('g-detail');
        pcSym = sym; pcRange = 0; want('detail', [sym]);
        Promise.all([get('global-screener.json').then(function (r) { window.__gRows = r.rows; startLive(); }).catch(function () {}), get('global-funda/' + (/^[A-Z]/.test(sym) ? sym[0] : '0') + '.json').catch(function () { return null; })]).then(function (res) {
            var fd = res[1], row = symInfo(sym), f = fd && fd.t && fd.t[sym];
            var name = (row && row[10]) || (f && f.n) || '', isEtf = row && row[11] === 'ETF';
            box.innerHTML =
                '<button data-goto="screener" class="text-sm font-bold text-blue-600 mb-3">← Kembali ke screener</button>' +
                '<div class="flex flex-wrap items-end gap-x-4 gap-y-1 mb-1"><h2 class="text-2xl md:text-3xl font-black text-slate-900">' + esc(sym) + '</h2><span class="text-slate-500">' + esc(name) + (row && row[11] ? ' · ' + esc(row[11]) : '') + '</span></div>' +
                '<div id="gd-price" class="mb-4 text-sm"></div>' +
                '<div class="premium-card glass-card rounded-2xl p-4 border border-slate-200 mb-5">' +
                '<div id="gp-tabs" class="flex gap-2 mb-3">' + RANGES.map(function (r, i) { return '<button class="kg-btn' + (i ? '' : ' active') + '" data-r="' + i + '">' + r[2] + '</button>'; }).join('') + '</div>' +
                '<div style="height:300px;position:relative"><canvas id="gp-canvas"></canvas><div id="gp-msg" class="absolute inset-0 flex items-center justify-center text-sm text-slate-500 text-center px-6"></div></div>' +
                '<div class="mt-3 flex gap-4 text-xs font-bold"><a target="_blank" rel="noopener" class="text-blue-600" href="https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(sym.replace('-', '.')) + '">Chart lengkap di TradingView</a><a target="_blank" rel="noopener" class="text-slate-500" href="' + yh(sym) + '">Yahoo Finance</a></div></div>' +
                '<div id="gd-funda"></div>';
            box.querySelector('#gp-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (!b) return; pcRange = +b.dataset.r; box.querySelectorAll('#gp-tabs button').forEach(function (x) { x.classList.toggle('active', x === b); }); loadChart(); });
            paintPrice(); loadChart();
            document.getElementById('gd-funda').innerHTML = fundaHtml(sym, f, fd, isEtf);
            drawFundaChart(f, fd);
            onLive.push(function () { if (pcSym === sym && !document.getElementById('g-detail').classList.contains('hidden')) { paintPrice(); var fe = document.getElementById('gd-funda'); if (fe && f) fe.innerHTML = fundaHtml(sym, f, fd, isEtf); drawFundaChart(f, fd); } });
        });
    }
    function paintPrice() {
        var r = symInfo(pcSym), el = document.getElementById('gd-price'); if (!el) return;
        el.innerHTML = r ? '<span class="text-3xl font-black text-slate-900">$' + fmt(r[1]) + '</span> <span class="ml-2">' + pct(r[3]) + '</span> <span class="text-[11px] text-slate-500 ml-2">' + (liveBadge() || 'snapshot') + '</span>' : '';
    }
    function loadChart() {
        var api = liveApi(), msg = document.getElementById('gp-msg'), r = RANGES[pcRange], sym = pcSym;
        if (!msg) return;
        msg.textContent = 'Memuat grafik…';
        if (!api) { msg.textContent = 'Grafik butuh Worker live. Pakai tombol TradingView di bawah.'; return; }
        fetch(api + '/chart?g=1&s=' + encodeURIComponent(sym) + '&range=' + r[0] + '&interval=' + r[1], { cache: 'no-store' }).then(function (x) { return x.json(); }).then(function (d) {
            if (sym !== pcSym || !d.ok || !d.c || d.c.length < 2) throw new Error('kosong');
            msg.textContent = '';
            var labels = d.t.map(function (t) { var dt = new Date(t * 1000); return r[0] === '1d' || r[0] === '5d' ? dt.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }); });
            var col = d.c[d.c.length - 1] >= (d.prev || d.c[0]) ? '#10b981' : '#f43f5e';
            if (pcChart) pcChart.destroy();
            if (!window.Chart) { msg.textContent = 'Pustaka grafik belum termuat.'; return; }
            pcChart = new Chart(document.getElementById('gp-canvas'), { type: 'line', data: { labels: labels, datasets: [{ data: d.c, borderColor: col, backgroundColor: col + '22', fill: true, pointRadius: 0, borderWidth: 2, tension: 0.15 }] },
                options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, interaction: { mode: 'index', intersect: false }, scales: { x: { ticks: { maxTicksLimit: 6, maxRotation: 0 }, grid: { display: false } }, y: { ticks: { maxTicksLimit: 6 } } } } });
        }).catch(function () { msg.textContent = 'Grafik belum tersedia (Worker belum v7 atau pasar tutup). Pakai tombol TradingView di bawah.'; });
    }
    var gfChart = null;
    function fundaHtml(k, f, d, isEtf) {
        if (!f) return '<div class="premium-card glass-card rounded-2xl p-4 border border-slate-200 text-sm text-slate-500">' + (isEtf ? 'ETF/dana tidak punya laporan keuangan seperti perusahaan. Lihat komposisi dan biaya di situs penerbit ETF.' : 'Data fundamental untuk ' + esc(k) + ' belum tersedia (belum masuk sync atau Yahoo tidak punya datanya).') + '</div>';
        var keep = d.meta.years.map(function (y, i) { return ['rev', 'ni', 'asset', 'eq'].some(function (kk) { return Number.isFinite(f[kk][i]); }); });
        var pick = function (a) { return a.filter(function (_, i) { return keep[i]; }); };
        var yrs = pick(d.meta.years), r0 = symInfo(k), price = r0 ? r0[1] : null;
        var F = {}; ['rev', 'gp', 'op', 'ni', 'asset', 'eq', 'debt', 'ocf', 'fcf', 'eps'].forEach(function (kk) { F[kk] = pick(f[kk]); });
        var rev = f.ttm.rev != null ? f.ttm.rev : last(f.rev), ni = f.ttm.ni != null ? f.ttm.ni : last(f.ni);
        var fcf = f.ttm.fcf != null ? f.ttm.fcf : last(f.fcf);
        var pe = price && f.ttm.eps > 0 ? price / f.ttm.eps : null;
        var cards = [
            ['Pendapatan' + (f.ttm.rev != null ? ' (TTM)' : ''), rev != null ? '$' + fmt(rev, 1) + ' M' : '–'],
            ['Laba bersih' + (f.ttm.ni != null ? ' (TTM)' : ''), ni != null ? '$' + fmt(ni, 1) + ' M' : '–'],
            ['Margin laba bersih', ratio(ni, rev) != null ? fmt(ratio(ni, rev), 1) + '%' : '–'],
            ['ROE', ratio(last(f.ni), last(f.eq)) != null ? fmt(ratio(last(f.ni), last(f.eq)), 1) + '%' : '–'],
            ['Arus kas bebas', fcf != null ? '$' + fmt(fcf, 1) + ' M' : '–'],
            ['P/E (harga ÷ EPS TTM)', pe != null ? fmt(pe, 1) + '×' : 'n.a. (rugi / tidak ada)']
        ];
        function row(label, arr, dd) { return '<tr class="border-t border-slate-100"><td class="p-2 font-bold text-slate-700">' + label + '</td>' + arr.map(function (v) { return '<td class="p-2 text-right">' + (Number.isFinite(v) ? fmt(v, dd == null ? 1 : dd) : '–') + '</td>'; }).join('') + '</tr>'; }
        return '<h3 class="font-extrabold text-slate-900 mb-3">Fundamental</h3>' +
            '<div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">' + cards.map(function (c) { return '<div class="premium-card glass-card rounded-2xl p-4 border border-slate-200"><div class="text-[11px] font-bold text-slate-500">' + c[0] + '</div><div class="text-xl font-black text-slate-900 mt-1">' + c[1] + '</div></div>'; }).join('') + '</div>' +
            '<div class="premium-card glass-card rounded-2xl p-4 border border-slate-200 mb-5"><div style="height:240px"><canvas id="gf-canvas"></canvas></div></div>' +
            '<div class="overflow-x-auto premium-card glass-card rounded-2xl border border-slate-200"><table class="w-full text-sm"><thead><tr class="text-[11px] text-slate-500"><th class="p-2 text-left">USD miliar</th>' + yrs.map(function (y) { return '<th class="p-2 text-right">' + y + '</th>'; }).join('') + '</tr></thead><tbody>' +
            row('Pendapatan', F.rev) + row('Laba kotor', F.gp) + row('Laba operasi', F.op) + row('Laba bersih', F.ni) + row('Total aset', F.asset) + row('Ekuitas', F.eq) + row('Total utang', F.debt) + row('Arus kas operasi', F.ocf) + row('Arus kas bebas', F.fcf) + row('EPS (USD)', F.eps, 2) + '</tbody></table></div>' +
            '<p class="text-[11px] text-slate-500 mt-3">' + esc(d.meta.source) + ' · diperbarui ' + ago(d.meta.built) + ' · ' + esc(d.meta.unit) + '. ' + esc(d.meta.note || '') + ' Hanya edukasi, bukan rekomendasi.</p>';
    }
    function drawFundaChart(f, d) {
        var cv = document.getElementById('gf-canvas'); if (!cv || !f || !window.Chart) return;
        try { if (gfChart) gfChart.destroy(); var ix = d.meta.years.map(function (y, i) { return i; }).filter(function (i) { return Number.isFinite(f.rev[i]) || Number.isFinite(f.ni[i]); }); gfChart = new Chart(cv, { type: 'bar', data: { labels: ix.map(function (i) { return d.meta.years[i]; }), datasets: [{ label: 'Pendapatan', data: ix.map(function (i) { return f.rev[i]; }), backgroundColor: '#6366f1' }, { label: 'Laba bersih', data: ix.map(function (i) { return f.ni[i]; }), backgroundColor: '#10b981' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } }); } catch (_) {}
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

    show();
})();
