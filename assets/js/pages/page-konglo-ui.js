// --- PETA KONGLOMERAT ---
// --- LOGO PERUSAHAAN / GRUP (favicon situs resmi; inisial bila tidak ada) ---
let kgLogos = null;
let kgLogosLoading = false;
function kgLoadLogos() {
    if (kgLogos || kgLogosLoading) return;
    kgLogosLoading = true;
    const base = typeof EwoksSiteContext !== 'undefined' ? EwoksSiteContext.basePath : '/';
    fetch(`${base}assets/data/logos.json?v=${encodeURIComponent(window.EWOKS_ASSET_V || '1')}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
            kgLogos = j || { groups: {}, tickers: {} };
            if (typeof searchKonglo === 'function' && document.getElementById('group-grid')) searchKonglo();
            if (typeof window.__kongloRepaint === 'function') window.__kongloRepaint();
        })
        .catch(() => { kgLogos = { groups: {}, tickers: {} }; });
}
function kgLogoDomain(kind, key) {
    return kgLogos && kgLogos[kind] ? kgLogos[kind][key] || '' : '';
}
/** Gambar logo menimpa inisial; kalau gagal dimuat, inisial tetap terlihat. */
function kgLogoImg(domain, cls) {
    if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) return '';
    return `<img class="${cls}" src="https://www.google.com/s2/favicons?domain=${domain}&sz=128" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`;
}

function kgHue(str) {
    let h = 0;
    for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
}

function kgFmtPct(v) {
    if (v == null || !Number.isFinite(v)) return '—';
    return `${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(2)}%`;
}

function kgChipClass(v) {
    if (v == null || !Number.isFinite(v)) return 'kg-chip flat';
    return v > 0 ? 'kg-chip up' : v < 0 ? 'kg-chip down' : 'kg-chip flat';
}

function kgGroupStats(group) {
    const quotes = group.stocks
        .map((st) => (typeof getIdxQuote === 'function' ? getIdxQuote(st.ticker) : null))
        .filter((q) => q && q.changePct != null && Number.isFinite(q.changePct));
    const avg = quotes.length ? quotes.reduce((t, q) => t + q.changePct, 0) / quotes.length : null;
    return { avg, covered: quotes.length };
}

function kongloRenderStats() {
    const box = document.getElementById('kg-stats');
    if (!box || typeof dataGroups === 'undefined') return;
    const tickers = new Set();
    const sectors = new Set();
    let up = 0, down = 0;
    dataGroups.forEach((g) => g.stocks.forEach((st) => {
        if (tickers.has(st.ticker)) return;
        tickers.add(st.ticker);
        sectors.add(String(st.sector || '').split(/[(&/]/)[0].trim());
        const q = typeof getIdxQuote === 'function' ? getIdxQuote(st.ticker) : null;
        if (q && q.changePct != null) { if (q.changePct > 0) up++; else if (q.changePct < 0) down++; }
    }));
    const tile = (label, value, sub, cls = '') => `<div class="kg-stat"><p class="kg-stat-label">${label}</p><p class="kg-stat-value ${cls}">${value}</p><p class="kg-stat-sub">${sub}</p></div>`;
    box.innerHTML =
        tile('Grup & tokoh', dataGroups.length, 'konglomerat dan investor besar') +
        tile('Emiten dipetakan', tickers.size, `${sectors.size} sektor`) +
        tile('Naik hari ini', up, 'emiten hijau', 'text-up') +
        tile('Turun hari ini', down, 'emiten merah', 'text-down');
}

function renderGrid(groups = dataGroups) {
    const gridContainer = document.getElementById('group-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    kgLoadLogos();
    kongloRenderStats();

    if(groups.length === 0) {
        gridContainer.innerHTML = `<div class="col-span-full text-center p-8 text-slate-500">Grup tidak ditemukan.</div>`;
        return;
    }

    groups.forEach(group => {
        const numStocks = group.stocks.length;
        const hue = kgHue(group.id || group.name);
        const st = kgGroupStats(group);
        const chips = group.stocks.slice(0, 5).map((s) => {
            const q = typeof getIdxQuote === 'function' ? getIdxQuote(s.ticker) : null;
            const v = q && q.changePct != null ? q.changePct : null;
            const sb = typeof ewoksStatusOf === 'function' ? ewoksStatusOf(s.ticker) : [];
            return `<span class="kg-tk"><b>${escapeHtml(s.ticker)}</b>${sb.length ? `<em class="st-bd st-${sb[0][0]}" title="${escapeHtml(sb.map((f) => f[1]).join(' | '))}">${sb.length > 1 ? sb.length + '!' : ewoksStatusLabel(sb[0][0])}</em>` : ''}<i class="${v == null ? 'flat' : v >= 0 ? 'up' : 'down'}">${v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(1) + '%'}</i></span>`;
        }).join('');
        const more = numStocks > 5 ? `<span class="kg-tk more">+${numStocks - 5}</span>` : '';
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'kg-card premium-card no-hover-lift dark-mode-card';
        card.onclick = () => showDetail(group.id);
        card.innerHTML = `
            <div class="kg-card-top">
                <span class="kg-avatar" style="background:linear-gradient(135deg,hsl(${hue} 75% 55%),hsl(${(hue + 40) % 360} 70% 45%))">${escapeHtml(group.name.charAt(0))}${kgLogoImg(kgLogoDomain('groups', group.id), 'kg-logo')}</span>
                <div class="min-w-0 flex-1">
                    <h4 class="kg-card-title">${escapeHtml(group.name)}</h4>
                    <p class="kg-card-meta">${numStocks} emiten</p>
                </div>
                <span class="${kgChipClass(st.avg)}" title="Rata-rata perubahan harga emiten grup hari ini">${kgFmtPct(st.avg)}</span>
            </div>
            <p class="kg-card-desc">${escapeHtml(group.desc)}</p>
            <div class="kg-chips">${chips}${more}</div>
        `;
        gridContainer.appendChild(card);
    });
}

function searchKonglo() {
    const q = document.getElementById('kongloSearch').value.toLowerCase();
    const filtered = dataGroups.filter(g => {
        const matchNameDesc = g.name.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q);
        const matchTicker = g.stocks.some(s => s.ticker.toLowerCase().includes(q) || String(s.company || '').toLowerCase().includes(q));
        return matchNameDesc || matchTicker;
    });
    renderGrid(filtered);
}

function kongloSetView(viewId) {
    ['konglo-dashboard-view', 'konglo-detail-view', 'konglo-funda-view'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('hide');
        el.hidden = true;
        el.style.display = 'none';
    });
    const show = document.getElementById(viewId);
    if (!show) return;
    show.classList.remove('hide');
    show.hidden = false;
    show.style.display = '';
}

function kongloQuoteCells(stock) {
    const q = typeof getIdxQuote === 'function' ? getIdxQuote(stock.ticker) : null;
    const price = q?.price != null ? `Rp ${formatIdxPrice(q.price)}` : 'Menunggu data pasar';
    const chg = q?.changePct != null
        ? `${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%`
        : '—';
    const chgClass = (q?.changePct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600';
    const avg = q?.avg != null ? `Rp ${formatIdxPrice(q.avg)}` : '—';
    const prev = q?.prevClose != null ? `Rp ${formatIdxPrice(q.prevClose)}` : '—';
    const support = q?.support != null ? `Rp ${formatIdxPrice(q.support)}` : '—';
    const resist = q?.resistance != null ? `Rp ${formatIdxPrice(q.resistance)}` : '—';
    const stamp = typeof kongloDailyStampText === 'function'
        ? kongloDailyStampText()
        : (typeof formatJakartaLongDate === 'function' ? formatJakartaLongDate() : '');
    return { price, chg, chgClass, avg, prev, support, resist, stamp, name: q?.name || '', live: q?.price != null };
}

function showDetail(groupId) {
    const group = dataGroups.find(g => g.id === groupId);
    if (!group) return;

    kongloSetView('konglo-detail-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('detail-title').innerText = group.name;
    {
        const t = document.getElementById('detail-title');
        const old = document.getElementById('detail-logo');
        if (old) old.remove();
        const lg = kgLogoImg(kgLogoDomain('groups', group.id), 'kg-clogo');
        if (lg) t.insertAdjacentHTML('beforebegin', lg.replace('<img ', '<img id="detail-logo" style="width:44px;height:44px;margin:1rem 0 0;display:block" '));
    }
    document.getElementById('detail-desc').innerText = group.desc;
    const priceNote = document.getElementById('detail-price-note');
    if (priceNote) {
        const built = typeof __ewoksMarketSnapshot !== 'undefined' ? (__ewoksMarketSnapshot?.meta?.liveAt || __ewoksMarketSnapshot?.meta?.built) : null;
        priceNote.textContent = built && typeof formatStampWib === 'function'
            ? `Harga emiten · update ${formatStampWib(built)}`
            : 'Harga emiten (data pasar belum tersedia)';
    }

    const stockList = document.getElementById('stock-list');
    stockList.innerHTML = '';

    const paint = () => {
        const priceNote = document.getElementById('detail-price-note');
        if (priceNote) {
            const built = typeof __ewoksMarketSnapshot !== 'undefined' ? (__ewoksMarketSnapshot?.meta?.liveAt || __ewoksMarketSnapshot?.meta?.built) : null;
            priceNote.textContent = built && typeof formatStampWib === 'function'
                ? `Harga emiten · update ${formatStampWib(built)}`
                : 'Harga emiten (data pasar belum tersedia)';
        }
        stockList.innerHTML = '';
        group.stocks.forEach(stock => {
            const q = kongloQuoteCells(stock);
            const company = String(stock.company || q.name || stock.ticker).replace(/,$/, '');
            const quote = typeof getIdxQuote === 'function' ? getIdxQuote(stock.ticker) : null;
            const hue = kgHue(stock.ticker);
            const pct = quote && quote.changePct != null ? quote.changePct : null;
            let rangeHtml = '';
            if (quote && quote.support != null && quote.resistance != null && quote.price != null && quote.resistance > quote.support) {
                const pos = Math.max(0, Math.min(100, ((quote.price - quote.support) / (quote.resistance - quote.support)) * 100));
                rangeHtml = `<div class="kg-range"><div class="kg-range-bar"><span style="left:${pos.toFixed(1)}%"></span></div><div class="kg-range-lbl"><span>Support 20h<br><b>${q.support}</b></span><span class="text-right">Resisten 20h<br><b>${q.resist}</b></span></div></div>`;
            }
            const safeTicker = String(stock.ticker).replace(/[^A-Z0-9]/gi, '');
            const safeCompany = String(company).replace(/'/g, "\\'");
            const safeSector = String(stock.sector).replace(/'/g, "\\'");
            const stockItem = document.createElement('article');
            stockItem.className = 'kg-stock premium-card no-hover-lift dark-mode-card';
            stockItem.innerHTML = `
            <div class="kg-stock-head">
                <span class="kg-tkbadge" style="background:hsl(${hue} 80% 94%);color:hsl(${hue} 60% 32%)">${escapeHtml(stock.ticker)}</span>${kgLogoImg(kgLogoDomain('tickers', stock.ticker), 'kg-clogo')}
                <div class="min-w-0 flex-1">
                    <p class="kg-name">${escapeHtml(company)}</p>
                    <p class="kg-sub">${escapeHtml(stock.sector)}</p>
                </div>
                <div class="kg-price">
                    <p class="kg-price-val">${q.live ? q.price : '—'}</p>
                    <span class="${kgChipClass(pct)}">${kgFmtPct(pct)}</span>
                </div>
            </div>
            ${typeof ewoksStatusBadges === 'function' && ewoksStatusOf(stock.ticker).length ? `<div class="st-row" style="margin:6px 0">${ewoksStatusBadges(stock.ticker)}</div>` : ''}
            ${typeof ewoksStatusLinks === 'function' ? `<div style="margin:4px 0">${ewoksStatusLinks(stock.ticker)}</div>` : ''}
            ${rangeHtml}
            <div class="kg-metrics">
                <div><p>Kepemilikan</p><b>${escapeHtml(stock.kepemilikan_persen)}</b></div>
                <div><p>Free float</p><b>${escapeHtml(stock.free_float)}</b></div>
                <div><p>Close kemarin</p><b>${q.prev}</b></div>
                <div><p>MA 50 hari</p><b>${q.avg}</b></div>
            </div>
            <details class="kg-more">
                <summary>Kepemilikan, sejarah, broker afiliasi</summary>
                <div class="kg-more-body">
                    <p class="kg-more-h">Status kepemilikan (${escapeHtml(stock.tahun_masuk)})</p>
                    <p>${escapeHtml(stock.ownership)}</p>
                    <p class="kg-more-h">Sejarah</p>
                    <p>${escapeHtml(stock.sejarah)}</p>
                    <p class="kg-more-h">Top broker afiliasi</p>
                    <p>${escapeHtml(stock.broker_afiliasi)}</p>
                </div>
            </details>
            <div class="kg-actions">
                <button type="button" onclick="showFunda('${safeTicker}', '${safeCompany}', '${safeSector}')" class="kg-btn primary"><i class="fas fa-chart-bar"></i> Analisis Fundamental</button>
                <button type="button" onclick="showPage('watchlist')" class="kg-btn" title="Buka Watchlist"><i class="fas fa-star"></i></button>
            </div>`;
            stockList.appendChild(stockItem);
        });
    };

    paint();
    window.__ewoksLiveTickers = group.stocks.map((s) => s.ticker);
    window.__kongloRepaint = paint;
    if (typeof loadEwoksMarketSnapshot === 'function') {
        loadEwoksMarketSnapshot().then(paint);
    }
    if (typeof refreshLiveQuotes === 'function') refreshLiveQuotes(false);
}

function hideDetail() {
    window.__ewoksLiveTickers = [];
    window.__kongloRepaint = null;
    kongloSetView('konglo-dashboard-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- FUNDAMENTAL PRO: metrik turunan dari laporan keuangan ---
function FUNDA_YEAR_LABELS() {
    return typeof getFundaYearLabels === 'function'
        ? getFundaYearLabels()
        : ['2020', '2021', '2022', '2023', '2024', '2025', 'Q2 2026'];
}
const FUNDA_EMPTY = '(-)';
const FUNDA_MIN_TRILIUN = 0.05;
const FUNDA_MIN_MILIAR = 0.001;
const FUNDA_MAX_NPM = 85;
const FUNDA_MAX_ROE = 80;
const FUNDA_MAX_ROA = 35;

function fundaNum(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
}

/** Nilai disimpan dalam triliun Rp; tampilkan triliun atau miliar. */
function formatFundaAmount(triliunVal) {
    const n = fundaNum(triliunVal);
    const abs = Math.abs(n);
    if (abs < FUNDA_MIN_MILIAR) return FUNDA_EMPTY;
    const sign = n < 0 ? '-' : '';
    if (abs >= 1) return `${sign}${abs.toFixed(1)} triliun`;
    return `${sign}${(abs * 1000).toFixed(1)} miliar`;
}

function formatFundaAmountExpense(triliunVal) {
    const n = fundaNum(triliunVal);
    if (Math.abs(n) < FUNDA_MIN_MILIAR) return FUNDA_EMPTY;
    const formatted = formatFundaAmount(Math.abs(n));
    return formatted === FUNDA_EMPTY ? FUNDA_EMPTY : `-${formatted}`;
}

function fmtFundaCell(v, i, opts = {}) {
    const n = fundaNum(v);
    if (i === 6 && Math.abs(n) < FUNDA_MIN_MILIAR) return FUNDA_EMPTY;
    if (Math.abs(n) < FUNDA_MIN_MILIAR) return FUNDA_EMPTY;
    return opts.expense ? formatFundaAmountExpense(v) : formatFundaAmount(v);
}

function fmtFundaGross(d, i, isBank) {
    const rev = fundaNum(d.rev[i]);
    if (rev < FUNDA_MIN_MILIAR) return FUNDA_EMPTY;
    const gross = isBank ? rev : rev - Math.abs(fundaNum(d.cogs[i]));
    return formatFundaAmount(gross);
}

function fundaYearHasData(d, i) {
    const rev = fundaNum(d.rev[i]);
    const net = fundaNum(d.net[i]);
    const eq = fundaNum(d.eq[i]);
    const asset = fundaNum(d.asset[i]);
    return (
        rev >= FUNDA_MIN_TRILIUN ||
        net >= FUNDA_MIN_TRILIUN ||
        (eq >= FUNDA_MIN_TRILIUN && asset >= FUNDA_MIN_TRILIUN)
    );
}

function fundaLatestIdx(d, keys = ['net']) {
    for (let i = 6; i >= 0; i--) {
        if (i === 6 && !fundaYearHasData(d, i)) continue;
        if (keys.some((k) => fundaNum(d[k]?.[i]) >= FUNDA_MIN_TRILIUN)) return i;
    }
    for (let i = 5; i >= 0; i--) {
        if (fundaYearHasData(d, i)) return i;
    }
    return 5;
}

function fundaPct(numer, denom, maxAbs = 150) {
    if (denom < FUNDA_MIN_TRILIUN || Math.abs(numer) < 1e-6) return null;
    const p = (numer / denom) * 100;
    if (!Number.isFinite(p) || Math.abs(p) > maxAbs) return null;
    return +p.toFixed(1);
}

function fundaGrossProfit(d, i, isBank) {
    const rev = fundaNum(d.rev[i]);
    if (isBank) {
        const intExp = Math.abs(fundaNum(d.interest[i]));
        return rev >= FUNDA_MIN_MILIAR ? rev - intExp : 0;
    }
    return rev - Math.abs(fundaNum(d.cogs[i]));
}

function getKongloSectorMultiples(sector) {
    const s = String(sector || '');
    if (s.includes('Perbankan')) return { per: 14, pbv: 2.2, label: 'Perbankan' };
    if (s.includes('Pertambangan')) return { per: 8, pbv: 1.2, label: 'Pertambangan' };
    if (s.includes('Properti')) return { per: 10, pbv: 0.95, label: 'Properti' };
    if (s.includes('Teknologi') || s.includes('E-Commerce')) return { per: 22, pbv: 2.8, label: 'Teknologi' };
    if (s.includes('Energi')) return { per: 9, pbv: 1.1, label: 'Energi' };
    if (s.includes('Konsumsi') || s.includes('FMCG') || s.includes('Ritel')) return { per: 16, pbv: 2.0, label: 'Konsumsi' };
    return { per: 12, pbv: 1.5, label: 'Industri' };
}

function bundleMetricSeries(d, key) {
    const arr = d[key];
    if (!Array.isArray(arr) || arr.length < 7) return null;
    return arr.map((v) => (v === null || v === undefined || v === '' ? null : fundaNum(v) || null));
}

function computeKongloDerivedMetrics(d, sector) {
    const isBank = String(sector).includes('Perbankan');
    const bundledNpm = bundleMetricSeries(d, 'npm');
    const bundledGm = bundleMetricSeries(d, 'grossMargin');
    const bundledRoe = bundleMetricSeries(d, 'roe');
    const bundledRoa = bundleMetricSeries(d, 'roa');

    const npm = [];
    const roe = [];
    const roa = [];
    const grossMargin = [];
    const leverage = [];

    for (let i = 0; i < 7; i++) {
        if (!fundaYearHasData(d, i)) {
            npm.push(null);
            grossMargin.push(null);
            roe.push(null);
            roa.push(null);
            leverage.push(FUNDA_EMPTY);
            continue;
        }

        const rev = fundaNum(d.rev[i]);
        const net = fundaNum(d.net[i]);
        const asset = fundaNum(d.asset[i]);
        const eq = fundaNum(d.eq[i]);
        const gross = fundaGrossProfit(d, i, isBank);
        const annualize = i === 6 ? 4 : 1;

        const npmVal =
            bundledNpm?.[i] != null && Number.isFinite(bundledNpm[i])
                ? bundledNpm[i]
                : fundaPct(net, rev, FUNDA_MAX_NPM);
        const gmVal =
            bundledGm?.[i] != null && Number.isFinite(bundledGm[i])
                ? bundledGm[i]
                : fundaPct(gross, rev, FUNDA_MAX_NPM);
        const roeVal =
            bundledRoe?.[i] != null && Number.isFinite(bundledRoe[i])
                ? bundledRoe[i]
                : fundaPct(net * annualize, eq, FUNDA_MAX_ROE);
        const roaVal =
            bundledRoa?.[i] != null && Number.isFinite(bundledRoa[i])
                ? bundledRoa[i]
                : fundaPct(net * annualize, asset, FUNDA_MAX_ROA);

        npm.push(npmVal);
        grossMargin.push(gmVal);
        roe.push(roeVal);
        roa.push(roaVal);

        if (isBank) {
            leverage.push(eq >= FUNDA_MIN_TRILIUN ? `${(asset / eq).toFixed(2)}x` : FUNDA_EMPTY);
        } else {
            const liab = Math.max(0, asset - eq);
            leverage.push(eq >= FUNDA_MIN_TRILIUN ? `${(liab / eq).toFixed(2)}x` : FUNDA_EMPTY);
        }
    }

    const li = fundaLatestIdx(d, ['net', 'eq', 'rev']);
    const fcfVals = d.fcf.map((v) => parseFloat(v)).filter((v) => Number.isFinite(v) && v !== 0);
    const avgFcf = fcfVals.length
        ? +(fcfVals.reduce((a, b) => a + b, 0) / fcfVals.length).toFixed(1)
        : 0;

    const mult = getKongloSectorMultiples(sector);
    const netLi = fundaNum(d.net[li]);
    const eqLi = fundaNum(d.eq[li]);
    const assetLi = fundaNum(d.asset[li]);
    const revLi = fundaNum(d.rev[li]);

    const sotpCore = netLi * mult.per;
    const sotpBook = eqLi * mult.pbv;
    const surplusAssets = Math.max(0, assetLi - eqLi);
    const sotpInvest = surplusAssets * 0.15;
    const totalSotp = sotpCore * 0.55 + sotpBook * 0.35 + sotpInvest * 0.1;

    const intrinsic = totalSotp;
    let mosCalc = null;
    if (eqLi >= FUNDA_MIN_TRILIUN && intrinsic > eqLi) {
        mosCalc = +Math.min(50, Math.max(0, ((intrinsic - eqLi) / intrinsic) * 100)).toFixed(1);
    } else if (eqLi >= FUNDA_MIN_TRILIUN && intrinsic > 0) {
        mosCalc = 0;
    }

    let zscore = 3.5;
    const hasAnyData = [0, 1, 2, 3, 4, 5, 6].some((k) => fundaYearHasData(d, k));
    if (!hasAnyData) zscore = null;
    if (hasAnyData && !isBank && assetLi >= FUNDA_MIN_TRILIUN && eqLi >= FUNDA_MIN_TRILIUN) {
        const tl = Math.max(assetLi - eqLi, assetLi * 0.01);
        const wc = assetLi * 0.1;
        const re = netLi / assetLi;
        const ebit = netLi * 1.15;
        zscore = 1.2 * (wc / assetLi) + 1.4 * re + 3.3 * (ebit / assetLi) + 0.6 * (eqLi / tl) + 1.0 * (revLi / assetLi);
        zscore = +Math.min(6, Math.max(0.5, zscore)).toFixed(2);
    }

    return {
        isBank,
        latestIdx: li,
        latestYear: FUNDA_YEAR_LABELS()[li],
        npm,
        roe,
        roa,
        grossMargin,
        leverage,
        avgFcf,
        mult,
        sotp: {
            segments: [
                {
                    name: `Bisnis Inti (${sector})`,
                    method: 'PER × Laba Bersih',
                    multiple: `${mult.per}× (${mult.label})`,
                    detail: `${formatFundaAmount(netLi)} × ${mult.per}`,
                    value: sotpCore
                },
                {
                    name: 'Nilai Buku Ekuitas (Fair PBV)',
                    method: 'PBV × Total Ekuitas',
                    multiple: `${mult.pbv}×`,
                    detail: `${formatFundaAmount(eqLi)} × ${mult.pbv}`,
                    value: sotpBook
                },
                {
                    name: 'Aset Surplus / Non-Operasi',
                    method: 'Diskon 15% (Aset−Ekuitas)',
                    multiple: FUNDA_EMPTY,
                    detail: `${formatFundaAmount(surplusAssets)} × 0.15`,
                    value: sotpInvest
                }
            ],
            total: totalSotp
        },
        mosCalc,
        zscore,
        latestNpm: npm[li],
        latestRoe: roe[li]
    };
}

function fundaMetricCells(values, opts = {}) {
    const { suffix = '', pct = false, highlightLast = true } = opts;
    return values
        .map((val, i) => {
            const hi = highlightLast && i === 6;
            if (val == null || val === '' || (typeof val === 'number' && !Number.isFinite(val))) {
                return `<td class="${hi ? 'text-blue-300' : 'text-slate-500'}">${FUNDA_EMPTY}</td>`;
            }
            const text = pct ? `${val}%` : `${val}${suffix}`;
            return `<td class="${hi ? 'text-blue-300 font-bold' : ''}">${text}</td>`;
        })
        .join('');
}

// --- FUNDAMENTAL PRO VIEW ---
function showFunda(ticker, company, sector) {
    kongloSetView('konglo-funda-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('funda-ticker').innerText = ticker;
    document.getElementById('funda-company').innerText = company;

    const badge = document.getElementById('funda-source-badge');
    const updatedEl = document.getElementById('funda-updated-at');
    const loadingEl = document.getElementById('funda-loading');
    if (badge) {
        badge.className = 'text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40';
        badge.innerText = 'Memuat data…';
    }
    if (updatedEl) {
        updatedEl.innerText = typeof formatJakartaLongDate === 'function'
            ? formatJakartaLongDate()
            : (typeof getJakartaDateKey === 'function' ? getJakartaDateKey() : '');
    }
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (typeof paintFundaQuarterHeadings === 'function') paintFundaQuarterHeadings();

    resolveKongloFunda(ticker, sector)
        .then(({ data: d, sourceLabel, source }) => {
            if (loadingEl) loadingEl.classList.add('hidden');
            if (badge) {
                const cls = source === 'finnhub' || source === 'yahoo' || source === 'bundle'
                    ? 'text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : source === 'estimate'
                        ? 'text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-[10px] font-bold px-2 py-1 rounded-full bg-slate-600 text-slate-200 border border-slate-500';
                badge.className = cls;
                badge.innerText = (source === 'finnhub' || source === 'yahoo' || source === 'bundle' || source === 'cache')
                    && typeof yahooFundaBadgeText === 'function'
                    ? yahooFundaBadgeText()
                    : (sourceLabel || source);
            }
            if (updatedEl) {
                updatedEl.innerText = typeof formatJakartaLongDate === 'function'
                    ? formatJakartaLongDate()
                    : (typeof getJakartaDateKey === 'function' ? getJakartaDateKey() : '');
            }
            const paintLive = () => {
                const liveEl = document.getElementById('funda-live-price');
                if (!liveEl) return;
                const q = typeof getIdxQuote === 'function' ? getIdxQuote(ticker) : null;
                if (q?.price != null && typeof formatIdxPrice === 'function') {
                    const chg = q.changePct != null ? ` (${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%)` : '';
                    liveEl.textContent = `Harga: Rp ${formatIdxPrice(q.price)}${chg}`;
                } else {
                    liveEl.textContent = 'Harga: belum tersedia';
                }
            };
            paintLive();
            window.__ewoksLiveTickers = [ticker];
            window.__kongloRepaint = paintLive;
            if (typeof refreshLiveQuotes === 'function') refreshLiveQuotes(false);
            renderFundaView(d, ticker, company, sector);
        })
        .catch(() => {
            if (loadingEl) loadingEl.classList.add('hidden');
            const d = generateFunda(ticker, sector);
            renderFundaView(d, ticker, company, sector);
            if (typeof showToast === 'function') showToast('Gagal memuat laporan keuangan. Coba muat ulang halaman.', 'warning');
        });
}

function renderFundaView(d, ticker, company, sector) {
    if (typeof paintFundaQuarterHeadings === 'function') paintFundaQuarterHeadings();
    const isBank = sector.includes("Perbankan");
    const m = computeKongloDerivedMetrics(d, sector);
    const mos = m.mosCalc != null ? m.mosCalc : FUNDA_EMPTY;
    const zscore = m.zscore != null ? m.zscore : null;
    const li = m.latestIdx;

    const lBody = document.getElementById('funda-lapkeu-body');
    lBody.innerHTML = `
        <tr>
            <td class="font-bold text-slate-300">Pendapatan Bersih / Bunga</td>
            ${d.rev.map((v, i) => `<td class="${i === 6 ? 'text-blue-300' : ''}">${fmtFundaCell(v, i)}</td>`).join('')}
        </tr>
        <tr>
            <td class="font-bold text-slate-300">Beban Pokok</td>
            ${d.cogs.map((v, i) => `<td class="${i === 6 ? 'text-blue-300' : ''}">${fmtFundaCell(v, i, { expense: true })}</td>`).join('')}
        </tr>
        <tr class="bg-slate-800/50">
            <td class="font-bold text-blue-400">Laba Kotor</td>
            ${d.rev.map((v, i) => `<td class="text-blue-400 font-bold">${fmtFundaGross(d, i, isBank)}</td>`).join('')}
        </tr>
        <tr>
            <td class="font-bold text-rose-400">Beban Bunga (Hutang)</td>
            ${d.interest.map((v, i) => `<td class="text-rose-400 ${i === 6 ? 'text-rose-300' : ''}">${fmtFundaCell(v, i, { expense: true })}</td>`).join('')}
        </tr>
        <tr>
            <td class="font-bold text-rose-400">Beban Pajak</td>
            ${d.tax.map((v, i) => `<td class="text-rose-400 ${i === 6 ? 'text-rose-300' : ''}">${fmtFundaCell(v, i, { expense: true })}</td>`).join('')}
        </tr>
        <tr class="bg-slate-800/50 border-t border-slate-600">
            <td class="font-bold text-emerald-400">Laba Bersih (Entitas Induk)</td>
            ${d.net.map((v, i) => `<td class="text-emerald-400 font-bold">${fmtFundaCell(v, i)}</td>`).join('')}
        </tr>
        <tr>
            <td class="font-bold text-slate-300">Total Aset</td>
            ${d.asset.map((v, i) => `<td class="${i === 6 ? 'text-blue-300' : ''}">${fmtFundaCell(v, i)}</td>`).join('')}
        </tr>
        <tr>
            <td class="font-bold text-slate-300">Total Ekuitas</td>
            ${d.eq.map((v, i) => `<td class="${i === 6 ? 'text-blue-300' : ''}">${fmtFundaCell(v, i)}</td>`).join('')}
        </tr>
    `;

    const sBody = document.getElementById('funda-sotp-body');
    const sotpRows = m.sotp.segments
        .map(
            (seg) => `
        <tr>
            <td class="text-slate-300">${seg.name}</td>
            <td>${seg.method}<br><span class="text-[10px] text-slate-500">${seg.detail}</span></td>
            <td>${seg.multiple}</td>
            <td class="font-bold text-emerald-400">${formatFundaAmount(seg.value)}</td>
        </tr>`
        )
        .join('');
    sBody.innerHTML = `
        ${sotpRows}
        <tr class="bg-slate-800/80 font-bold border-t-2 border-slate-600">
            <td colspan="3" class="text-right text-blue-400">Total SOTP<br><span class="text-[10px] font-normal text-slate-400">Bobot 55% operasi + 35% buku + 10% surplus · tahun ${m.latestYear}</span></td>
            <td class="text-blue-400 text-lg">${formatFundaAmount(m.sotp.total)}</td>
        </tr>
        <tr class="border-t border-slate-700">
            <td colspan="4" class="text-[10px] text-slate-500 pt-2">Referensi LK: Laba ${formatFundaAmount(d.net[li])} · Ekuitas ${formatFundaAmount(d.eq[li])} · Aset ${formatFundaAmount(d.asset[li])}</td>
        </tr>
    `;

    const dash = document.getElementById('funda-valuation-dashboard');
    let zStatus = zscore == null ? "Data belum tersedia" : zscore >= 3 ? "Aman (Green Zone)" : (zscore >= 1.8 ? "Waspada (Grey Zone)" : "Bahaya (Red Zone)");
    let zColor = zscore == null ? "text-slate-400" : zscore >= 3 ? "text-emerald-400" : (zscore >= 1.8 ? "text-amber-400" : "text-rose-400");
    const npmLatest = m.latestNpm != null ? `${m.latestNpm}%` : FUNDA_EMPTY;
    const roeLatest = m.latestRoe != null ? `${m.latestRoe}%` : FUNDA_EMPTY;
    const divLatest = parseFloat(d.divYield[li]) > 0 ? `${d.divYield[li]}%` : FUNDA_EMPTY;

    dash.innerHTML = `
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center shadow-lg hover:border-emerald-500 transition-colors">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><i class="fas fa-shield-alt text-emerald-500"></i> Margin of Safety</p>
            <p class="text-2xl md:text-3xl font-black text-emerald-400 my-1">${mos}${mos === FUNDA_EMPTY ? '' : '%'}</p>
            <p class="text-[10px] text-slate-500">Dari SOTP vs nilai buku ekuitas</p>
        </div>
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center shadow-lg hover:border-blue-500 transition-colors">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><i class="fas fa-heartbeat text-blue-500"></i> Altman Z-Score</p>
            <p class="text-2xl md:text-3xl font-black ${zColor} my-1">${zscore == null ? FUNDA_EMPTY : zscore}</p>
            <p class="text-[10px] text-slate-500">${zStatus}</p>
        </div>
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center shadow-lg hover:border-indigo-500 transition-colors">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><i class="fas fa-chart-line text-indigo-500"></i> NPM (${m.latestYear})</p>
            <p class="text-2xl md:text-3xl font-black text-blue-400 my-1">${npmLatest}</p>
            <p class="text-[10px] text-slate-500">Laba bersih ÷ pendapatan</p>
        </div>
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center shadow-lg hover:border-purple-500 transition-colors">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><i class="fas fa-percentage text-purple-500"></i> ROE (${m.latestYear})</p>
            <p class="text-2xl md:text-3xl font-black text-purple-400 my-1">${roeLatest}</p>
            <p class="text-[10px] text-slate-500">Laba bersih ÷ ekuitas · Div ${divLatest}</p>
        </div>
    `;

    const levLabel = m.isBank ? 'Equity Multiplier (Aset/Ekuitas)' : 'DER (Hutang/Ekuitas)';
    const mBody = document.getElementById('funda-metrics-body');
    mBody.innerHTML = `
        <tr class="hover:bg-slate-800/30">
            <td class="text-left font-bold text-slate-300">Net Profit Margin (NPM)</td>
            ${fundaMetricCells(m.npm, { pct: true })}
        </tr>
        <tr class="hover:bg-slate-800/30">
            <td class="text-left font-bold text-slate-300">${m.isBank ? 'Margin Pendapatan Bunga' : 'Laba Kotor Margin'}</td>
            ${fundaMetricCells(m.grossMargin, { pct: true })}
        </tr>
        <tr class="hover:bg-slate-800/30">
            <td class="text-left font-bold text-slate-300">ROE (%)</td>
            ${fundaMetricCells(m.roe, { pct: true })}
        </tr>
        <tr class="hover:bg-slate-800/30">
            <td class="text-left font-bold text-slate-300">ROA (%)</td>
            ${fundaMetricCells(m.roa, { pct: true })}
        </tr>
        <tr class="hover:bg-slate-800/30">
            <td class="text-left font-bold text-slate-300">${levLabel}</td>
            ${fundaMetricCells(m.leverage, { highlightLast: true })}
        </tr>
        <tr class="hover:bg-slate-800/30">
            <td class="text-left font-bold text-slate-300">Arus Kas Operasi (OCF)</td>
            ${(d.ocf || d.fcf.map(() => 0)).map((v, i) => `<td class="${i === 6 ? 'text-blue-300 font-bold' : 'text-cyan-400'}">${fmtFundaCell(v, i)}</td>`).join('')}
        </tr>
        <tr class="hover:bg-slate-800/30">
            <td class="text-left font-bold text-slate-300">Free Cash Flow (FCF)</td>
            ${d.fcf.map((v, i) => `<td class="${i === 6 ? 'text-blue-300 font-bold' : 'text-emerald-400'}">${fmtFundaCell(v, i)}</td>`).join('')}
        </tr>
        <tr class="hover:bg-slate-800/30">
            <td class="text-left font-bold text-slate-300">Dividend Yield (%)</td>
            ${d.divYield.map((v, i) => {
                const n = parseFloat(v);
                const empty = !Number.isFinite(n) || n === 0;
                return `<td class="${i === 6 ? 'text-blue-300 font-bold' : 'text-purple-400'}">${empty ? FUNDA_EMPTY : `${v}%`}</td>`;
            }).join('')}
        </tr>
    `;

    const npmBody = document.getElementById('funda-npm-body');
    if (npmBody) {
        npmBody.innerHTML = `
            <tr class="hover:bg-slate-800/30">
                <td class="text-left font-bold text-slate-300">Pendapatan</td>
                ${d.rev.map((v, i) => `<td class="${i === 6 ? 'text-blue-300' : ''}">${fmtFundaCell(v, i)}</td>`).join('')}
            </tr>
            <tr class="hover:bg-slate-800/30">
                <td class="text-left font-bold text-emerald-400">Laba Bersih</td>
                ${d.net.map((v, i) => `<td class="${i === 6 ? 'text-blue-300' : 'text-emerald-400'}">${fmtFundaCell(v, i)}</td>`).join('')}
            </tr>
            <tr class="bg-slate-800/50 border-t border-slate-600">
                <td class="text-left font-bold text-blue-400">NPM (%)</td>
                ${fundaMetricCells(m.npm, { pct: true })}
            </tr>
        `;
    }

    const npmChartData = m.npm.map((v) => (v != null ? v : null));
    renderFundaCharts(d.fcf, d.divYield, npmChartData, ticker);
}

function saveKongloFinnhubToken() {
    const input = document.getElementById('konglo-finnhub-token');
    if (!input) return;
    const token = String(input.value || '').trim();
    if (!token) {
        if (typeof showToast === 'function') showToast('Token Finnhub kosong.', 'warning');
        return;
    }
    try {
        localStorage.setItem('ewoks_finnhub_token', token);
        window.EWOKS_FINNHUB_TOKEN = token;
        if (typeof clearFundaCaches === 'function') clearFundaCaches();
    } catch (_) {}
    if (typeof showToast === 'function') showToast('Token Finnhub disimpan. Buka ulang laporan keuangan emiten untuk sinkron data.', 'success');
}

function initKongloFinnhubTokenField() {
    const input = document.getElementById('konglo-finnhub-token');
    if (!input) return;
    let token = '';
    try {
        if (window.EWOKS_FINNHUB_TOKEN) token = String(window.EWOKS_FINNHUB_TOKEN).trim();
        if (!token) token = localStorage.getItem('ewoks_finnhub_token') || '';
    } catch (_) {}
    if (token) input.placeholder = 'Token tersimpan (••••••)';
}

function hideFunda() {
    kongloSetView('konglo-detail-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFundaTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("funda-tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }
    tablinks = document.getElementsByClassName("funda-tab-btn");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
    requestAnimationFrame(() => {
        Object.values(fundaCharts || {}).forEach((c) => {
            try { c.resize(); } catch (_) {}
        });
    });
}

function renderFundaCharts(fcfData, divData, npmData, ticker) {
    const labels = FUNDA_YEAR_LABELS();
    const commonOptions = { 
        responsive: true, maintainAspectRatio: false, 
        color: '#cbd5e1',
        scales: { 
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } }
        },
        plugins: { legend: { labels: { color: '#cbd5e1' } } }
    };

    if (fundaCharts.npm) fundaCharts.npm.destroy();
    const npmEl = document.getElementById('fundaNpmChart');
    if (npmEl) {
        const ctxNpm = npmEl.getContext('2d');
        fundaCharts.npm = new Chart(ctxNpm, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{ label: `NPM ${ticker} (%)`, data: npmData, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', fill: true, tension: 0.3, borderWidth: 2, spanGaps: true }]
            },
            options: { ...commonOptions, plugins: { legend: { display: false } } }
        });
    }

    if (fundaCharts.fcf) fundaCharts.fcf.destroy();
    const ctxFcf = document.getElementById('fundaFcfChart').getContext('2d');
    fundaCharts.fcf = new Chart(ctxFcf, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'FCF (triliun / miliar Rp)', data: fcfData, backgroundColor: '#10b981', borderRadius: 4 }]
        },
        options: { ...commonOptions, plugins: { legend: { display: false } } }
    });

    if (fundaCharts.div) fundaCharts.div.destroy();
    const ctxDiv = document.getElementById('fundaDivChart').getContext('2d');
    fundaCharts.div = new Chart(ctxDiv, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Dividend Yield (%)', data: divData, borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.2)', fill: true, tension: 0.4, borderWidth: 2 }]
        },
        options: { ...commonOptions, plugins: { legend: { display: false } } }
    });
}

function renderChart() {
    const el = document.getElementById('sectorChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (fundaCharts.sector) {
        try { fundaCharts.sector.destroy(); } catch (_) {}
    }
    
    let sectorCounts = {};
    dataGroups.forEach(group => {
        group.stocks.forEach(stock => {
            let s = stock.sector;
            if(s.includes("Pertambangan")) s = "Pertambangan";
            else if(s.includes("Properti")) s = "Properti & Real Estat";
            else if(s.includes("Perbankan") || s.includes("Keuangan")) s = "Perbankan & Keuangan";
            else if(s.includes("Agrikultur")) s = "Agrikultur";
            else if(s.includes("Teknologi") || s.includes("E-Commerce") || s.includes("Telekomunikasi")) s = "Teknologi & Telekomunikasi";
            else if(s.includes("Konsumsi") || s.includes("FMCG") || s.includes("Ritel")) s = "Barang Konsumsi & Ritel";
            else if(s.includes("Energi") || s.includes("Minyak")) s = "Energi";
            else s = "Lain-lain";

            sectorCounts[s] = (sectorCounts[s] || 0) + 1;
        });
    });

    const sortedSectors = Object.entries(sectorCounts).sort((a,b) => b[1] - a[1]);
    const labels = sortedSectors.map(item => item[0]);
    const data = sortedSectors.map(item => item[1]);

    fundaCharts.sector = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [ '#1e40af', '#047857', '#d97706', '#b91c1c', '#4338ca', '#0369a1', '#a16207', '#64748b' ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: window.innerWidth < 768 ? 'bottom' : 'right', labels: { boxWidth: 12, font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" } } },
                tooltip: { callbacks: { label: function(context) { return (context.label || '') + ': ' + (context.parsed || 0) + ' Emiten'; } } }
            },
            cutout: '65%'
        }
    });
}

function paintFundaQuarterHeadings() {
    const last = FUNDA_YEAR_LABELS()[6];
    document.querySelectorAll('.js-funda-q-label').forEach((el) => {
        el.textContent = last;
    });
}

paintFundaQuarterHeadings();

document.addEventListener('DOMContentLoaded', () => {
    if (typeof ewoksStatusLoad === 'function') ewoksStatusLoad().then(() => { try { renderGrid(dataGroups); } catch (_) {} });
    try { const q = new URLSearchParams(location.search).get('q'); if (q) setTimeout(() => { const el = document.getElementById('kongloSearch'); if (el) { el.value = q; searchKonglo(); } }, 500); } catch (_) {}
});
document.addEventListener('ewoks-status', () => { try { searchKonglo(); } catch (_) {} });
