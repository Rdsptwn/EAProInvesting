/* Beranda: Pilihan Instrumen (ETF / Reksa Dana / SBN / Deposito) dari database Pasar Global + harga ETF live via Worker. */
(function () {
    'use strict';
    if (document.body.getAttribute('data-page') !== 'home') return;
    const $ = (id) => document.getElementById(id);
    const V = () => encodeURIComponent(window.EWOKS_ASSET_V || '1');
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const base = () => (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    const DEPOSITO = 5.0; // referensi: sama dengan tabel di halaman Obligasi & Fixed Income
    let picks = [], live = {}, macro = {}, active = null, chart = null, stampTxt = '';

    const f1 = (n, d = 1) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
    const riskRank = (r) => ['Sangat Rendah', 'Rendah', 'Moderat', 'Moderat-Tinggi', 'Tinggi', 'Sangat Tinggi', 'Ekstrem'].indexOf(r);

    function buildPicks(pg) {
        const I = pg.instruments || [], yr = (pg.yearlyRef || []).filter((y) => y.ticker);
        const byT = (t) => I.find((i) => i.ticker === t);
        const major = yr.map((y) => byT(y.ticker)).filter((i) => i && i.assetClass === 'ETF' && Number.isFinite(i.cagr));
        const growth = major.filter((i) => riskRank(i.risk) <= 4).sort((a, b) => b.cagr - a.cagr)[0];
        const core = major.filter((i) => i !== growth && riskRank(i.risk) >= 2 && riskRank(i.risk) <= 3).sort((a, b) => b.cagr - a.cagr)[0];
        const out = [];
        const etf = (i, cat) => i && out.push({ key: i.ticker, kind: 'etf', cat, color: 'indigo', title: i.ticker, sub: i.name, cagr: i.cagr, years: i.cagrYears || 10, risk: i.risk,
            link: `pasar-global.html?q=${encodeURIComponent(i.ticker)}`, linkLabel: 'Buka di Database ETF', yr: yr.find((y) => y.ticker === i.ticker) });
        etf(growth, 'ETF Pertumbuhan');
        etf(core, 'ETF Inti');
        const ver = (cls, basis) => I.filter((i) => i.assetClass === cls && i.cagrBasis === basis && Number.isFinite(i.cagr)).sort((x, y) => y.cagr - x.cagr);
        const rds = ver('Reksa Dana Pendapatan Tetap', 'return1y');
        const sbns = I.filter((i) => i.assetClass === 'Obligasi Negara / SBN' && i.cagrBasis === 'kupon' && Number.isFinite(i.cagr)).sort((x, y) => y.cagr - x.cagr);
        const deps = ver('Deposito', 'bunga');
        const rd = rds[0], sb = sbns[0], dp = deps[0];
        const lbl = (i) => (i.assetClass === 'Deposito' ? i.name.replace(/\s*\(.*$/, '').replace(/^Bank /, '') : i.ticker);
        const bar = (arr) => arr.map((i) => [lbl(i), i.cagr]);
        if (rd) out.push({ key: rd.ticker, kind: 'bars', cat: 'Reksa Dana', color: 'blue', title: rd.name, sub: 'Pendapatan tetap · AUM ' + (rd.aum || '—'), big: rd.cagr, bigLbl: 'return 1 th', risk: rd.risk, badge: 'MEI 2026',
            link: `pasar-global.html?q=${encodeURIComponent(rd.ticker)}`, linkLabel: 'Buka di Database Reksa Dana', chartTitle: 'Return 1 tahun — 5 reksa dana pendapatan tetap teratas (%)', rows: bar(rds.slice(0, 5)), hi: rd.ticker });
        if (sb) out.push({ key: sb.ticker, kind: 'bars', cat: 'Obligasi / SBN', color: 'emerald', title: sb.ticker, sub: sb.name.replace(/^[A-Z0-9]+\s*/, '').replace(/[()]/g, '') + ' · kupon tetap', big: sb.cagr, bigLbl: 'kupon p.a.', risk: sb.risk, badge: 'KUPON 2026', asOf: 'berikutnya ST017: 6 Nov–2 Des',
            link: `pasar-global.html?q=${encodeURIComponent(sb.ticker)}`, linkLabel: 'Buka di Database SBN', chartTitle: 'Kupon SBN ritel 2026 — tenor terpanjang (% p.a.)', rows: bar(sbns.slice(0, 6)), hi: sb.ticker });
        if (dp) out.push({ key: dp.ticker, kind: 'bars', cat: 'Deposito', color: 'amber', title: dp.name.replace(/\s*\(.*$/, ''), sub: 'Bank digital · di atas batas LPS 3,75% tidak dijamin', big: dp.cagr, bigLbl: 'bunga maks.', risk: dp.risk, badge: 'OKT 2026',
            link: `pasar-global.html?q=${encodeURIComponent(dp.ticker)}`, linkLabel: 'Buka di Database Deposito', chartTitle: 'Bunga deposito maks. — bank digital vs bank besar (% p.a.)', rows: bar(deps), hi: lbl(dp) });
        return out;
    }

    function spark(c, up) {
        if (!c || c.length < 2) return '';
        const w = 100, h = 28, mn = Math.min(...c), mx = Math.max(...c), r = mx - mn || 1;
        const pts = c.map((v, i) => `${(i / (c.length - 1) * w).toFixed(1)},${(h - 2 - ((v - mn) / r) * (h - 4)).toFixed(1)}`).join(' ');
        return `<svg viewBox="0 0 ${w} ${h}" class="hp-spark" preserveAspectRatio="none"><polyline fill="none" stroke="${up ? '#16a34a' : '#dc2626'}" stroke-width="2" stroke-linejoin="round" points="${pts}"/></svg>`;
    }

    function cardHtml(p) {
        let big, small, badge, sp = '';
        if (p.kind === 'etf') {
            const L = live[p.key];
            if (L) {
                const up = L.chg >= 0;
                big = `<span class="hp-big">$${f1(L.price, 2)}</span><span class="hp-chg ${up ? 'up' : 'dn'}">${up ? '+' : ''}${f1(L.chg, 2)}%</span>`;
                sp = spark(L.c, up);
                badge = '<span class="hp-badge live">LIVE</span>';
            } else {
                big = `<span class="hp-big">${f1(p.cagr)}%</span><span class="hp-chg">CAGR ${p.years}th</span>`;
                badge = '<span class="hp-badge">ARSIP</span>';
            }
            small = `CAGR ${p.years}th <b>${f1(p.cagr)}%</b> · Risiko ${esc(p.risk)}`;
        } else {
            big = `<span class="hp-big">${f1(p.big, 2)}%</span><span class="hp-chg">${p.bigLbl}</span>`;
            badge = `<span class="hp-badge ${p.badge === 'HARIAN' ? 'live' : ''}">${p.badge}</span>`;
            small = `Risiko ${esc(p.risk)}${p.asOf ? ' · ' + esc(p.asOf) : ''}`;
        }
        return `<div class="hp-card ${active === p.key ? 'on' : ''} hp-${p.color}" role="button" tabindex="0" onclick="homePick('${p.key}')" onkeydown="if(event.key==='Enter')homePick('${p.key}')">
            <div class="hp-top"><span class="hp-cat">${esc(p.cat)}</span>${badge}</div>
            <div class="hp-title">${esc(p.title)}</div>
            <div class="hp-sub">${esc(p.sub)}</div>
            <div class="hp-row">${big}</div>
            ${sp}
            <div class="hp-small">${small}</div>
            <a class="hp-go" href="${p.link}" onclick="event.stopPropagation()" title="${esc(p.linkLabel)}"><i class="fas fa-arrow-up-right-from-square"></i></a>
        </div>`;
    }

    function render() {
        const g = $('hp-grid');
        if (!g) return;
        g.innerHTML = picks.map(cardHtml).join('');
        $('hp-stamp').textContent = stampTxt;
        if (active) drawDetail();
    }

    window.homePick = function (k) {
        active = active === k ? null : k;
        render();
        if (!active) { $('hp-detail').classList.add('hidden'); if (chart) { chart.destroy(); chart = null; } }
    };

    function drawDetail() {
        const p = picks.find((x) => x.key === active), box = $('hp-detail');
        if (!p) return;
        box.classList.remove('hidden');
        const dark = document.body.classList.contains('dark-mode-override');
        const grid = dark ? 'rgba(148,163,184,.15)' : 'rgba(148,163,184,.25)', txt = dark ? '#94a3b8' : '#64748b';
        $('hp-canvas').parentElement.style.height = '240px';
        let note = '', cfg;
        if (p.kind === 'etf' && live[p.key] && live[p.key].c.length > 1) {
            const L = live[p.key], up = L.c[L.c.length - 1] >= L.c[0];
            const col = up ? '#16a34a' : '#dc2626';
            note = `Harga penutupan harian 3 bulan terakhir (USD). Terakhir: ${new Date(L.t[L.t.length - 1] * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}.`;
            cfg = { type: 'line', data: { labels: L.t.map((s) => new Date(s * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })), datasets: [{ data: L.c, borderColor: col, backgroundColor: up ? 'rgba(22,163,74,.12)' : 'rgba(220,38,38,.12)', fill: true, pointRadius: 0, borderWidth: 2, tension: .2 }] },
                options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: txt, maxTicksLimit: 6 }, grid: { color: grid } }, y: { position: 'right', ticks: { color: txt }, grid: { color: grid }, grace: '3%' } } } };
        } else if (p.kind === 'etf' && p.yr && p.yr.yearly) {
            const ys = p.yr.yearly.slice(-8);
            note = 'Return tahunan (data arsip; harga live belum tersedia dari Worker).';
            cfg = { type: 'bar', data: { labels: ys.map((y) => y.year), datasets: [{ data: ys.map((y) => y.return), backgroundColor: ys.map((y) => (y.return >= 0 ? '#16a34a' : '#dc2626')) }] },
                options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: txt }, grid: { display: false } }, y: { ticks: { color: txt, callback: (v) => v + '%' }, grid: { color: grid } } } } };
        } else {
            const rows = p.rows || [];
            note = 'Data dikumpulkan dari media keuangan (lihat sumber di database); bukan harga pasar real-time, bisa berubah sewaktu-waktu.';
            cfg = { type: 'bar', data: { labels: rows.map((r) => r[0]), datasets: [{ data: rows.map((r) => r[1]), backgroundColor: rows.map((r) => (r[0] === p.hi ? '#2563eb' : '#94a3b8')), borderRadius: 6 }] },
                options: { indexAxis: 'y', plugins: { legend: { display: false }, title: { display: !!p.chartTitle, text: p.chartTitle, color: txt, font: { size: 11 } } }, scales: { x: { ticks: { color: txt, callback: (v) => v + '%' }, grid: { color: grid } }, y: { ticks: { color: txt, autoSkip: false, font: { size: 11 } }, grid: { display: false } } } } };
            const h = Math.max(220, rows.length * 30 + 70);
            $('hp-canvas').parentElement.style.height = h + 'px';
        }
        $('hp-dtitle').textContent = `${p.title} — ${p.cat}`;
        $('hp-dnote').textContent = note;
        $('hp-dlink').href = p.link;
        $('hp-dlink').innerHTML = `${esc(p.linkLabel)} <i class="fas fa-arrow-right ml-1"></i>`;
        if (typeof Chart === 'undefined') return;
        if (chart) chart.destroy();
        cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: false }, cfg.options);
        chart = new Chart($('hp-canvas'), cfg);
    }

    function inject() {
        const anchor = $('home-movers') || document.querySelector('#page-home > .grid');
        if (!anchor || $('home-picks')) return;
        const sec = document.createElement('div');
        sec.id = 'home-picks';
        sec.className = 'premium-card p-6 md:p-8 mb-10';
        sec.innerHTML = `
            <div class="flex flex-wrap items-center gap-3 mb-1">
                <h3 class="text-xl font-black text-slate-900 flex items-center gap-3"><i class="fas fa-seedling text-emerald-500"></i> Pilihan Instrumen</h3>
                <a href="pasar-global.html" class="ml-auto text-[11px] font-black text-blue-600 hover:underline">Semua database <i class="fas fa-arrow-right"></i></a>
            </div>
            <p id="hp-stamp" class="text-[10px] font-bold text-blue-600 mb-4">Memuat…</p>
            <div id="hp-grid" class="hp-grid"></div>
            <div id="hp-detail" class="hidden hp-detail">
                <div class="flex flex-wrap items-center gap-3 mb-2">
                    <div class="font-black text-sm text-slate-900" id="hp-dtitle"></div>
                    <a id="hp-dlink" href="#" class="ml-auto bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700"></a>
                </div>
                <div style="height:240px"><canvas id="hp-canvas"></canvas></div>
                <p id="hp-dnote" class="text-[10px] text-slate-400 mt-2"></p>
            </div>
            <p class="text-[10px] text-slate-400 mt-4">Dipilih otomatis dari data CAGR dan tingkat risiko di database; untuk edukasi, bukan saran membeli. Ketuk kartu untuk grafik, ikon panah untuk langsung ke database.</p>`;
        anchor.insertAdjacentElement('afterend', sec);
    }

    async function liveEtf() {
        const api = typeof getEwoksLiveApi === 'function' ? getEwoksLiveApi() : '';
        const etfs = picks.filter((p) => p.kind === 'etf');
        if (!api || !etfs.length) return;
        let ok = 0, err = '';
        await Promise.all(etfs.map(async (p) => {
            try {
                const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 25000);
                const r = await fetch(`${api}/chart?s=${encodeURIComponent(p.key)}&g=1&range=3mo&interval=1d`, { signal: ctl.signal, cache: 'no-store' });
                clearTimeout(tm);
                const d = await r.json();
                if (!d.ok || !d.c || d.c.length < 2) throw new Error(d.error || 'HTTP ' + r.status);
                const price = d.price || d.c[d.c.length - 1], prev = Number.isFinite(d.prev) ? d.prev : d.c[d.c.length - 2];
                live[p.key] = { c: d.c, t: d.t, price, prev, chg: prev > 0 ? ((price - prev) / prev) * 100 : 0 };
                ok++;
            } catch (e) { err = /abort/i.test(String(e.message)) ? 'timeout' : String(e.message); }
        }));
        const hhmm = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.');
        stampTxt = ok ? `Harga ETF live Yahoo · ${hhmm} WIB · RD, SBN, deposito = data database` : `Harga ETF live belum tersedia (${err || 'Worker'}) — menampilkan data database`;
        render();
    }

    (async function init() {
        inject();
        try {
            const [pg, mc] = await Promise.all([
                fetch(`${base()}assets/data/pasar-global.json?v=${V()}`, { cache: 'no-store' }).then((r) => r.json()),
                fetch(`${base()}assets/data/macro.json?v=${V()}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({}))
            ]);
            macro = mc || {};
            picks = buildPicks(pg);
            stampTxt = 'Data database Pasar Global · memuat harga live…';
            render();
        } catch (e) { const s = $('hp-stamp'); if (s) s.textContent = 'Gagal memuat database instrumen'; return; }
        liveEtf();
        setInterval(liveEtf, 10 * 60 * 1000);
    })();
})();
