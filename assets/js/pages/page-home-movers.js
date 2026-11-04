/* Beranda: Top Gainer/Loser + ticker tape dinamis (saham teramai). IHSG & USD/IDR selalu tetap. */
(function () {
    'use strict';
    if (document.body.getAttribute('data-page') !== 'home') return;
    const $ = (id) => document.getElementById(id);
    const V = () => encodeURIComponent(window.EWOKS_ASSET_V || '1');
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let data = {};          // T -> {p, prev, chg, vol, name}
    let codes = [];
    let n = 5, live = false, stamp = '', tapeKey = '';
    try { n = +localStorage.getItem('ewoks_movers_n') === 10 ? 10 : 5; } catch (_) {}

    const fx = (v) => Number(v).toLocaleString('id-ID', { maximumFractionDigits: 0 });
    const shortName = (s) => String(s || '').replace(/^PT\.?\s*/i, '').replace(/\s*Tbk\.?$/i, '').trim();

        const liquid = (x) => Number.isFinite(x.chg) && x.vol >= 100; // semua saham yang ada transaksi (min. 1 lot)

    function pickMovers() {
        const arr = Object.entries(data).map(([t, x]) => ({ t, ...x })).filter(liquid);
        const g = arr.filter((x) => x.chg > 0).sort((a, b) => b.chg - a.chg).slice(0, n);
        const l = arr.filter((x) => x.chg < 0).sort((a, b) => a.chg - b.chg).slice(0, n);
        return { g, l };
    }

    function rowHtml(x, up) {
        return `<a href="watchlist.html?t=${x.t}" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <span class="font-black text-xs text-slate-900 w-12">${x.t}</span>
            <span class="flex-1 min-w-0 text-[11px] text-slate-500 font-medium truncate">${esc(shortName(x.name))}</span>
            <span class="text-xs font-bold text-slate-700">${fx(x.p)}</span>
            <span class="text-[11px] font-black w-16 text-right ${up ? 'text-emerald-600' : 'text-rose-600'}">${up ? '+' : ''}${x.chg.toFixed(2)}%</span>
        </a>`;
    }

    function renderMovers() {
        const box = $('home-movers-body');
        if (!box) return;
        const { g, l } = pickMovers();
        const empty = '<p class="text-xs text-slate-400 p-3">Belum ada data.</p>';
        $('hm-gain').innerHTML = g.length ? g.map((x) => rowHtml(x, true)).join('') : empty;
        $('hm-loss').innerHTML = l.length ? l.map((x) => rowHtml(x, false)).join('') : empty;
        $('hm-stamp').textContent = stamp;
        $('hm-n5').classList.toggle('on', n === 5);
        $('hm-n10').classList.toggle('on', n === 10);
    }

    window.homeMoversN = function (v) {
        n = v;
        try { localStorage.setItem('ewoks_movers_n', String(v)); } catch (_) {}
        renderMovers();
    };

    function injectCard() {
        const hero = document.querySelector('#page-home > .grid');
        if (!hero || $('home-movers')) return;
        const sec = document.createElement('div');
        sec.id = 'home-movers';
        sec.className = 'premium-card p-6 md:p-8 mb-10';
        sec.innerHTML = `
            <div class="flex flex-wrap items-center gap-3 mb-1">
                <h3 class="text-xl font-black text-slate-900 flex items-center gap-3"><i class="fas fa-fire text-orange-500"></i> Top Gainer &amp; Top Loser</h3>
                <div class="ml-auto flex gap-1">
                    <button type="button" id="hm-n5" class="hm-chip" onclick="homeMoversN(5)">Top 5</button>
                    <button type="button" id="hm-n10" class="hm-chip" onclick="homeMoversN(10)">Top 10</button>
                </div>
            </div>
            <p id="hm-stamp" class="text-[10px] font-bold text-blue-600 mb-4">Memuat…</p>
            <div id="home-movers-body" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><div class="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-1"><i class="fas fa-arrow-trend-up mr-1"></i> Top Gainer</div><div id="hm-gain"></div></div>
                <div><div class="text-[11px] font-black uppercase tracking-widest text-rose-600 mb-1"><i class="fas fa-arrow-trend-down mr-1"></i> Top Loser</div><div id="hm-loss"></div></div>
            </div>
            <p class="text-[10px] text-slate-400 mt-4">Semua saham yang bertransaksi hari ini. Klik kode untuk buka di Terminal.</p>`;
        hero.insertAdjacentElement('afterend', sec);
    }

    /* ---------- ticker tape (TradingView) ---------- */
    function renderTape() {
        const host = document.querySelector('.tradingview-widget-container');
        if (!host) return;
        const top = Object.entries(data).map(([t, x]) => ({ t, v: x.p * x.vol, ok: true })).filter((x) => x.ok && x.v > 0)
            .sort((a, b) => b.v - a.v).slice(0, 10).map((x) => x.t);
        if (!top.length) return;
        const key = top.join(',');
        if (key === tapeKey) return;
        tapeKey = key;
        const symbols = [{ proName: 'IDX:COMPOSITE', title: 'IHSG' }, { proName: 'FX_IDC:USDIDR', title: 'USD/IDR' }]
            .concat(top.map((t) => ({ proName: 'IDX:' + t, title: t })));
        host.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
        s.text = JSON.stringify({ symbols, showSymbolLogo: true, isTransparent: true, displayMode: 'regular', colorTheme: 'dark', locale: 'id' });
        host.appendChild(s);
    }

    /* ---------- data ---------- */
    async function loadStatic() {
        const base = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
        const r = await fetch(`${base}assets/data/idx-screener.json?v=${V()}`, { cache: 'no-store' });
        const d = await r.json();
        const names = d.names || {};
        data = {};
        for (const row of d.rows || []) {
            const [t, p, prev, chg, , , , , , vol, date, nm] = row;
            if (!Number.isFinite(p) || p <= 0) continue;
            data[t] = { p, prev, chg: Number.isFinite(chg) ? chg : null, vol: Number(vol) || 0, name: nm || names[t] || t, date: date || '' };
        }
        codes = Object.keys(data);
        const maxD = Object.values(data).reduce((a, x) => (x.date > a ? x.date : a), '');
        for (const x of Object.values(data)) if (x.date < maxD) { x.chg = null; x.vol = 0; } // suspend / tidak diperdagangkan
        const m = d.meta || {};
        stamp = 'Snapshot ' + (m.built ? new Date(m.built).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB' : '') + ' — mencoba data live…';
    }

    async function refreshLive() {
        const api = typeof getEwoksLiveApi === 'function' ? getEwoksLiveApi() : '';
        if (!api || !codes.length) return;
        try {
            const d = await ewoksFetchScreener(codes);
            let c = 0;
            for (const [t, a] of Object.entries(d.q)) {
                const [p, prev, chg, vol] = a;
                if (!data[t] || !Number.isFinite(p) || p <= 0) continue;
                data[t].p = p; data[t].prev = prev;
                data[t].chg = Number.isFinite(chg) ? chg : (prev > 0 ? ((p - prev) / prev) * 100 : null);
                if (Number.isFinite(vol)) data[t].vol = vol;
                c++;
            }
            live = c > 0;
            const hhmm = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.');
            stamp = `Live Yahoo · ${hhmm} WIB · ${c} saham` + (d.ok < d.total ? ` (${d.ok}/${d.total} bagian)` : '');
        } catch (e) {
            stamp = (live ? 'Live gagal diperbarui' : 'Snapshot harian') + ' (' + (/abort/i.test(String(e.message)) ? 'timeout' : e.message) + ')';
        }
        renderMovers();
        renderTape();
    }

    (async function init() {
        injectCard();
        try { await loadStatic(); } catch (e) { stamp = 'Gagal memuat data screener'; }
        renderMovers();
        renderTape();
        refreshLive();
        setInterval(() => { if (typeof isIdxMarketOpen !== 'function' || isIdxMarketOpen()) refreshLive(); }, 10 * 60 * 1000);
    })();
})();
