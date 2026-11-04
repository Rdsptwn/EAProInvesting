// Terminal Pro: pengaturan chart TradingView + Screener Ewoks (data nyata, ekspor WA/Excel)
(function () {
    const PREF_KEY = 'ewoks_tv_prefs_v1';
    const DEFAULTS = { interval: 'D', style: '1', theme: 'auto', height: 'big', studies: ['Volume@tv-basicstudies'], sideToolbar: true };
    const INTERVALS = [['5', '5m'], ['15', '15m'], ['60', '1J'], ['240', '4J'], ['D', '1H'], ['W', '1M'], ['M', '1B']];
    const STUDIES = [
        ['Volume@tv-basicstudies', 'Volume'], ['MASimple@tv-basicstudies', 'MA (Simple)'], ['MAExp@tv-basicstudies', 'EMA'],
        ['BB@tv-basicstudies', 'Bollinger Bands'], ['RSI@tv-basicstudies', 'RSI'], ['MACD@tv-basicstudies', 'MACD'],
        ['StochasticRSI@tv-basicstudies', 'Stochastic RSI'], ['IchimokuCloud@tv-basicstudies', 'Ichimoku']
    ];
    const QUICK = ['COMPOSITE', 'BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'GOTO', 'BREN'];
    const HEIGHTS = { std: 'max(640px, 70vh)', big: 'max(780px, 84vh)', full: 'calc(100vh - 110px)' };

    function load() {
        let p = {};
        try { p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch (_) {}
        return Object.assign({}, DEFAULTS, p);
    }
    function save() { try { localStorage.setItem(PREF_KEY, JSON.stringify(window.EwoksTerminalPrefs)); } catch (_) {} }
    window.EwoksTerminalPrefs = load();

    const $ = (id) => document.getElementById(id);
    const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(String(s ?? '')) : String(s ?? ''));
    const fmt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('id-ID') : '—');

    function applyHeight() {
        const el = $('tv-chart-container');
        if (el) el.style.height = HEIGHTS[window.EwoksTerminalPrefs.height] || HEIGHTS.big;
    }
    function reopen() {
        const t = ($('chart-active-ticker-input') || {}).value || 'COMPOSITE';
        if (typeof openTVChart === 'function') openTVChart(t, { noScroll: true });
    }
    function paintControls() {
        const p = window.EwoksTerminalPrefs;
        const iv = $('tp-intervals');
        if (iv) iv.innerHTML = INTERVALS.map(([v, l]) => `<button type="button" class="tp-chip ${p.interval === v ? 'on' : ''}" onclick="tpSetPref('interval','${v}')">${l}</button>`).join('');
        const q = $('tp-quick');
        if (q) q.innerHTML = QUICK.map((t) => `<button type="button" class="tp-chip" onclick="openTVChart('${t}')">${t === 'COMPOSITE' ? 'IHSG' : t}</button>`).join('');
        const st = $('tp-studies');
        if (st) st.innerHTML = STUDIES.map(([id, l]) => `<label><input type="checkbox" ${p.studies.includes(id) ? 'checked' : ''} onchange="tpToggleStudy('${id}', this.checked)"> ${l}</label>`).join('') +
            `<label class="tp-sidetool"><input type="checkbox" ${p.sideToolbar !== false ? 'checked' : ''} onchange="tpSetPref('sideToolbar', this.checked)"> Toolbar gambar (kiri)</label>`;
        ['style', 'theme', 'height'].forEach((k) => { const e = $('tp-' + k); if (e) e.value = String(p[k]); });
    }
    window.tpSetPref = function (k, v) {
        window.EwoksTerminalPrefs[k] = v; save(); paintControls(); applyHeight();
        if (k !== 'height') reopen();
    };
    window.tpToggleStudy = function (id, on) {
        const p = window.EwoksTerminalPrefs; const s = new Set(p.studies);
        on ? s.add(id) : s.delete(id); p.studies = [...s]; save(); reopen();
    };
    window.tpToggleMenu = function (e) { e.stopPropagation(); $('tp-studies').classList.toggle('open'); };
    document.addEventListener('click', () => { const m = $('tp-studies'); if (m) m.classList.remove('open'); });
    window.tpResetPrefs = function () { window.EwoksTerminalPrefs = Object.assign({}, DEFAULTS); save(); paintControls(); applyHeight(); reopen(); };
    window.tpFullscreen = function () {
        const el = $('tv-chart-wrapper');
        if (!el) return;
        if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen();
    };

    /* ------------------------------ SCREENER ------------------------------ */
    let rows = [];      // semua emiten dari snapshot
    let filtered = [];  // hasil saringan (dipakai ekspor)
    let dataNote = '';

    const PRESETS = [
        ['🚀 Top Gainers', { cmin: 2, sort: 'chg-desc' }],
        ['🔻 Top Losers', { cmax: -2, sort: 'chg-asc' }],
        ['🎯 Dekat Support', { sr: 'sup', sort: 'sup-asc' }],
        ['💥 Breakout Resist', { sr: 'brk', sort: 'chg-desc' }],
        ['📉 Dekat Low 52 Mgg', { pos: 'low', sort: 'pos-asc' }],
        ['📈 Dekat High 52 Mgg', { pos: 'high', sort: 'chg-desc' }],
        ['🪙 Harga ≤ 500', { pmax: 500, sort: 'chg-desc' }],
        ['🏦 Blue Chip (≥ 5.000)', { pmin: 5000, sort: 'chg-desc' }]
    ];
    const FIELD = { vmin: 'f-vmin', board: 'f-board', sector: 'f-sector', q: 'f-q', pmin: 'f-pmin', pmax: 'f-pmax', cmin: 'f-cmin', cmax: 'f-cmax', pos: 'f-pos', sr: 'f-sr', sort: 'f-sort', limit: 'f-limit' };

    let info = {}; // kode -> [papan, sektor]
    function rowsFrom(d) {
        info = d.info || {};
        const names = d.names || {};
        const out = [];
        for (const r of d.rows || []) {
            const [t, price, prev, chg, low52, high52, support, resist, avg, vol, date, nm] = r;
            if (!Number.isFinite(price) || price <= 0) continue;
            const span = high52 - low52;
            const nmClean = String(names[t] || nm || '').replace(/^PT\s+/i, '').replace(/\s+Tbk\.?$/i, '');
            out.push({
                ticker: t, name: nmClean, price, prev, chg: Number.isFinite(chg) ? chg : null, low52, high52, support, resist, avg,
                vol: Number.isFinite(vol) ? vol : null, date,
                board: (info[t] || [])[0] || '', sector: (info[t] || [])[1] || '',
                pos: span > 0 ? Math.max(0, Math.min(100, ((price - low52) / span) * 100)) : null,
                supDist: Number.isFinite(support) && support > 0 ? ((price - support) / support) * 100 : null
            });
        }
        return out;
    }
    function buildRows(snap) {
        const out = [];
        for (const [tk, q] of Object.entries((snap && snap.quotes) || {})) {
            if (!q || !Number.isFinite(q.price) || q.price <= 0) continue;
            const span = (q.high52 - q.low52);
            out.push({
                ticker: tk, name: (q.name || '').replace(/^PT\s+/i, '').replace(/\s+Tbk\.?$/i, ''),
                price: q.price, chg: Number.isFinite(q.changePct) ? q.changePct : null,
                low52: q.low52, high52: q.high52, support: q.support, resist: q.resistance,
                vol: null, board: '', sector: '',
                pos: span > 0 ? Math.max(0, Math.min(100, ((q.price - q.low52) / span) * 100)) : null,
                supDist: Number.isFinite(q.support) && q.support > 0 ? ((q.price - q.support) / q.support) * 100 : null
            });
        }
        return out;
    }
    const num = (id) => { const v = ($(id) || {}).value; return v === '' || v == null ? null : Number(v); };

    window.tpRunScreener = function () {
        const q = (($('f-q') || {}).value || '').trim().toLowerCase();
        const pmin = num('f-pmin'), pmax = num('f-pmax'), cmin = num('f-cmin'), cmax = num('f-cmax');
        const vmin = num('f-vmin'), board = ($('f-board') || {}).value, sector = ($('f-sector') || {}).value;
        const pos = ($('f-pos') || {}).value, sr = ($('f-sr') || {}).value, sort = ($('f-sort') || {}).value || 'chg-desc';
        const limit = Number(($('f-limit') || {}).value || 50);
        let r = rows.filter((x) => {
            if (q && !(x.ticker.toLowerCase().includes(q) || x.name.toLowerCase().includes(q))) return false;
            if (pmin != null && x.price < pmin) return false;
            if (pmax != null && x.price > pmax) return false;
            if (vmin != null && (x.vol == null || x.vol / 100 < vmin)) return false;
            if (board && x.board !== board) return false;
            if (sector && x.sector !== sector) return false;
            if (cmin != null && (x.chg == null || x.chg < cmin)) return false;
            if (cmax != null && (x.chg == null || x.chg > cmax)) return false;
            if (pos === 'low' && !(x.pos != null && x.pos <= 20)) return false;
            if (pos === 'mid' && !(x.pos != null && x.pos > 20 && x.pos < 80)) return false;
            if (pos === 'high' && !(x.pos != null && x.pos >= 80)) return false;
            const validSR = Number.isFinite(x.support) && Number.isFinite(x.resist) && x.resist > x.support * 1.01;
            if (sr && !validSR) return false;
            if (sr === 'sup' && !(x.supDist != null && x.supDist >= 0 && x.supDist <= 3)) return false;
            if (sr === 'brk' && !(Number.isFinite(x.resist) && x.price >= x.resist * 0.98)) return false;
            return true;
        });
        const by = {
            'chg-desc': (a, b) => (b.chg ?? -999) - (a.chg ?? -999), 'chg-asc': (a, b) => (a.chg ?? 999) - (b.chg ?? 999),
            'price-desc': (a, b) => b.price - a.price, 'price-asc': (a, b) => a.price - b.price,
            'pos-asc': (a, b) => (a.pos ?? 999) - (b.pos ?? 999), 'sup-asc': (a, b) => Math.abs(a.supDist ?? 999) - Math.abs(b.supDist ?? 999),
            'vol-desc': (a, b) => (b.vol ?? -1) - (a.vol ?? -1), 'val-desc': (a, b) => (b.vol ?? 0) * b.price - (a.vol ?? 0) * a.price,
            tk: (a, b) => a.ticker.localeCompare(b.ticker)
        };
        r.sort(by[sort] || by['chg-desc']);
        filtered = r;
        const shown = r.slice(0, limit);
        const sub = $('tp-scr-sub');
        if (sub) sub.textContent = `${r.length} dari ${rows.length} emiten cocok · menampilkan ${shown.length}${dataNote ? ' · ' + dataNote : ''}`;
        const tb = $('tp-rows');
        if (!tb) return;
        if (!shown.length) { tb.innerHTML = '<tr><td colspan="9" class="tp-empty">Tidak ada emiten yang cocok. Longgarkan filter.</td></tr>'; return; }
        tb.innerHTML = shown.map((x) => {
            const up = (x.chg ?? 0) >= 0;
            const chg = x.chg == null ? '—' : `${up ? '+' : ''}${x.chg.toFixed(2)}%`;
            const pos = x.pos == null ? 0 : x.pos;
            return `<tr>
                <td><button type="button" class="tp-tk" onclick="openTVChart('${x.ticker}')">${esc(x.ticker)}</button></td>
                <td class="tp-nm">${esc(x.name)}</td>
                <td class="r b">${fmt(x.price)}</td>
                <td class="r"><span class="tp-chg ${x.chg == null ? '' : up ? 'up' : 'dn'}">${chg}</span></td>
                <td class="r">${x.vol == null ? '—' : fmt(x.vol / 100)}</td>
                <td><div class="tp-rng" title="Low ${fmt(x.low52)} – High ${fmt(x.high52)}"><i style="left:${pos.toFixed(0)}%"></i></div></td>
                <td class="r">${fmt(x.support)}</td><td class="r">${fmt(x.resist)}</td>
                <td class="r"><button type="button" class="tp-mini" title="Tambah ke Watchlist" onclick="tpAddWatch('${x.ticker}')"><i class="fas fa-plus"></i></button></td>
            </tr>`;
        }).join('');
    };
    window.tpApplyPreset = function (i) {
        tpResetScreener(true);
        const f = PRESETS[i][1];
        Object.entries(f).forEach(([k, v]) => { const e = $(FIELD[k]); if (e) e.value = v; });
        document.querySelectorAll('#tp-presets .tp-chip').forEach((b, j) => b.classList.toggle('on', j === i));
        tpRunScreener();
    };
    window.tpResetScreener = function (silent) {
        Object.values(FIELD).forEach((id) => { const e = $(id); if (e) e.value = e.tagName === 'SELECT' ? e.options[0].value : ''; });
        const lim = $('f-limit'); if (lim) lim.value = '50';
        document.querySelectorAll('#tp-presets .tp-chip').forEach((b) => b.classList.remove('on'));
        if (!silent) tpRunScreener();
    };
    window.tpScreenerTab = function (t) {
        $('tp-pane-ewoks').classList.toggle('hidden', t !== 'ewoks');
        $('tp-pane-tv').classList.toggle('hidden', t !== 'tv');
        $('tp-tab-ewoks').classList.toggle('active', t === 'ewoks');
        $('tp-tab-tv').classList.toggle('active', t === 'tv');
    };
    window.tpAddWatch = function (tk) {
        if (typeof watchlist === 'undefined') return;
        if (watchlist.some((w) => w.ticker === tk)) { showToast(`${tk} sudah ada di Watchlist`, 'warning'); return; }
        const x = rows.find((r) => r.ticker === tk);
        const target = x ? Math.round(Number.isFinite(x.support) && x.support > 0 ? x.support : x.price) : '';
        watchlist.push({ id: Date.now(), ticker: tk, price: String(target), note: 'Dari Screener', foreign: '' });
        try { localStorage.setItem('ewoks_watchlist', JSON.stringify(watchlist)); } catch (_) {}
        if (typeof renderWatchlist === 'function') renderWatchlist();
        showToast(`${tk} ditambahkan (target beli ${fmt(target)} = support)`, 'success');
    };
    window.tpGetFiltered = () => filtered;

    function paintStatCards(snap) {
        const g = rows.filter((r) => r.chg != null && r.price >= 50).sort((a, b) => b.chg - a.chg)[0];
        const ge = $('terminal-gainer');
        if (ge) { ge.textContent = g ? g.ticker : '—'; ge.className = 'text-xl md:text-2xl font-black ' + (g && g.chg >= 0 ? 'text-emerald-600' : 'text-slate-800'); }
        const gs = $('terminal-gainer-sub');
        if (gs) gs.textContent = g ? `${g.chg >= 0 ? '+' : ''}${g.chg.toFixed(2)}% · ${fmt(g.price)}` : 'belum ada data';
        const u = snap && snap.usdIdr;
        const ue = $('terminal-usdidr');
        if (ue) ue.textContent = u && Number.isFinite(u.price) ? Math.round(u.price).toLocaleString('id-ID') : '—';
        const us = $('terminal-usdidr-sub');
        if (us) us.textContent = u && Number.isFinite(u.changePct) ? `${u.changePct >= 0 ? '+' : ''}${u.changePct.toFixed(2)}%` : 'kurs';
    }

    let fullData = false;
    function fillSelects() {
        const uniq = (k) => [...new Set(rows.map((r) => r[k]).filter((v) => v && v.length > 2))].sort();
        const set = (id, label, vals) => { const e = $(id); if (!e) return; const cur = e.value; e.innerHTML = `<option value="">${label}</option>` + vals.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join(''); e.value = cur; };
        set('f-board', 'Semua papan', uniq('board'));
        set('f-sector', 'Semua sektor', uniq('sector'));
    }
    function recompute(r) {
        const span = r.high52 - r.low52;
        r.pos = span > 0 ? Math.max(0, Math.min(100, ((r.price - r.low52) / span) * 100)) : null;
        r.supDist = Number.isFinite(r.support) && r.support > 0 ? ((r.price - r.support) / r.support) * 100 : null;
    }
    let liveBusy = false;
    window.tpRefreshLive = async function (manual) {
        const api = typeof getEwoksLiveApi === 'function' ? getEwoksLiveApi() : '';
        const btn = $('tp-live-btn');
        if (!api) { if (manual && typeof showToast === 'function') showToast('URL Worker live belum diatur.', 'warning'); return; }
        if (liveBusy || !rows.length) return;
        if (!manual && !(typeof isIdxMarketOpen === 'function' && isIdxMarketOpen())) return;
        liveBusy = true;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat…'; }
        try {
            const ctl = new AbortController();
            const timer = setTimeout(() => ctl.abort(), 30000);
            const res = await fetch(`${api}/screener?s=${rows.map((r) => r.ticker).join(',')}`, { signal: ctl.signal, cache: 'no-store' });
            clearTimeout(timer);
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.ok) throw new Error(d.error || 'HTTP ' + res.status);
            let n = 0;
            for (const r of rows) {
                const q = d.q && d.q[r.ticker];
                if (!q) continue;
                r.price = q[0];
                if (q[1] != null) r.prev = q[1];
                r.chg = q[2] != null ? q[2] : (r.prev > 0 ? +(((r.price - r.prev) / r.prev) * 100).toFixed(2) : r.chg);
                if (q[3] != null) r.vol = q[3];
                recompute(r); n++;
            }
            const t = new Date(d.ts).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
            dataNote = `live ${t} WIB (${n} emiten)`;
            tpRunScreener();
            if (manual && typeof showToast === 'function') showToast(`Harga live disegarkan untuk ${n} emiten`, 'success');
        } catch (e) {
            const m = String(e.message || e);
            dataNote = `live gagal (${/abort/i.test(m) ? 'timeout' : m})`;
            tpRunScreener();
            if (manual && typeof showToast === 'function') showToast('Live gagal: ' + m + '. Memakai data snapshot.', 'warning');
        } finally {
            liveBusy = false;
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt"></i> Segarkan live'; }
        }
    };

    async function init() {
        paintControls(); applyHeight();
        const pr = $('tp-presets');
        if (pr) pr.innerHTML = PRESETS.map(([l], i) => `<button type="button" class="tp-chip" onclick="tpApplyPreset(${i})">${l}</button>`).join('');
        let snap = null;
        try { snap = await loadEwoksMarketSnapshot(); } catch (_) {}
        // 1) data lengkap semua emiten BEI
        try {
            const base = typeof EwoksSiteContext !== 'undefined' ? EwoksSiteContext.basePath : '/';
            const r = await fetch(`${base}assets/data/idx-screener.json?v=${encodeURIComponent(window.EWOKS_ASSET_V || '1')}`, { cache: 'no-store' });
            if (r.ok) {
                const d = await r.json();
                const built = rowsFrom(d);
                if (built.length > 300) {
                    rows = built; fullData = true;
                    const when = d.meta && d.meta.built ? new Date(d.meta.built).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
                    dataNote = `snapshot ${when} WIB`;
                }
            }
        } catch (_) {}
        // 2) cadangan: snapshot konglo (±280 emiten)
        if (!fullData) { rows = snap ? buildRows(snap) : []; dataNote = 'baru ±' + rows.length + ' emiten (jalankan workflow "Daily market sync" untuk semua emiten)'; }
        paintStatCards(snap);
        fillSelects();
        const dl = $('tp-ticker-list');
        if (dl) dl.innerHTML = rows.map((r) => `<option value="${esc(r.ticker)}">${esc(r.name)}</option>`).join('');
        tpRunScreener();
        window.__terminalRepaint = async () => {
            const sn = await loadEwoksMarketSnapshot();
            if (!fullData) { rows = buildRows(sn); fillSelects(); }
            paintStatCards(sn); tpRunScreener();
        };
        setTimeout(() => tpRefreshLive(false), 2500);
        setInterval(() => tpRefreshLive(false), 5 * 60 * 1000);
    }
    if (document.getElementById('tp-screener')) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    }
})();
