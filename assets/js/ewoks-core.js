/** Versi aset — naikkan setelah deploy agar GitHub Pages tidak pakai cache JS/CSS lama. */
window.EWOKS_ASSET_V = '20261122f';

// --- FUNGSI TOAST NOTIFICATION MODERN ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    let iconColor = 'text-blue-500';
    if (type === 'success') { icon = 'fa-check-circle'; iconColor = 'text-emerald-500'; }
    if (type === 'error') { icon = 'fa-exclamation-circle'; iconColor = 'text-rose-500'; }
    if (type === 'warning') { icon = 'fa-exclamation-triangle'; iconColor = 'text-amber-500'; }

    toast.innerHTML = `<i class="fas ${icon} ${iconColor} text-lg"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
// --- APP STATE & INITIALIZATION ---
/** Baca array dari localStorage tanpa melempar error (storage diblokir / JSON rusak). */
function readStoredArray(key) {
    try {
        const v = JSON.parse(localStorage.getItem(key));
        return Array.isArray(v) ? v : [];
    } catch (_) {
        return [];
    }
}
/** Tanggal hari ini di zona WIB (YYYY-MM-DD); toISOString() memakai UTC dan salah hari sebelum 07:00 WIB. */
function ewoksTodayWIB() {
    try { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); }
    catch (_) { return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); }
}
/** Biaya transaksi default (persen): fee broker beli, fee broker jual, PPh final penjualan saham (0,1%). */
const EWOKS_FEE_DEFAULT = { buy: 0.15, sell: 0.15, tax: 0.1 };
/** Fraksi harga BEI (papan Utama/Pengembangan): <200:1, 200-<500:2, 500-<2000:5, 2000-<5000:10, >=5000:25. */
function ewoksTickSize(price) {
    if (price < 200) return 1;
    if (price < 500) return 2;
    if (price < 2000) return 5;
    if (price < 5000) return 10;
    return 25;
}
/** Bulatkan harga ke kelipatan fraksi: mode 'down' | 'up' | 'near'. */
function ewoksRoundTick(price, mode) {
    const t = ewoksTickSize(price);
    const q = price / t;
    const k = mode === 'down' ? Math.floor(q + 1e-9) : mode === 'up' ? Math.ceil(q - 1e-9) : Math.round(q);
    return k * t;
}
/** P&L bersih satu round-trip: fee dihitung per sisi, pajak final hanya atas nilai jual. */
function ewoksTradeNet(buy, sell, lot, feeBuyPct, feeSellPct, taxPct) {
    const bv = buy * lot * 100, sv = sell * lot * 100;
    const feeAmt = bv * feeBuyPct / 100 + sv * feeSellPct / 100;
    const taxAmt = sv * taxPct / 100;
    const gross = sv - bv;
    return { gross, feeAmt, taxAmt, net: Math.round(gross - feeAmt - taxAmt) };
}
/** Validasi + migrasi entri jurnal (dari localStorage atau file impor). Entri tidak valid dibuang. */
function ewoksNormalizeJournal(arr) {
    if (!Array.isArray(arr)) return [];
    const used = new Set();
    const out = [];
    arr.forEach((r) => {
        if (!r || typeof r !== 'object') return;
        const ticker = String(r.ticker || '').toUpperCase().trim();
        const date = String(r.date || '');
        const lot = Number(r.lot), buy = Number(r.buy), sell = Number(r.sell);
        if (!/^[A-Z0-9.\-]{1,12}$/.test(ticker) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        if (![lot, buy, sell].every((x) => Number.isFinite(x) && x > 0)) return;
        let id = Number.isSafeInteger(Number(r.id)) ? Number(r.id) : Date.now();
        while (used.has(id)) id += 1;
        used.add(id);
        const e = {
            id, date, ticker, lot, buy, sell,
            reason: String(r.reason || '').slice(0, 120),
            emotion: String(r.emotion || '').slice(0, 120),
            screenshot: /^https?:\/\//i.test(String(r.screenshot || '')) ? String(r.screenshot).slice(0, 500) : ''
        };
        const sl = Number(r.sl);
        if (Number.isFinite(sl) && sl > 0 && sl < buy) e.sl = sl;
        if (Number.isFinite(Number(r.feeSell))) {
            e.feeBuy = Math.max(0, Number(r.feeBuy) || 0);
            e.feeSell = Math.max(0, Number(r.feeSell) || 0);
            e.tax = Math.max(0, Number(r.tax) || 0);
        } else {
            // Format lama: satu angka "fee total B/S" yang dulu dikenakan penuh di kedua sisi (biaya 2x lipat).
            const f = Math.max(0, Number(r.fee));
            const half = (Number.isFinite(f) ? f : 0.4) / 2;
            e.feeBuy = half; e.feeSell = half; e.tax = 0;
        }
        e.netPnL = ewoksTradeNet(buy, sell, lot, e.feeBuy, e.feeSell, e.tax).net;
        e.isWin = e.netPnL > 0;
        out.push(e);
    });
    return out;
}
let history = readStoredArray('calc_history');
let journal = ewoksNormalizeJournal(readStoredArray('ewoks_journal'));
let watchlist = readStoredArray('ewoks_watchlist');
// --- BACKUP & RESTORE DATA (JSON) ---
function exportBackup() {
    const dataToExport = {
        journal: readStoredArray('ewoks_journal'),
        watchlist: readStoredArray('ewoks_watchlist'),
        history: readStoredArray('calc_history'),
        macroNotes: localStorage.getItem('ewoks_macro_notes') || ''
    };
    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ewoks_Backup_${ewoksTodayWIB()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup berhasil diunduh!", "success");
}

function importBackup(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('format');
            if(Array.isArray(data.journal)) localStorage.setItem('ewoks_journal', JSON.stringify(ewoksNormalizeJournal(data.journal)));
            if(Array.isArray(data.watchlist)) localStorage.setItem('ewoks_watchlist', JSON.stringify(data.watchlist));
            if(Array.isArray(data.history)) localStorage.setItem('calc_history', JSON.stringify(data.history));
            if(typeof data.macroNotes === 'string' && data.macroNotes) localStorage.setItem('ewoks_macro_notes', data.macroNotes);
            alert('Data berhasil di-import dan disinkronkan!');
            location.reload();
        } catch(err) {
            showToast('Gagal memproses file. Pastikan file JSON formatnya benar.', 'error');
        }
    };
    reader.readAsText(file);
}

/** Konteks halaman statis (GitHub Pages): samakan dengan atribut data-page pada <body>. */
class EwoksSiteContext {
    static get page() {
        return document.body?.getAttribute('data-page') || 'home';
    }
    static is(pageKey) {
        return EwoksSiteContext.page === pageKey;
    }
    /** Base path GitHub Pages project site, mis. /EAProInvesting/ */
    static get basePath() {
        const path = window.location.pathname || '/';
        const parts = path.split('/').filter(Boolean);
        if (parts.length >= 2 && !parts[0].endsWith('.html')) {
            return '/' + parts[0] + '/';
        }
        if (path.includes('.html')) {
            return path.replace(/[^/]+$/, '');
        }
        return path.endsWith('/') ? path : path + '/';
    }
}

/** Tunggu Chart.js dari CDN (sering telat di GitHub Pages vs buka file lokal). */
function whenChartReady(callback, attempt = 0) {
    if (typeof Chart !== 'undefined') {
        callback();
        return;
    }
    if (attempt >= 50) return;
    setTimeout(() => whenChartReady(callback, attempt + 1), 120);
}

function initCompoundIfPresent() {
    if (typeof calcCompound !== 'function' || !document.getElementById('compoundChartCanvas')) return;
    whenChartReady(() => calcCompound());
}

/** Navigasi multi-halaman: penanda aktif dari data-page pada <body> */
function highlightNavForCurrentPage() {
    const page = EwoksSiteContext.page;
    document.querySelectorAll('.nav-link.active, .mobile-nav-btn.active, .dropdown-item.active').forEach((el) => el.classList.remove('active'));

    const edu = ['edukasi', 'fixed-income', 'bandarmology-edu', 'quiz'];
    const tools = ['watchlist', 'jurnal', 'pensiun', 'kalkulator', 'bandar'];
    const db = ['konglo', 'broker', 'pasar-global'];

    if (page === 'home') {
        document.getElementById('nav-home')?.classList.add('active');
        document.getElementById('m-nav-home')?.classList.add('active');
    }
    if (edu.includes(page)) {
        document.getElementById('nav-edu-parent')?.classList.add('active');
        document.getElementById('m-nav-edu-parent')?.classList.add('active');
        document.getElementById('nav-' + page)?.classList.add('active');
    }
    if (tools.includes(page)) {
        document.getElementById('nav-tools-parent')?.classList.add('active');
        document.getElementById('m-nav-tools')?.classList.add('active');
        document.getElementById('nav-' + page)?.classList.add('active');
    }
    if (db.includes(page)) {
        document.getElementById('nav-database-parent')?.classList.add('active');
        document.getElementById('m-nav-database-parent')?.classList.add('active');
        document.getElementById('nav-' + page)?.classList.add('active');
    }
}

/** Tambahkan menu "Pasar Global" ke semua halaman (HTML lama tidak perlu diedit satu per satu). */
function ensurePasarGlobalNav() {
    const label = '<i class="fas fa-earth-asia w-5 text-blue-500"></i> Pasar Global (ETF/RD/SBN)';
    if (!document.getElementById('nav-pasar-global')) {
        const anchor = document.getElementById('nav-broker');
        const menu = anchor && anchor.parentElement;
        if (menu) {
            const btn = document.createElement('button');
            btn.id = 'nav-pasar-global';
            btn.className = 'dropdown-item';
            btn.innerHTML = label;
            btn.onclick = () => showPage('pasar-global');
            anchor.insertAdjacentElement('afterend', btn);
        }
    }
    const mParent = document.getElementById('m-nav-database-parent');
    const mMenu = mParent && mParent.nextElementSibling;
    if (mMenu && !mMenu.querySelector('[onclick*="pasar-global"]')) {
        const btn = document.createElement('button');
        btn.className = 'dropdown-item';
        btn.innerHTML = '<i class="fas fa-earth-asia w-5 text-blue-500"></i> Pasar Global';
        btn.onclick = () => showPage('pasar-global');
        mMenu.appendChild(btn);
    }
}

// --- THEME & UI ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode-override');
    const isDark = document.body.classList.contains('dark-mode-override');
    const themeIcon = document.getElementById('theme-icon');
    const themeIconM = document.getElementById('theme-icon-m');
    if (themeIcon) themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    if (themeIconM) themeIconM.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    
    localStorage.setItem('ewoks_theme', isDark ? 'dark' : 'light');
    
    const __tvw = document.getElementById('tv-chart-wrapper');
    if(__tvw && !__tvw.classList.contains('hide') && window.tvWidgetInstance) {
        const currentTicker = window.currentTickerView || "IDX:COMPOSITE";
        openTVChart(currentTicker); 
    }
}

function checkTheme() {
    if(localStorage.getItem('ewoks_theme') === 'dark') {
        toggleDarkMode();
    }
}

function showPage(pageId) {
    const routes = {
        home: 'index.html',
        watchlist: 'watchlist.html',
        jurnal: 'jurnal.html',
        quiz: 'quiz.html',
        'fixed-income': 'fixed-income.html',
        'bandarmology-edu': 'bandarmology-edu.html',
        pensiun: 'pensiun.html',
        edukasi: 'edukasi.html',
        kalkulator: 'kalkulator.html',
        bandar: 'bandar.html',
        konglo: 'konglo.html',
        broker: 'broker.html',
        'pasar-global': 'pasar-global.html',
        global: 'global.html'
    };
    const url = routes[pageId];
    if (url) window.location.href = EwoksSiteContext.basePath + url;
}

window.tvWidgetInstance = null;
window.currentTickerView = "";

function openTVChart(ticker, opts) {
    opts = opts || {};
    const prefs = window.EwoksTerminalPrefs || {};
            if (!document.getElementById('chart-active-ticker-input') || !document.getElementById('tv-chart-container')) {
                return;
            }
            if (typeof TradingView === 'undefined' || typeof TradingView.widget !== 'function') {
                return;
            }
    const symbol = ticker.includes("IDX:") ? ticker : `IDX:${ticker}`;
    window.currentTickerView = symbol; 
    
    document.getElementById('chart-active-ticker-input').value = ticker.replace("IDX:", "");

    if(document.getElementById('tv-chart-wrapper')) {
        document.getElementById('tv-chart-wrapper').classList.remove('hide');
    }

    const isDark = prefs.theme === 'dark' ? true : prefs.theme === 'light' ? false : document.body.classList.contains('dark-mode-override');
    
    document.getElementById('tv-chart-container').innerHTML = '';
    
    window.tvWidgetInstance = new TradingView.widget({
      "autosize": true,
      "symbol": symbol,
      "interval": prefs.interval || "D",
      "timezone": "Asia/Jakarta",
      "theme": isDark ? "dark" : "light",
      "style": String(prefs.style || "1"),
      "locale": "id",
      "studies": Array.isArray(prefs.studies) ? prefs.studies : [],
      "enable_publishing": false,
      "backgroundColor": isDark ? "#0f172a" : "rgba(255, 255, 255, 1)",
      "gridColor": isDark ? "#1e293b" : "rgba(241, 245, 249, 1)",
      "hide_top_toolbar": false, 
      "hide_legend": false,
      "save_image": false,
      "container_id": "tv-chart-container",
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650",
      "withdateranges": true,
      "allow_symbol_change": true,
      "details": true,
      "hotlist": true,
      "calendar": true,
      "hide_side_toolbar": prefs.sideToolbar === false
    });
    
    if(EwoksSiteContext.is('watchlist') && !opts.noScroll){
        const headerOffset = 100;
        const elementPosition = document.getElementById('tv-chart-wrapper').getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
}

// --- LIVE DATA & NEWS (WITH GOOGLE SHEETS FALLBACK) ---
/** Tanggal kalendar (YYYY-MM-DD) di zona Asia/Jakarta — dipakai filter & cache-bust harian. */
function getJakartaDateKey(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

const CORPORATE_CALENDAR_FALLBACK = [
    { ticker: 'BBCA', action: 'Dividen Interim Rp25', kind: 'dividen', date: '2026-08-31', dateLabel: 'Ex-Date' },
    { ticker: 'BBCA', action: 'Bayar Dividen Interim', kind: 'dividen', date: '2026-09-16', dateLabel: 'Pembayaran' },
    { ticker: 'BBRI', action: 'Dividen Interim (est.)', kind: 'dividen', date: '2026-10-21', dateLabel: 'Ex-Date' },
    { ticker: 'BBRI', action: 'Bayar Dividen (est.)', kind: 'dividen', date: '2026-11-06', dateLabel: 'Pembayaran' },
    { ticker: 'ASII', action: 'Pantau aksi korporasi IDX', kind: 'rups', date: '2026-09-30', dateLabel: 'Jadwal' },
    { ticker: 'TLKM', action: 'Rilis kinerja kuartalan', kind: 'rups', date: '2026-10-31', dateLabel: 'Estimasi' },
];

/** Emiten IDX (tanpa .JK) untuk tarik dividen via Finnhub jika token di-set — daftar bisa Anda sesuaikan. */
const CORP_CAL_FINNHUB_TICKERS = [
    'BBCA', 'BBRI', 'BMRI', 'BRIS', 'TLKM', 'ASII', 'UNVR', 'ADRO', 'ANTM', 'GOTO',
];

function addCalendarDaysToYmd(ymd, addDays) {
    const p = String(ymd).split('-').map(Number);
    if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return ymd;
    const [y, m, d] = p;
    const dt = new Date(y, m - 1, d + addDays);
    const y2 = dt.getFullYear();
    const m2 = String(dt.getMonth() + 1).padStart(2, '0');
    const d2 = String(dt.getDate()).padStart(2, '0');
    return `${y2}-${m2}-${d2}`;
}

/** Token Finnhub gratis: https://finnhub.io/register — set `window.EWOKS_FINNHUB_TOKEN` (script sebelum ewoks-core) atau localStorage `ewoks_finnhub_token`. */
function getEwoksFinnhubToken() {
    try {
        if (typeof window !== 'undefined' && window.EWOKS_FINNHUB_TOKEN) {
            const t = String(window.EWOKS_FINNHUB_TOKEN).trim();
            if (t) return t;
        }
    } catch (_) {}
    try {
        const t = localStorage.getItem('ewoks_finnhub_token');
        if (t && String(t).trim()) return String(t).trim();
    } catch (_) {}
    return '';
}

function dedupeCorpEventsPreserveFirst(events) {
    const seen = new Set();
    return events.filter((e) => {
        if (!e || !e.ticker || !e.date) return false;
        const k = `${String(e.ticker).toUpperCase()}|${e.date}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

/** Dividen ex-date dari Finnhub (CORS *). Hanya dividen; RUPS dll. tetap dari JSON. */
async function fetchFinnhubIdxDividendEvents(token) {
    if (!token) return [];
    const from = getJakartaDateKey();
    const to = addCalendarDaysToYmd(from, 150);
    const tasks = CORP_CAL_FINNHUB_TICKERS.map(async (sym) => {
        try {
            const symjk = `${sym}.JK`;
            const u = `https://finnhub.io/api/v1/stock/dividend?symbol=${encodeURIComponent(symjk)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&token=${encodeURIComponent(token)}`;
            const res = await fetch(u);
            if (!res.ok) return [];
            const rows = await res.json();
            if (!Array.isArray(rows)) return [];
            return rows
                .filter((r) => r && r.date)
                .map((r) => {
                    const dateStr = String(r.date).slice(0, 10);
                    let action = 'Dividen';
                    if (r.amount != null && Number.isFinite(Number(r.amount))) {
                        const cur = r.currency ? String(r.currency) : 'IDR';
                        const amt = Number(r.amount).toLocaleString('id-ID', { maximumFractionDigits: 4 });
                        action = `Dividen ${cur} ${amt}`;
                    }
                    return {
                        ticker: sym,
                        action,
                        kind: 'dividen',
                        date: dateStr,
                        dateLabel: 'Ex-Date',
                    };
                });
        } catch (_) {
            return [];
        }
    });
    return (await Promise.all(tasks)).flat();
}

function formatCorporateCalendarIdDate(ymd) {
    const p = String(ymd).split('-').map(Number);
    if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return ymd;
    const [y, m, d] = p;
    return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function corporateCalendarBadgeClass(kind) {
    if (kind === 'rups') return 'bg-blue-100 text-blue-700';
    if (kind === 'dividen') return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-100 text-slate-700';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normalizeCorporateCalendarPayload(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.events)) return data.events;
    return [];
}

function formatStampWib(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) + ' WIB';
    } catch (_) {
        return String(iso).slice(0, 10);
    }
}

/** Tanggal panjang hari ini di Jakarta, mis. "29 Agustus 2026". */
function formatJakartaLongDate(date = new Date()) {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

/**
 * Kuartal laporan terakhir yang sudah lewat (bukan teks Q1 yang di-hardcode).
 * Agustus → Q2; Oktober → Q3. Kolom angka tetap dari Yahoo; label mengikuti kalender.
 */
function currentLapkeuQuarter(date = new Date()) {
    const key = getJakartaDateKey(date);
    const year = Number(key.slice(0, 4));
    const month = Number(key.slice(5, 7));
    if (month <= 3) return { q: 4, year: year - 1, label: `Q4 ${year - 1}` };
    if (month <= 6) return { q: 1, year, label: `Q1 ${year}` };
    if (month <= 9) return { q: 2, year, label: `Q2 ${year}` };
    return { q: 3, year, label: `Q3 ${year}` };
}

function getFundaYearLabels(date = new Date()) {
    const { label } = currentLapkeuQuarter(date);
    return ['2020', '2021', '2022', '2023', '2024', '2025', label];
}

function yahooFundaBadgeText(date = new Date()) {
    const { label } = currentLapkeuQuarter(date);
    return `Lapkeu tahunan + ${label}`;
}

function kongloDailyStampText() {
    return formatJakartaLongDate();
}

function paintDataStamps(snap) {
    const built = snap?.meta?.built;
    const liveAt = snap?.meta?.liveAt;
    const text = liveAt
        ? `Harga live: ${formatStampWib(liveAt)} `
        : built
            ? `Update data pasar: ${formatStampWib(built)}`
            : 'Update data pasar: snapshot belum tersedia';
    const full = !liveAt && window.__ewoksLiveErr ? `${text} · harga live belum tersedia, memakai data snapshot` : text;
    const home = document.getElementById('data-updated-stamp');
    if (home) home.textContent = full;
    const konglo = document.getElementById('konglo-data-stamp');
    if (konglo) konglo.textContent = full;
}

function ewoksAssetUrl(relPath) {
    const base = typeof EwoksSiteContext !== 'undefined' ? EwoksSiteContext.basePath : '/';
    const v = window.EWOKS_ASSET_V || getJakartaDateKey();
    return `${base}${relPath}?v=${encodeURIComponent(v)}`;
}

function renderCorporateCalendar(events, meta = {}) {
    const container = document.getElementById('corporate-calendar-container');
    if (!container) return;

    const today = getJakartaDateKey();
    const valid = (events || []).filter((e) => e && e.date && e.ticker);
    const upcoming = valid
        .filter((e) => String(e.date) >= today)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const past = valid
        .filter((e) => String(e.date) < today)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    let rows = upcoming.slice(0, 4);
    if (rows.length < 3) {
        rows = rows.concat(past.slice(0, 3 - rows.length).map((e) => ({ ...e, _past: true })));
    }

    const stampEl = document.getElementById('calendar-updated-stamp');
    if (stampEl) {
        stampEl.textContent = meta.updated
            ? `Update kalender: ${formatStampWib(meta.updated)}`
            : `Update kalender: ${today}`;
    }

    if (rows.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-4 rounded-xl border border-slate-100 text-center">
                <p class="text-xs text-slate-600 leading-relaxed">Gagal memuat kalender. Commit <b>assets/data/corporate-calendar.json</b> ke GitHub.</p>
            </div>`;
        return;
    }

    container.innerHTML = rows
        .map((e) => {
            const isToday = e.date === today;
            const isPast = !!e._past;
            const border = isToday ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-slate-100';
            const todayTag = isToday
                ? '<span class="text-[8px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-black uppercase ml-1">Hari ini</span>'
                : isPast
                    ? '<span class="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase ml-1">Selesai</span>'
                    : '';
            const badge = corporateCalendarBadgeClass(e.kind);
            const tk = escapeHtml(e.ticker);
            const ac = escapeHtml(e.action);
            const dl = escapeHtml(e.dateLabel || 'Jadwal');
            return `
            <div class="flex justify-between items-center bg-white p-4 rounded-xl border ${border} shadow-sm hover:border-amber-300 transition-colors">
                <div class="min-w-0 pr-3">
                    <span class="font-black text-slate-800 text-lg block leading-none mb-1">${tk}${todayTag}</span>
                    <span class="text-[9px] ${badge} px-2 py-0.5 rounded font-bold uppercase tracking-widest">${ac}</span>
                </div>
                <div class="text-right shrink-0">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">${dl}</p>
                    <p class="text-sm font-black text-slate-700">${formatCorporateCalendarIdDate(e.date)}</p>
                </div>
            </div>`;
        })
        .join('');
}

let __ewoksCorpCalFetchedForJakartaDate = null;

async function fetchAndRenderCorporateCalendar() {
    const container = document.getElementById('corporate-calendar-container');
    if (!container) return;

    const jakartaToday = getJakartaDateKey();
    const url = ewoksAssetUrl('assets/data/corporate-calendar.json');

    let list = [...CORPORATE_CALENDAR_FALLBACK];
    let meta = { updated: new Date().toISOString() };
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            const parsed = normalizeCorporateCalendarPayload(data);
            if (parsed.length) list = [...parsed];
            if (data && !Array.isArray(data)) meta = { updated: data.updated, source: data.source };
        }
    } catch (_) {
        /* pakai fallback */
    }

    const finnhubToken = getEwoksFinnhubToken();
    if (finnhubToken) {
        try {
            const apiEvents = await fetchFinnhubIdxDividendEvents(finnhubToken);
            list = dedupeCorpEventsPreserveFirst([...list, ...apiEvents]);
        } catch (_) {
            /* tetap pakai list JSON/fallback */
        }
    }

    __ewoksCorpCalFetchedForJakartaDate = jakartaToday;
    renderCorporateCalendar(list, meta);
}

function refreshCorporateCalendarIfJakartaDateChanged() {
    const key = getJakartaDateKey();
    if (key !== __ewoksCorpCalFetchedForJakartaDate) {
        fetchAndRenderCorporateCalendar();
    }
}

async function fetchNews() {
    const container = document.getElementById('news-container');
    if (!container) return;
    try {
        const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.cnbcindonesia.com/market/rss');
        const data = await res.json();
        
        if(data.status === 'ok') {
            const keywords = ['IHSG', 'saham', 'asing', 'bunga', 'fed', 'investor', 'emiten', 'rupiah', 'BI'];
            const filteredItems = data.items.filter(item => {
                const titleLower = item.title.toLowerCase();
                return keywords.some(kw => titleLower.includes(kw.toLowerCase()));
            });

            const itemsToShow = filteredItems.slice(0, 12);
            data.items.forEach(item => { if (itemsToShow.length < 8 && !itemsToShow.includes(item)) itemsToShow.push(item); });

            container.innerHTML = itemsToShow.map(item => `
                <a href="${item.link}" target="_blank" class="block p-3 rounded-xl border border-slate-100 hover:bg-blue-50 transition-colors bg-white shadow-sm">
                    <p class="text-[10px] text-blue-500 font-black mb-1 uppercase tracking-widest">${item.pubDate.split(' ')[0]}</p>
                    <h4 class="text-xs md:text-sm font-bold text-slate-800 line-clamp-2">${item.title}</h4>
                </a>
            `).join('');
        } else {
            throw new Error("API Limit Reached");
        }
    } catch (e) {
        container.innerHTML = `
            <a href="https://www.cnbcindonesia.com/market" target="_blank" class="block p-3 rounded-xl border border-slate-100 hover:bg-blue-50 transition-colors bg-white shadow-sm">
                <p class="text-[10px] text-blue-500 font-black mb-1 uppercase tracking-widest">HARI INI</p>
                <h4 class="text-xs md:text-sm font-bold text-slate-800">IHSG Diprediksi Menguat Terbatas di Tengah Penantian Rilis Data Inflasi AS</h4>
            </a>
            <a href="https://www.cnbcindonesia.com/market" target="_blank" class="block p-3 rounded-xl border border-slate-100 hover:bg-blue-50 transition-colors bg-white shadow-sm mt-3">
                <p class="text-[10px] text-blue-500 font-black mb-1 uppercase tracking-widest">HARI INI</p>
                <h4 class="text-xs md:text-sm font-bold text-slate-800">Aksi Beli Bersih Asing Meningkat, Sektor Perbankan Jadi Incaran Utama Ritel</h4>
            </a>
        `;
    }
}

let __ewoksMarketSnapshot = null;
let __ewoksMarketSnapshotPromise = null;

async function loadEwoksMarketSnapshot() {
    if (__ewoksMarketSnapshot) return __ewoksMarketSnapshot;
    if (__ewoksMarketSnapshotPromise) return __ewoksMarketSnapshotPromise;
    __ewoksMarketSnapshotPromise = (async () => {
        try {
            const base = typeof EwoksSiteContext !== 'undefined' ? EwoksSiteContext.basePath : '/';
            const v = window.EWOKS_ASSET_V || '1';
            const res = await fetch(`${base}assets/data/market-snapshot.json?v=${encodeURIComponent(v)}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('snapshot missing');
            __ewoksMarketSnapshot = await res.json();
            paintDataStamps(__ewoksMarketSnapshot);
        } catch (_) {
            __ewoksMarketSnapshot = { quotes: {}, ihsg: null };
            paintDataStamps(__ewoksMarketSnapshot);
        }
        return __ewoksMarketSnapshot;
    })();
    return __ewoksMarketSnapshotPromise;
}

function formatIdxPrice(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return v.toLocaleString('id-ID', { maximumFractionDigits: v >= 100 ? 0 : 2 });
}

function getIdxQuote(ticker) {
    const t = String(ticker || '').toUpperCase();
    return __ewoksMarketSnapshot?.quotes?.[t] || null;
}

/* ======================================================================
 * HARGA LIVE (opsional) — proxy Yahoo lewat Cloudflare Worker (lihat worker/README.md)
 * Isi URL Worker di EWOKS_LIVE_API_URL, atau localStorage 'ewoks_live_api'.
 * Kosong = nonaktif: web tetap memakai snapshot harian dari GitHub Actions.
 * Data IDX di Yahoo tertunda ±10 menit; polling hanya saat jam bursa.
 * ====================================================================== */
const EWOKS_LIVE_API_URL = 'https://ewoks-live.raka-dityaseptiawan.workers.dev';
const EWOKS_LIVE_POLL_MS = 10 * 60 * 1000; // 10 menit (data IDX di Yahoo memang tertunda ±10 menit)
let __ewoksLiveBusy = false;

function getEwoksLiveApi() {
    let u = EWOKS_LIVE_API_URL;
    try { u = u || localStorage.getItem('ewoks_live_api') || ''; } catch (_) {}
    return String(u || '').trim().replace(/\/+$/, '');
}


/** Ambil harga banyak saham dari Worker /screener: dipecah per ~120 kode & paralel (ringan untuk Worker gratis). */
async function ewoksFetchScreener(codes, chunk) {
    const api = getEwoksLiveApi();
    if (!api) throw new Error('URL Worker belum diatur');
    chunk = chunk || 120;
    const parts = [];
    for (let i = 0; i < codes.length; i += chunk) parts.push(codes.slice(i, i + chunk));
    const q = {}; let ok = 0, lastErr = null, ts = null;
    const one = async (p) => {
        for (let a = 0; a < 2; a++) {
            try {
                const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 25000);
                const r = await fetch(`${api}/screener?s=${p.join(',')}`, { signal: ctl.signal, cache: 'no-store' });
                clearTimeout(tm);
                const d = await r.json();
                if (!d.ok || !d.q) throw new Error(d.error || 'HTTP ' + r.status);
                Object.assign(q, d.q); ts = ts || d.ts; ok++; return;
            } catch (e) { lastErr = e; }
        }
    };
    await Promise.all(parts.map(one));
    if (!ok) throw lastErr || new Error('gagal');
    return { q, ts: ts || new Date().toISOString(), ok, total: parts.length };
}

/** Senin–Jumat 08:55–16:30 WIB (sedikit lebih lebar karena data tertunda). */
function isIdxMarketOpen(d = new Date()) {
    try {
        const p = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Jakarta', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
        }).formatToParts(d);
        const get = (t) => p.find((x) => x.type === t)?.value;
        const wd = get('weekday');
        if (wd === 'Sat' || wd === 'Sun') return false;
        const mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
        return mins >= 8 * 60 + 55 && mins <= 16 * 60 + 30;
    } catch (_) {
        return false;
    }
}

function getEwoksLiveTickers() {
    const set = new Set();
    try {
        if (typeof watchlist !== 'undefined' && Array.isArray(watchlist)) {
            watchlist.forEach((w) => w && w.ticker && set.add(String(w.ticker).toUpperCase()));
        }
    } catch (_) {}
    if (Array.isArray(window.__ewoksLiveTickers)) {
        window.__ewoksLiveTickers.forEach((t) => set.add(String(t).toUpperCase()));
    }
    return [...set].filter((t) => /^[A-Z0-9]{2,6}$/.test(t)).slice(0, 40);
}

async function refreshLiveQuotes(force = false) {
    const api = getEwoksLiveApi();
    if (!api || __ewoksLiveBusy) return false;
    if (!force && !isIdxMarketOpen()) return false;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
    const tickers = getEwoksLiveTickers();
    const wantIhsg = !!(document.getElementById('ihsg-dash-live') || document.getElementById('terminal-ihsg'));
    if (!tickers.length && !wantIhsg) return false;
    __ewoksLiveBusy = true;
    try {
        const snap = await loadEwoksMarketSnapshot();
        const url = `${api}/quotes?s=${encodeURIComponent(tickers.join(','))}${wantIhsg ? '&ihsg=1' : ''}`;
        let res = null;
        for (let attempt = 0; attempt < 2 && !res; attempt++) {
            const ctl = new AbortController();
            const timer = setTimeout(() => ctl.abort(), 20000);
            try {
                res = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
            } catch (err) {
                if (attempt === 1) throw (err && err.name === 'AbortError' ? new Error('Worker terlalu lambat (timeout 20 dtk)') : err);
                await new Promise((r) => setTimeout(r, 1500));
            } finally {
                clearTimeout(timer);
            }
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        snap.quotes = snap.quotes || {};
        let n = 0;
        for (const [t, q] of Object.entries(data.quotes || {})) {
            if (!q || !Number.isFinite(q.price)) continue;
            const old = snap.quotes[t] || {};
            snap.quotes[t] = {
                ...old,
                price: q.price,
                prevClose: Number.isFinite(q.prevClose) ? q.prevClose : (old.prevClose ?? null),
                changePct: Number.isFinite(q.changePct) ? q.changePct : null,
                liveAt: q.time || data.ts || null,
                live: true
            };
            n++;
        }
        if (data.ihsg && Number.isFinite(data.ihsg.price)) {
            snap.ihsg = {
                ...(snap.ihsg || {}),
                price: data.ihsg.price,
                prevClose: Number.isFinite(data.ihsg.prevClose) ? data.ihsg.prevClose : (snap.ihsg?.prevClose ?? null),
                changePct: Number.isFinite(data.ihsg.changePct) ? data.ihsg.changePct : null
            };
            n++;
        }
        if (!n) throw new Error('data kosong');
        window.__ewoksLiveErr = null;
        snap.meta = { ...(snap.meta || {}), liveAt: data.ts || new Date().toISOString() };
        paintDataStamps(snap);
        applyMarketSnapshotToDashboard(snap);
        if (typeof EwoksSiteContext !== 'undefined' && EwoksSiteContext.is('watchlist') && typeof renderWatchlist === 'function') {
            renderWatchlist(true);
        }
        if (typeof window.__kongloRepaint === 'function') window.__kongloRepaint();
        if (typeof window.__terminalRepaint === 'function') window.__terminalRepaint();
        return true;
    } catch (e) {
        console.warn('Harga live gagal, pakai snapshot:', e.message);
        const m = String(e.message || '');
        window.__ewoksLiveErr = /Failed to fetch|NetworkError|Load failed/i.test(m) ? `tidak tersambung ke Worker dari ${location.origin}; coba muat ulang` : m;
        try { paintDataStamps(await loadEwoksMarketSnapshot()); } catch (_) {}
        return false;
    } finally {
        __ewoksLiveBusy = false;
    }
}

function startEwoksLivePolling() {
    if (!getEwoksLiveApi()) return;
    const tick = () => refreshLiveQuotes(false);
    setTimeout(tick, 1500);
    setInterval(tick, EWOKS_LIVE_POLL_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') tick();
    });
}

/** Inflasi YoY & yield SBN 10 tahun dari assets/data/macro.json (diperbarui harian oleh workflow). */
async function loadMacroIndicators() {
    const infEl = document.getElementById('inflasi-dash');
    const sbnEl = document.getElementById('sbn-yield-dash');
    const biEl = document.getElementById('bi-rate-dash');
    const fedEl = document.getElementById('fed-rate-dash');
    if (!infEl && !sbnEl && !biEl && !fedEl) return;
    try {
        const res = await fetch(ewoksAssetUrl('assets/data/macro.json'), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const m = await res.json();
        const fmtDate = (iso) => {
            const d = new Date(`${iso}T00:00:00+07:00`);
            return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
        };
        if (infEl && Number.isFinite(m?.inflation?.value)) {
            infEl.innerText = `${m.inflation.value.toFixed(2).replace('.', ',')}% YoY`;
            infEl.title = `Inflasi tahunan periode ${m.inflation.label || m.inflation.period}`;
        }
        const pct = (v) => `${Number(v).toFixed(2).replace('.', ',')}%`;
        if (biEl && Number.isFinite(m?.biRate?.value)) {
            biEl.innerText = pct(m.biRate.value);
            biEl.title = `BI 7-Day Reverse Repo Rate per ${fmtDate(m.biRate.asOf)}`;
        }
        if (fedEl && Number.isFinite(m?.fedRate?.low) && Number.isFinite(m?.fedRate?.high)) {
            fedEl.innerText = `${m.fedRate.low.toFixed(2).replace('.', ',')}\u2013${pct(m.fedRate.high)}`;
            fedEl.title = `Target Fed Funds Rate per ${fmtDate(m.fedRate.asOf)}`;
        }
        if (sbnEl && Number.isFinite(m?.sbn10y?.value)) {
            sbnEl.innerText = `${m.sbn10y.value.toFixed(2)}%`;
            sbnEl.title = `Yield SBN 10 tahun per ${fmtDate(m.sbn10y.asOf)}`;
            if (typeof calcSbn === 'function') calcSbn();
        }
    } catch (e) {
        console.warn('macro.json', e);
    }
}

/** Aktivitas perdagangan: All Market / Regular / Nego dari assets/data/market-activity.json. */
async function loadMarketActivity() {
    const grid = document.getElementById('mkt-activity-grid');
    if (!grid) return;
    const asOfEl = document.getElementById('mkt-activity-asof');
    const idn = (v, d = 2) => Number(v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
    const money = (v) => (v >= 1e12 ? `${idn(v / 1e12)} T` : v >= 1e9 ? `${idn(v / 1e9)} M` : `${idn(v / 1e6)} Jt`);
    const qty = (v) => (v >= 1e9 ? `${idn(v / 1e9)} M` : v >= 1e6 ? `${idn(v / 1e6)} Jt` : v >= 1e3 ? `${idn(v / 1e3)} Rb` : idn(v, 0));
    const freq = (v) => (v >= 1e6 ? `${idn(v / 1e6)} Jt` : v >= 1e3 ? `${idn(v / 1e3)} Rb` : idn(v, 0));
    try {
        const res = await fetch(ewoksAssetUrl('assets/data/market-activity.json'), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        const cols = [['All Market', d.all], ['Regular', d.regular], ['Nego', d.nego]].filter(([, x]) => x && Number.isFinite(x.value));
        if (!cols.length) throw new Error('kosong');
        grid.innerHTML = cols.map(([name, x]) => `
            <div class="rounded-lg border border-slate-200 p-4">
                <div class="font-semibold text-slate-900 mb-2">${name}</div>
                <dl class="space-y-1 tabular-nums">
                    <div class="flex justify-between"><dt class="text-slate-500">Nilai</dt><dd class="font-medium text-slate-900">${money(x.value)}</dd></div>
                    <div class="flex justify-between"><dt class="text-slate-500">Volume</dt><dd class="font-medium text-slate-900">${qty(x.volume)}</dd></div>
                    <div class="flex justify-between"><dt class="text-slate-500">Frekuensi</dt><dd class="font-medium text-slate-900">${freq(x.freq)}</dd></div>
                </dl>
            </div>`).join('');
        const dt = new Date(`${d.asOf}T00:00:00+07:00`);
        const when = Number.isNaN(dt.getTime()) ? d.asOf : dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
        if (asOfEl) asOfEl.textContent = `Data penutupan ${when}${d.session ? ` \u00b7 ${d.session}` : ''} \u00b7 sumber: ${d.source || 'BEI'}`;
    } catch (e) {
        console.warn('market-activity.json', e);
        if (asOfEl) asOfEl.textContent = 'Data belum tersedia';
    }
}

function applyMarketSnapshotToDashboard(snap) {
    const ihsg = snap?.ihsg;
    const ihsgEl = document.getElementById('ihsg-dash-live');
    const termIhsgEl = document.getElementById('terminal-ihsg');
    if (ihsg?.price != null) {
        const formatted = Number(ihsg.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (ihsgEl) ihsgEl.innerText = formatted;
        if (termIhsgEl) termIhsgEl.innerText = formatted;
        const up = (ihsg.changePct ?? 0) >= 0;
        if (ihsgEl) ihsgEl.className = `stat-badge ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} transition-all duration-300`;
        if (termIhsgEl) termIhsgEl.className = `font-black ${up ? 'text-emerald-600' : 'text-rose-600'} transition-all duration-300`;
    }

    const yieldEl = document.getElementById('sbn-yield-dash');
    if (yieldEl && snap?.id10y?.price != null) {
        yieldEl.innerText = `${Number(snap.id10y.price).toFixed(2)}%`;
    }

    const fgPointer = document.getElementById('fg-pointer');
    const fgText = document.getElementById('fg-text');
    const termSentiment = document.getElementById('terminal-sentiment');
    let fgValue = 50;
    if (ihsg?.changePct != null) {
        fgValue = 50 + Math.max(-25, Math.min(25, ihsg.changePct * 4));
    }
    if (fgPointer) fgPointer.style.left = `${fgValue}%`;
    if (fgText || termSentiment) {
        let statusText = 'NEUTRAL';
        let colorClass = 'text-amber-500';
        if (fgValue < 25) { statusText = 'EXTREME FEAR'; colorClass = 'text-rose-600'; }
        else if (fgValue < 45) { statusText = 'FEAR'; colorClass = 'text-rose-500'; }
        else if (fgValue < 55) { statusText = 'NEUTRAL'; colorClass = 'text-amber-500'; }
        else if (fgValue < 75) { statusText = 'GREED'; colorClass = 'text-emerald-500'; }
        else { statusText = 'EXTREME GREED'; colorClass = 'text-emerald-600'; }
        if (fgText) fgText.className = `text-[10px] font-black ${colorClass} transition-all duration-300`;
        if (fgText) fgText.innerText = `${statusText} (${Math.round(fgValue)})`;
        if (termSentiment) {
            termSentiment.innerText = statusText;
            termSentiment.className = `text-xl md:text-2xl font-black ${colorClass}`;
        }
    }
}

async function fetchRealIHSG() {
    const snap = await loadEwoksMarketSnapshot();
    applyMarketSnapshotToDashboard(snap);
    if (EwoksSiteContext.is('watchlist') && typeof renderWatchlist === 'function') {
        renderWatchlist(true);
    }
    if (document.getElementById('group-grid') && typeof searchKonglo === 'function') searchKonglo();
}

function fetchLiveMarketData() {
    fetchRealIHSG();
}

function getBrokerBadge(kode) {
    const asing = ['AK', 'BK', 'RX', 'KZ', 'YU', 'AI', 'GW', 'HD', 'DP', 'ZP', 'TP'];
    const ritel = ['YP', 'PD', 'CC', 'NI', 'XC', 'XL', 'AG', 'SQ'];
    if (asing.includes(kode)) return '<span class="bg-indigo-100 text-indigo-700 text-[9px] px-2 py-1 rounded font-bold ml-2">Asing/Institusi</span>';
    if (ritel.includes(kode)) return '<span class="bg-rose-100 text-rose-700 text-[9px] px-2 py-1 rounded font-bold ml-2">Dominan Ritel</span>';
    return '<span class="bg-slate-100 text-slate-500 text-[9px] px-2 py-1 rounded font-bold ml-2">Standar Lokal</span>';
}



// --- UTILITIES & SYSTEM ---
function formatAbbreviated(num) {
    const n = Number(num) || 0;
    const a = Math.abs(n);
    const f = (v, d) => v.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
    // Naik satu tingkat bila pembulatan menghasilkan 1000 (mis. 999.996 -> "1,00 Juta", bukan "1000,0 Ribu").
    if (a >= 1e12 || Math.round(a / 1e7) >= 100000) return f(n / 1e12, 2) + ' Triliun';
    if (a >= 1e9 || Math.round(a / 1e4) >= 100000) return f(n / 1e9, 2) + ' Miliar';
    if (a >= 1e6 || Math.round(a / 100) >= 10000) return f(n / 1e6, 2) + ' Juta';
    if (a >= 1e3) return f(n / 1e3, 1) + ' Ribu';
    return Math.round(n).toLocaleString('id-ID');
}

function updateClock() {
    const now = new Date();
    let timeString = '--:--:-- WIB';
    try {
        timeString = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jakarta'
        }) + ' WIB';
    } catch (_) {
        const pad = (v) => String(v).padStart(2, '0');
        const utc = now.getTime() + now.getTimezoneOffset() * 60000;
        const wib = new Date(utc + 7 * 3600000);
        timeString = `${pad(wib.getHours())}:${pad(wib.getMinutes())}:${pad(wib.getSeconds())} WIB`;
    }
    const clockEl = document.getElementById('clockText');
    if (clockEl) clockEl.innerText = timeString;
}

window.addEventListener('scroll', () => {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    if (window.scrollY > 300) {
        btn.classList.remove('opacity-0', 'pointer-events-none');
        btn.classList.add('opacity-100', 'pointer-events-auto');
    } else {
        btn.classList.add('opacity-0', 'pointer-events-none');
        btn.classList.remove('opacity-100', 'pointer-events-auto');
    }
});

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('load', () => {
    checkTheme();
    ensurePasarGlobalNav();
    highlightNavForCurrentPage();

    if (typeof loadMacroNotes === 'function') loadMacroNotes();
    if (typeof renderBrokers === 'function' && document.getElementById('brokerTable')) renderBrokers();
    if (typeof renderHistory === 'function' && document.getElementById('historySection')) renderHistory();
    if (typeof renderGrid === 'function' && document.getElementById('group-grid')) renderGrid();
    if (typeof renderWatchlist === 'function' && document.getElementById('watchlist-container')) renderWatchlist();
    if (typeof renderJournal === 'function' && (document.getElementById('journal-empty') || document.getElementById('jr-date'))) renderJournal();
    if (typeof calcSbn === 'function') calcSbn();
    if (typeof calculateRetirement === 'function' && document.getElementById('p-age-retire')) calculateRetirement();
    initCompoundIfPresent();
    if (typeof calcDarurat === 'function' && document.getElementById('dar-expense')) calcDarurat();

    const page = EwoksSiteContext.page;
    if (page === 'konglo') {
        if (typeof initKongloFinnhubTokenField === 'function') initKongloFinnhubTokenField();
        if (typeof renderChart === 'function') setTimeout(renderChart, 100);
    }
    if (page === 'fixed-income') {
        setTimeout(() => { if (typeof renderYieldChart === 'function') renderYieldChart(); }, 100);
        setTimeout(() => { if (typeof renderYieldCurve === 'function') renderYieldCurve(); }, 100);
    }
    if (page === 'pensiun') setTimeout(initCompoundIfPresent, 100);
    if (page === 'kalkulator' && typeof runSimpleCalc === 'function' && document.getElementById('calc-price')) runSimpleCalc();
    if (page === 'jurnal' && typeof renderJournal === 'function') renderJournal();
    if (page === 'watchlist' && typeof openTVChart === 'function' && !window.tvWidgetInstance) {
        let first = 'IDX:COMPOSITE';
        try { const q = new URLSearchParams(location.search).get('t'); if (q && /^[A-Za-z0-9]{2,6}$/.test(q)) first = 'IDX:' + q.toUpperCase(); } catch (_) {}
        openTVChart(first);
    }

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.group')) {
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show-dropdown'));
        }
    });

    document.querySelectorAll('.group > button').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = this.nextElementSibling;
            if (!dropdown) return;
            const isShowing = dropdown.classList.contains('show-dropdown');

            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show-dropdown'));
            if (!isShowing) dropdown.classList.add('show-dropdown');
        });
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show-dropdown'));
        });
    });

    const today = ewoksTodayWIB();
    const tgl = document.getElementById('tanggal');
    const jr = document.getElementById('jr-date');
    if (tgl) tgl.value = today;
    if (jr) jr.value = today;

    updateClock();
    fetchRealIHSG();
    loadMacroIndicators();
    loadMarketActivity();
    startEwoksLivePolling();
    fetchNews();

    if (document.getElementById('corporate-calendar-container')) {
        fetchAndRenderCorporateCalendar();
        setInterval(refreshCorporateCalendarIfJakartaDateChanged, 60 * 1000);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') fetchAndRenderCorporateCalendar();
        });
    }

    setInterval(updateClock, 1000);
    setInterval(fetchRealIHSG, 10 * 60 * 1000);
    // Berita: segarkan tiap 10 menit selama tab terlihat
    setInterval(() => { if (document.visibilityState === 'visible') fetchNews(); }, 10 * 60 * 1000);
});


/* ===== Penanda status emiten (suspen, delisting, pemantauan khusus, RI, tak ada transaksi, gocap) ===== */
(function () {
    const LBL = { SUSPEN: 'SUSPEN', DELIST: 'DELISTING', PPK: 'PEMANTAUAN KHUSUS', RI: 'RI', DIV: 'DIVIDEN', SPLIT: 'SPLIT', UMA: 'UMA', AKSI: 'AKSI KORPORASI', IDLE: 'TAK ADA TRANSAKSI', GOCAP: 'GOCAP', HSC: 'HSC' };
    let map = null, pr = null, meta = null;
    window.ewoksStatusLoad = function (force) {
        if (pr && !force) return pr;
        const base = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
        pr = fetch(`${base}assets/data/idx-status.json?v=${encodeURIComponent(window.EWOKS_ASSET_V || '1')}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null)).then((d) => { map = (d && d.items) || {}; meta = d; return map; }).catch(() => { map = {}; return map; });
        return pr;
    };
    // refresh otomatis tiap 10 menit; halaman yang mendengarkan 'ewoks-status' me-render ulang
    setInterval(() => { ewoksStatusLoad(true).then(() => document.dispatchEvent(new CustomEvent('ewoks-status'))); }, 10 * 60 * 1000);
    window.ewoksStatusLinks = function (t) {
        const base = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
        return `<a class="st-lk" href="${base}watchlist.html?t=${t}">Terminal</a><a class="st-lk" href="${base}broker.html?q=${t}#ipo">IPO &amp; penjamin</a><a class="st-lk" href="${base}konglo.html?q=${t}">Konglo</a>`;
    };
    window.ewoksStatusOf = (t) => (map && map[t]) || [];
    window.ewoksStatusMeta = () => meta;
    window.ewoksStatusLabel = (k) => LBL[k] || k;
    const e = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    window.ewoksStatusBadges = function (t) {
        return ewoksStatusOf(t).map((f) => `<span class="st-bd st-${f[0]}" title="${e(f[1])}">${LBL[f[0]] || f[0]}</span>`).join('');
    };
})();

/* ---- Mode IHSG | Global | Bitcoin | Forex: switcher + menu atas yang ikut berganti ---- */
(function () {
    var NAVS = {
        global: [['ringkasan', 'fa-globe', 'Ringkasan'], ['screener', 'fa-chart-line', 'Saham AS'], ['ipo', 'fa-rocket', 'IPO AS'], ['berita', 'fa-newspaper', 'Berita'], ['jurnal', 'fa-book', 'Jurnal'], ['invest', 'fa-coins', 'Investasi Global']],
        bitcoin: [['ringkasan', 'fa-bitcoin-sign', 'Ringkasan'], ['koin', 'fa-coins', 'Koin'], ['listing', 'fa-bullhorn', 'Listing Baru'], ['emas', 'fa-ring', 'Emas Digital'], ['berita', 'fa-newspaper', 'Berita'], ['jurnal', 'fa-book', 'Jurnal']],
        forex: [['ringkasan', 'fa-earth-asia', 'Ringkasan'], ['pasangan', 'fa-arrow-right-arrow-left', 'Pasangan'], ['emas', 'fa-ring', 'XAU/USD'], ['kalkulator', 'fa-calculator', 'Kalkulator Pip'], ['jurnal', 'fa-book', 'Jurnal']]
    };
    var MODES = [['idx', 'IHSG', 'index.html'], ['global', 'Global', 'global.html'], ['bitcoin', 'Bitcoin', 'bitcoin.html'], ['forex', 'Forex', 'forex.html']];
    var PAGE_MODE = { home: 'idx', global: 'global', 'pasar-global': 'global', bitcoin: 'bitcoin', forex: 'forex' };
    function page() { return document.body && document.body.getAttribute('data-page'); }
    function mode() {
        if (page() === 'jurnal-pasar') { var q = (location.search.match(/m=(\w+)/) || [])[1], sv = ''; try { sv = localStorage.getItem('ewoks_mode') || ''; } catch (_) {} q = q || sv; return NAVS[q] ? q : 'global'; }
        return PAGE_MODE[page()] || 'idx';
    }
    var base = function () { return (window.EwoksSiteContext && EwoksSiteContext.basePath) || ''; };
    window.gNav = function (t) {
        if (t === 'invest') { location.href = base() + 'pasar-global.html'; return; }
        if (t === 'jurnal') { location.href = base() + 'jurnal-pasar.html?m=' + mode(); return; }
        var m = mode(), file = m === 'global' ? 'global.html' : m + '.html';
        if (page() === m) { location.hash = t; } else { location.href = base() + file + '#' + t; }
    };
    window.ewoksGlobalNavMark = function (tab) {
        var cur = page() === 'pasar-global' ? 'invest' : page() === 'jurnal-pasar' ? 'jurnal' : tab;
        document.querySelectorAll('[data-gnav]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-gnav') === cur); });
    };
    function switcher(m) {
        return '<div class="mode-switch" role="group" aria-label="Pilih pasar">' + MODES.map(function (x) {
            return '<button type="button" class="' + (x[0] === m ? 'on' : '') + '" onclick="location.href=\'' + base() + x[2] + '\'" aria-pressed="' + (x[0] === m) + '">' + x[1] + '</button>';
        }).join('') + '</div>';
    }
    function init() {
        var m = mode(), nav = NAVS[m];
        try { localStorage.setItem('ewoks_mode', m); } catch (_) {}
        document.documentElement.setAttribute('data-mode', m);
        var mh = document.querySelector('header.md\\:hidden .flex.items-center.justify-between');
        if (mh && !mh.querySelector('.mode-switch')) { var btn = mh.querySelector('button'); var w = document.createElement('div'); w.innerHTML = switcher(m); if (btn) mh.insertBefore(w.firstChild, btn); }
        var d = document.querySelector('header.hidden.md\\:block nav');
        if (d) {
            if (nav) {
                d.innerHTML = switcher(m) + nav.map(function (n) { return '<button onclick="gNav(\'' + n[0] + '\')" data-gnav="' + n[0] + '" class="nav-link"><i class="fas ' + n[1] + '"></i> ' + n[2] + '</button>'; }).join('') +
                    '<button onclick="toggleDarkMode()" class="ml-2 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors" aria-label="Mode gelap"><i class="fas fa-moon" id="theme-icon"></i></button>';
            } else if (!d.querySelector('.mode-switch')) { var w2 = document.createElement('div'); w2.innerHTML = switcher('idx'); d.insertBefore(w2.firstChild, d.firstChild); }
        }
        if (nav) {
            var bn = document.querySelector('.bottom-nav');
            if (bn) bn.innerHTML = nav.map(function (n) { return '<button onclick="gNav(\'' + n[0] + '\')" data-gnav="' + n[0] + '" class="mobile-nav-btn flex-1"><i class="fas ' + n[1] + ' text-lg"></i><span class="text-[9px] font-bold">' + n[2] + '</span></button>'; }).join('');
            var dm = document.querySelector('header.md\\:hidden');
            if (dm) dm.querySelectorAll('.dropdown-content').forEach(function (x) { x.style.display = 'none'; });
            remark();
        }
    }
    function remark() {
        var m = mode(); if (!NAVS[m]) return;
        var h = (location.hash || '').replace('#', '');
        ewoksGlobalNavMark(h.indexOf('saham-') === 0 ? 'screener' : (h || 'ringkasan'));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    window.addEventListener('hashchange', remark);
    window.addEventListener('load', function () { remark(); setTimeout(remark, 400); });
})();

/* ======================================================================
 * ASISTEN TANYA-JAWAB — widget mengambang, memanggil Worker POST /ask.
 * Riwayat hanya di sessionStorage (hilang saat tab ditutup). Teks dirender aman (textContent).
 * ====================================================================== */
(function () {
    'use strict';
    if (window.__ewoksChat) return; window.__ewoksChat = 1;
    var KEY = 'ewoks_chat_hist', hist = [], busy = false;
    try { hist = JSON.parse(sessionStorage.getItem(KEY) || '[]') || []; } catch (_) { hist = []; }
    function save() { try { sessionStorage.setItem(KEY, JSON.stringify(hist.slice(-20))); } catch (_) {} }
    function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

    /* ---- Command (tanpa AI, jalan di browser; mirip command bot WA) ---- */
    var CBASE = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    var CMEM = {};
    function cjson(n) { if (!CMEM[n]) CMEM[n] = fetch(CBASE + 'assets/data/' + n + '?v=' + encodeURIComponent(window.EWOKS_ASSET_V || '1')).then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(function () { delete CMEM[n]; return null; }); return CMEM[n]; }
    function nf(v, d) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
    function px(v) { v = Number(v); return nf(v, v >= 1000 ? 2 : v >= 1 ? 3 : v >= 0.01 ? 5 : 8); }
    var MK = { idx: ['IHSG', 'watchlist.html'], global: ['Saham Global', 'global.html'], kripto: ['Kripto', 'bitcoin.html'], forex: ['Forex', 'forex.html'] };
    var HELP = 'Command yang tersedia:\n/pagi, /siang  5 rekomendasi + trading plan (BoW, TP, SL)\n/swing  10 kandidat swing ±1 minggu (TP1, TP2, TP Max)\n/scalp  kandidat scalping (TP 2,5% / SL 2% untuk saham)\nTiga command di atas: tambahkan pasar (ihsg | global | kripto | forex), atau ketik tanpa pasar lalu pilih tombolnya.\n/akum <kode> [tf], /topakum [pasar]  bandarmologi (akumulasi/distribusi), tf: 15M 30M 1J 4J 1H 7H 30H\n/ea [pasar] [tf], /eaus  Golden Cross MA5/MA20\n/analisa <kode>, /lk <kode>  valuasi, trading plan, nilai wajar (EPS x 15)\n/fibo <kode> [tf]  level Fibonacci (semua pasar)\n/global [kripto|forex|kode] [tf]  sinyal SMC (BoS, SMA, RSI)\n/harga <kode>  contoh: /harga BBCA, /harga BTC, /harga EURUSD, /harga NVDA\n/rekomendasi [ihsg|global|kripto|forex]  rekomendasi Bot Buy on Weakness\n/berita  5 berita terbaru\n/help  daftar ini\nBisa juga ketik biasa: "rekomendasi kripto", "harga bbca", "berita".\nPertanyaan lain dijawab asisten AI. Semua ini edukasi, bukan ajakan beli/jual.';
    function normCmd(q) {
        var t = q.trim(), l = t.toLowerCase();
        if (l.charAt(0) === '/') return t;
        var m = l.match(/^(?:minta |kasih |tampilkan |lihat )?(?:rekomendasi|rekomen|saran saham|bot picks)\s*(?:saham\s*)?(ihsg|idx|indonesia|global|us|amerika|kripto|crypto|forex|fx)?\s*$/);
        if (m) return '/rekomendasi ' + (m[1] || '');
        m = l.match(/^(?:rekomendasi |saran |kasih |minta )?(pagi|siang|swing|scalp|scalping|scalpus)\s*(?:saham\s*)?(ihsg|idx|indonesia|global|us|amerika|kripto|crypto|forex|fx)?\s*$/);
        if (m) return m[1] === 'scalpus' ? '/scalp global' : '/' + (m[1] === 'scalping' ? 'scalp' : m[1]) + ' ' + (m[2] || '');
        m = l.match(/^(?:harga|price|cek|kurs)\s+([a-z0-9.^=-]{1,12})$/); if (m) return '/harga ' + m[1];
        m = l.match(/^(akum|bandar|fibo|analisa|lk)\s+(\S+)(?:\s+(\S+))?$/); if (m) return '/' + m[1] + ' ' + m[2] + (m[3] ? ' ' + m[3] : '');
        if (/^(berita|news)( terbaru| terkini)?$/.test(l)) return '/berita';
        if (/^(help|menu|bantuan|command)$/.test(l)) return '/help';
        return null;
    }
    function mkey(a) { a = (a || '').toLowerCase(); if (/^(ihsg|idx|indonesia)$/.test(a)) return 'idx'; if (/^(global|us|amerika)$/.test(a)) return 'global'; if (/^(kripto|crypto)$/.test(a)) return 'kripto'; if (/^(forex|fx)$/.test(a)) return 'forex'; return ''; }
    function liveQ(sym) {
        var api = (typeof getEwoksLiveApi === 'function') ? getEwoksLiveApi() : ''; if (!api) return Promise.resolve(null);
        return fetch(api + '/gquotes?s=' + encodeURIComponent(sym), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) { return d && d.ok && d.q && d.q[sym] ? d.q[sym] : null; }).catch(function () { return null; });
    }
    async function cmdHarga(code) {
        var k = String(code || '').toUpperCase().replace(/^\$/, ''); if (!k) return 'Format: /harga <kode>. Contoh: /harga BBCA';
        var ihsg = await cjson('idx-screener.json'), r = ihsg && ihsg.rows ? ihsg.rows.filter(function (x) { return x[0] === k; })[0] : null;
        if (r) return k + ' (' + (r[11] || 'IHSG') + ')\nHarga Rp ' + nf(r[1], 0) + '  (' + (r[3] >= 0 ? '+' : '') + nf(r[3], 2) + '%)\nSupport Rp ' + nf(r[6], 0) + ' · Resist Rp ' + nf(r[7], 0) + '\nRentang 52 minggu Rp ' + nf(r[4], 0) + ' - ' + nf(r[5], 0) + '\nData harian IHSG, bisa tertunda. Detail: [Watchlist](' + CBASE + 'watchlist.html)';
        var cr = await cjson('crypto.json'), c = cr && cr.items ? cr.items.filter(function (x) { return x.k === k; })[0] : null;
        var fx = await cjson('forex.json'), f = fx && fx.items ? fx.items.filter(function (x) { return x.k === k; })[0] : null;
        var it = c || f, sym = it ? it.s : k, kind = c ? 'kripto' : f ? 'forex' : 'global';
        var q = await liveQ(sym), price = q ? q[0] : (it ? it.price : null), chg = q ? q[2] : (it ? it.chg : null);
        if (price == null || !isFinite(price)) {
            var gs = await cjson('global-screener.json'), g = gs && gs.rows ? gs.rows.filter(function (x) { return x[0] === k; })[0] : null;
            if (!g) return 'Kode "' + k + '" tidak ketemu. Coba kode saham IHSG (BBCA), kripto (BTC), forex (EURUSD), atau saham global (NVDA).';
            price = g[1]; chg = g[3];
        }
        var name = it ? it.n : '', pre = kind === 'forex' ? '' : '$';
        return k + (name ? ' (' + name + ')' : '') + '\nHarga ' + pre + px(price) + (chg != null && isFinite(chg) ? '  (' + (chg >= 0 ? '+' : '') + nf(chg, 2) + '%)' : '') + (q ? '\nHarga live dari Worker.' : '\nHarga dari data terakhir (live belum tersedia).') + '\nDetail: [' + MK[kind === 'kripto' ? 'kripto' : kind][0] + '](' + CBASE + MK[kind === 'kripto' ? 'kripto' : kind][1] + (kind === 'global' ? '#saham-' + k : '') + ')';
    }
    function cmdRek(a) {
        var k = mkey(a);
        if (!k) return 'Rekomendasi Bot (Buy on Weakness) per pasar:\n- [IHSG](' + CBASE + MK.idx[1] + ')\n- [Saham Global](' + CBASE + MK.global[1] + ')\n- [Kripto](' + CBASE + MK.kripto[1] + ')\n- [Forex](' + CBASE + MK.forex[1] + ')\nKetik mis. "rekomendasi kripto". Dihitung otomatis dari candle, tombol timeframe 5 menit / 1 jam / 4 jam ada di halamannya. Edukasi, bukan ajakan beli/jual.';
        var P = window.__ewoksPicks && window.__ewoksPicks[k];
        var link = '[Buka rekomendasi ' + MK[k][0] + '](' + CBASE + MK[k][1] + ')';
        if (!P || !P.list || !P.list.length) return 'Rekomendasi ' + MK[k][0] + ' dihitung di halamannya (belum dimuat di halaman ini atau belum ada yang lolos saringan).\n' + link + '\nEdukasi, bukan ajakan beli/jual.';
        var pre = k === 'forex' ? '' : '$', out = 'Rekomendasi Bot ' + MK[k][0] + ' (Buy on Weakness, candle ' + P.tfLabel + '):\n';
        P.list.slice(0, 5).forEach(function (x) { out += x.t + '  Last ' + pre + px(x.price) + '\n  Area BoW ' + px(x.lo) + ' - ' + px(x.hi) + ' · TP ' + px(x.tp) + ' · CL ' + px(x.cl) + ' · R/R ' + x.rr.toFixed(1) + '\n'; });
        return out + 'Diperbarui ' + P.at + '. ' + link + '\nEdukasi, bukan ajakan beli/jual. Selalu pakai stop loss.';
    }
    async function cmdBerita() {
        var d = await cjson('global-news.json'), it = d && d.items ? d.items.slice(0, 5) : [];
        if (!it.length) return 'Berita belum bisa dimuat.';
        return 'Berita terbaru:\n' + it.map(function (x) { return '- [' + x.title + '](' + x.link + ') (' + x.src + ')'; }).join('\n');
    }

    /* ---- Command rencana trading: /pagi /siang /swing /scalp (semua pasar, user memilih pasar) ---- */
    function askMarket(cmd, txt, only) {
        var all = [['IHSG', 'idx'], ['Saham Global', 'global'], ['Kripto', 'kripto'], ['Forex', 'forex']];
        return { text: txt, opts: all.filter(function (o) { return !only || only.indexOf(o[1]) > -1; }).map(function (o) { return [o[0], cmd + ' ' + o[1]]; }) };
    }
    function loadEngine() {
        if (window.EwoksPicksEngine) return Promise.resolve(window.EwoksPicksEngine);
        return new Promise(function (res) { var sc = document.createElement('script'); sc.src = CBASE + 'assets/js/picks-engine.js?v=' + encodeURIComponent(window.EWOKS_ASSET_V || '1'); sc.onload = function () { res(window.EwoksPicksEngine || null); }; sc.onerror = function () { res(null); }; document.head.appendChild(sc); });
    }
    function loadCmds() {
        if (window.EwoksChatCmds) return Promise.resolve(window.EwoksChatCmds);
        return new Promise(function (res) { var sc = document.createElement('script'); sc.src = CBASE + 'assets/js/chat-cmds.js?v=' + encodeURIComponent(window.EWOKS_ASSET_V || '1'); sc.onload = function () { res(window.EwoksChatCmds || null); }; sc.onerror = function () { res(null); }; document.head.appendChild(sc); });
    }
    var HEAVY = { akum: 1, bandar: 1, topakum: 1, ea: 1, eaus: 1, lk: 1, lkus: 1, analisa: 1, analisaus: 1, fibo: 1, fibous: 1, global: 1, scalpglobal: 1, globalcrypto: 1, globalforex: 1 };
    var KIND = { pagi: 'Rekomendasi Pagi', siang: 'Rekomendasi Siang', swing: 'Swing (±1 minggu)', scalp: 'Scalping' };
    var DISC = '\nEdukasi, bukan ajakan beli/jual. Selalu pakai stop loss.';
    async function planIdx(kind) {
        var d = await cjson('idx-screener.json'); if (!d || !d.rows) return 'Data IHSG belum bisa dimuat.';
        var R = function (v) { return 'Rp ' + nf(Math.round(v), 0); }, out = '', date = '';
        if (kind === 'scalp') {
            var sc = d.rows.filter(function (r) { return r[1] > 50 && r[3] >= 2 && r[3] <= 15 && r[1] * (r[9] || 0) > 2e9; }).sort(function (a, b) { return b[1] * b[9] - a[1] * a[9]; }).slice(0, 5);
            if (!sc.length) return 'Belum ada saham IHSG yang lolos filter scalping (naik 2-15% dengan transaksi > Rp 2 miliar).';
            sc.forEach(function (r) { date = r[10]; out += r[0] + '  ' + R(r[1]) + ' (+' + nf(r[3], 1) + '%)\n  Entry dekat ' + R(r[1]) + ' · TP ' + R(r[1] * 1.025) + ' (+2,5%) · SL ' + R(r[1] * 0.98) + ' (-2%)\n'; });
            return 'Scalping IHSG (naik 2-15%, transaksi > Rp 2 miliar), data harian ' + date + ':\n' + out + DISC;
        }
        var n = kind === 'swing' ? 10 : 5;
        var rows = d.rows.filter(function (r) { return r[1] > 50 && r[1] * (r[9] || 0) > 1e6 && r[3] > 0 && r[6] > 0 && r[7] > 0; }).sort(function (a, b) { return b[1] * b[9] - a[1] * a[9]; }).slice(0, 80)
            .map(function (r) { var tp = r[1] >= r[7] ? r[1] * 1.08 : r[7]; return { r: r, near: (r[1] - r[6]) / r[6], tp: tp, room: (tp - r[1]) / r[1] }; })
            .filter(function (x) { return x.room >= 0.03; }).sort(function (a, b) { return a.near - b.near; }).slice(0, n);
        if (!rows.length) return 'Belum ada saham IHSG yang lolos saringan hari ini.';
        rows.forEach(function (x) {
            var r = x.r, sup = r[6]; date = r[10];
            out += r[0] + '  ' + R(r[1]) + ' (+' + nf(r[3], 1) + '%)\n  Area BoW ' + R(sup) + ' - ' + R(sup * 1.03) + ' · SL ' + R(sup * 0.96) + '\n  ' +
                (kind === 'swing' ? 'TP1 ' + R(r[1] * 1.04) + ' (+4%) · TP2 ' + R(r[1] * 1.08) + ' (+8%) · TP Max ' + R(Math.max(x.tp, r[1] * 1.08)) : 'TP ' + R(x.tp) + (r[1] >= r[7] ? ' (harga di ATH 20 hari, TP +8%)' : ' (resist 20 hari)')) + '\n';
        });
        return KIND[kind] + ' IHSG (momentum naik, urut paling dekat support), data harian ' + date + ':\n' + out + 'BoW = low 20 hari sampai +3%. SL = support -4%.' + DISC;
    }
    async function planGlobalScalp() {
        var d = await cjson('global-screener.json'); if (!d || !d.rows) return 'Data saham global belum bisa dimuat.';
        var sc = d.rows.filter(function (r) { return r[1] > 5 && r[3] >= 1.5 && r[3] <= 25 && r[1] * (r[7] || 0) > 1e6; }).sort(function (a, b) { return b[1] * b[7] - a[1] * a[7]; }).slice(0, 5);
        if (!sc.length) return 'Belum ada saham global yang lolos filter scalping (naik 1,5-25%, harga > $5).';
        var out = ''; sc.forEach(function (r) { out += r[0] + ' (' + r[10] + ')  $' + px(r[1]) + ' (+' + nf(r[3], 1) + '%)\n  TP $' + nf(r[1] * 1.025, 2) + ' (+2,5%) · SL $' + nf(r[1] * 0.98, 2) + ' (-2%)\n'; });
        return 'Scalping Saham Global (naik 1,5-25%), data harian ' + sc[0][9] + ':\n' + out + DISC;
    }
    async function planEngine(kind, k) {
        var E = await loadEngine(); if (!E) return 'Mesin rekomendasi belum bisa dimuat.';
        var mk = k === 'kripto' ? 'crypto' : k, tf = kind === 'swing' ? '4h' : kind === 'scalp' ? '5m' : '1h', tfl = { '4h': '4 jam', '5m': '5 menit', '1h': '1 jam' }[tf];
        var r = await E.forMarket(mk).run(tf, 'ketat'), n = kind === 'swing' ? 10 : 5;
        if (r.fail === r.total) return 'Data candle ' + MK[k][0] + ' belum tersedia (cek koneksi atau Worker).';
        if (!r.list.length) return 'Belum ada ' + MK[k][0] + ' yang lolos saringan BoW di candle ' + tfl + '. Coba lagi nanti atau pasar lain.';
        var pre = k === 'forex' ? '' : '$', out = '';
        r.list.slice(0, n).forEach(function (x) {
            out += x.t + '  ' + pre + E.fmt(mk, x.price, x.t) + ' (' + (x.chg >= 0 ? '+' : '') + x.chg.toFixed(1) + '%)\n  Area BoW ' + E.fmt(mk, x.lo, x.t) + ' - ' + E.fmt(mk, x.hi, x.t) + ' · CL ' + E.fmt(mk, x.cl, x.t) + '\n  ' +
                (kind === 'swing' ? 'TP1 ' + E.fmt(mk, x.tp1, x.t) + ' · TP Max ' + E.fmt(mk, x.tp, x.t) : 'TP ' + E.fmt(mk, x.tp, x.t)) + ' · R/R ' + x.rr.toFixed(1) + '\n';
        });
        return KIND[kind] + ' ' + MK[k][0] + ' (Buy on Weakness, candle ' + tfl + '):\n' + out + 'Dihitung langsung dari candle saat ini. Tren naik, dekat support, ada ruang ke resist.' + DISC;
    }
    async function cmdPlan(kind, a) {
        var k = mkey(a);
        if (!k) return kind === 'scalp' ? askMarket('/scalp', 'Scalping untuk pasar mana?', ['idx', 'global', 'kripto', 'forex']) : askMarket('/' + kind, KIND[kind] + ' untuk pasar mana?');
        if (k === 'idx') return planIdx(kind);
        if (k === 'global' && kind === 'scalp') return planGlobalScalp();
        return planEngine(kind, k);
    }
    async function runCmd(q) {
        var c = normCmd(q); if (c == null) return null;
        var p = c.split(/\s+/), n = p[0].toLowerCase();
        if (n === '/help' || n === '/menu' || n === '/start') return HELP;
        if (n === '/harga' || n === '/price' || n === '/cek') return cmdHarga(p[1]);
        if (n === '/rekomendasi' || n === '/rekomen' || n === '/bow' || n === '/picks') return cmdRek(p[1]);
        if (n === '/pagi' || n === '/siang' || n === '/swing' || n === '/scalp') return cmdPlan(n.slice(1), p[1]);
        if (n === '/scalpus') return cmdPlan('scalp', 'global');
        if (HEAVY[n.slice(1)]) { var M = await loadCmds(); if (!M) return 'Modul command belum bisa dimuat. Coba lagi.'; var hr = await M.run(n.slice(1), p.slice(1)); return hr == null ? 'Command belum tersedia.' : hr; }
        if (n === '/berita' || n === '/news') return cmdBerita();
        return 'Command "' + p[0] + '" belum ada di chat web. Ketik /help. (Command lengkap dengan gambar ada di bot WhatsApp.)';
    }
    function rich(b, t) {
        b.textContent = '';
        String(t).split(/(\[[^\]]+\]\([^)\s]+\))/).forEach(function (seg) {
            var m = seg.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
            if (m && /^(https:\/\/|[a-z0-9_\/.#%-]+(\.html)?(#[^\s]*)?$|\.\.?\/)/i.test(m[2]) && !/^\s*javascript:/i.test(m[2])) { var a = document.createElement('a'); a.href = m[2]; a.textContent = m[1]; a.style.cssText = 'color:#34d399;text-decoration:underline'; if (/^https:/.test(m[2])) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } b.appendChild(a); }
            else b.appendChild(document.createTextNode(seg));
        });
        b.style.whiteSpace = 'pre-wrap';
    }

    var MASC = null;
    function loadMascot() {
        if (window.EwoksMascot) return Promise.resolve(window.EwoksMascot);
        if (MASC) return MASC;
        MASC = new Promise(function (res) { var sc = document.createElement('script'); sc.src = CBASE + 'assets/js/mascot.js?v=' + encodeURIComponent(window.EWOKS_ASSET_V || '1'); sc.onload = function () { res(window.EwoksMascot || null); }; sc.onerror = function () { res(null); }; document.head.appendChild(sc); });
        return MASC;
    }

    function init() {
        var st = document.createElement('style');
        st.textContent = '@keyframes ec-in{0%{transform:translate(220px,-60px) rotate(16deg) scale(.6);opacity:0}55%{opacity:1}80%{transform:translate(-6px,4px) rotate(-3deg)}100%{transform:none}}.ec-fab{position:fixed;right:6px;bottom:140px;z-index:60;width:136px;height:128px;padding:0;border:0;background:none;cursor:pointer;filter:drop-shadow(0 6px 8px rgba(0,0,0,.3));font-size:34px}.ec-fab.in{animation:ec-in 1.5s cubic-bezier(.2,.9,.3,1)}.ec-peek{position:absolute;right:8px;bottom:100%;width:214px;height:128px;margin-bottom:-5px;pointer-events:none;z-index:2}.ec-tip{position:absolute;right:100%;margin-right:-14px;top:8px;width:max-content;max-width:190px;background:#fff;color:#0f172a;font-size:12px;font-weight:600;line-height:1.35;padding:7px 10px;border-radius:12px 12px 2px 12px;box-shadow:0 6px 18px rgba(0,0,0,.25);opacity:0;transform:translateY(4px);transition:.25s;pointer-events:none;text-align:left}.ec-tip.on{opacity:1;transform:none}.ec-av{width:34px;height:36px;flex:none;margin-right:8px}.ec-ht{display:flex;align-items:center;min-width:0}.ec-ht b{display:block;font-size:15px;line-height:1.15}.ec-ht small{display:block;font-weight:400;font-size:10.5px;color:#94a3b8}' +
            '.ec-box{position:fixed;right:16px;bottom:150px;z-index:60;width:min(380px,calc(100vw - 32px));height:min(500px,calc(100vh - 320px));display:none;flex-direction:column;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.5);font-size:13px}.ec-h{border-radius:14px 14px 0 0}.ec-n{border-radius:0 0 14px 14px}' +
            '.ec-box.open{display:flex}.ec-h{padding:10px 12px;background:#111c33;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;font-weight:600}' +
            '.ec-h button{background:none;border:0;color:#94a3b8;cursor:pointer;font-size:16px}.ec-m{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px}' +
            '.ec-b{max-width:88%;padding:8px 10px;border-radius:10px;white-space:pre-wrap;line-height:1.45;word-break:break-word}.ec-u{align-self:flex-end;background:#10b981;color:#04130d}.ec-a{align-self:flex-start;background:#1e293b}' +
            '.ec-f{display:flex;gap:6px;padding:8px;border-top:1px solid #334155}.ec-box .ec-f input{flex:1;background:#1e293b!important;border:1px solid #334155!important;border-radius:8px;padding:8px;color:#e2e8f0!important;font-size:13px;min-width:0}' +
            '.ec-f button{background:#10b981;border:0;border-radius:8px;color:#04130d;padding:0 12px;font-weight:600;cursor:pointer}.ec-f button:disabled{opacity:.5}' +
            '.ec-n{font-size:10px;color:#64748b;padding:0 10px 6px}@media(min-width:768px){.ec-fab{bottom:84px}.ec-box{bottom:96px}}@media(min-width:1500px){.ec-fab{top:-4px;bottom:auto;right:10px;width:110px;height:104px}.ec-box{top:150px;bottom:auto;right:16px;height:min(520px,calc(100vh - 160px))}}';
        document.head.appendChild(st);
        var fab = el('button', 'ec-fab hk sc-fly', '💬'); fab.setAttribute('aria-label', 'Tanya Tido, asisten Ewoks'); var tip = el('span', 'ec-tip');
        var box = el('div', 'ec-box');
        var h = el('div', 'ec-h'); var ht = el('div', 'ec-ht'); ht.innerHTML = '<span><b>Tido</b><small>asisten Ewoks, ngantuk tapi paham</small></span>'; h.appendChild(ht);
        var peek = el('div', 'ec-peek pk'); box.appendChild(peek);
        var x = el('button', '', '✕'); x.setAttribute('aria-label', 'Tutup'); h.appendChild(x);
        var m = el('div', 'ec-m');
        var f = el('form', 'ec-f'); var inp = el('input'); inp.placeholder = 'Tanya Tido, atau ketik /help…'; inp.maxLength = 700; inp.autocomplete = 'off';
        var sb = el('button', '', 'Kirim'); sb.type = 'submit'; f.appendChild(inp); f.appendChild(sb);
        box.appendChild(h); box.appendChild(m); box.appendChild(f);
        box.appendChild(el('div', 'ec-n', 'Edukasi, bukan saran investasi. Jawaban AI bisa keliru — cek ulang.'));
        document.body.appendChild(fab); document.body.appendChild(box);
        // Layar lebar: pindahkan ke dalam header sticky supaya sejajar dengan jam dan ikut menempel saat scroll
        function place() {
            var wide = window.matchMedia('(min-width:1500px)').matches, tgt = document.body;
            if (wide) { var hs = document.querySelectorAll('header'); for (var i = 0; i < hs.length; i++) { if (hs[i].offsetHeight > 0 && hs[i].classList.contains('md:block') && hs[i].classList.contains('sticky')) { tgt = hs[i]; break; } } }
            if (fab.parentNode !== tgt) { tgt.appendChild(fab); tgt.appendChild(box); }
        }
        place(); window.addEventListener('resize', place);

        /* ---- Maskot Tido: scene acak di FAB (terbang, tiduran, main mobil, peluk bantal), nongol di tepi kotak chat ---- */
        var hooT = null, scene = 'fly', sceneT = null, M = null;
        function setScene(s) { scene = s; ['sit', 'sleep', 'car', 'fly'].forEach(function (k) { fab.classList.toggle('sc-' + k, k === s); }); }
        function hoo(state, ms) { [fab, peek].forEach(function (e) { e.classList.remove('is-hi', 'is-talk', 'is-think', 'is-wave'); if (state) e.classList.add('is-' + state); }); clearTimeout(hooT); if (state && ms) hooT = setTimeout(function () { hoo(''); }, ms); }
        function talk(txt) { hoo('talk', Math.max(1400, Math.min(5000, String(txt || '').length * 26))); }
        function enter() { fab.classList.remove('in'); void fab.offsetWidth; setScene('fly'); fab.classList.add('in'); }
        function idle() {
            clearTimeout(sceneT);
            sceneT = setTimeout(function () {
                if (!box.classList.contains('open') && !document.hidden) {
                    var opts = ['sit', 'sleep', 'car', 'fly'].filter(function (k) { return k !== scene; }), n = opts[Math.floor(Math.random() * opts.length)];
                    setScene(n); if (n === 'sit') { fab.classList.remove('is-yawn'); setTimeout(function () { if (scene === 'sit') { fab.classList.add('is-yawn'); setTimeout(function () { fab.classList.remove('is-yawn'); }, 2700); } }, 2500); }
                }
                idle();
            }, 8500 + Math.random() * 3500);
        }
        function showTip(msg, ms) { tip.textContent = msg; tip.classList.add('on'); clearTimeout(tip._t); tip._t = setTimeout(function () { tip.classList.remove('on'); }, ms || 6500); }
        loadMascot().then(function (MM) {
            if (!MM) return; M = MM; var st2 = document.createElement('style'); st2.textContent = M.css; document.head.appendChild(st2);
            fab.innerHTML = M.fab; fab.appendChild(tip); peek.innerHTML = M.peek; enter(); idle();
            try { if (!sessionStorage.getItem('ewoks_hoo_tip')) { sessionStorage.setItem('ewoks_hoo_tip', '1'); setTimeout(function () { if (!box.classList.contains('open')) showTip('Hoaam… eh, halo! Aku Tido. Tanya apa aja soal investasi ya 😴'); }, 2800); } } catch (_) {}
        });
        var TIPS = ['Hoaam… ada apa?', 'Eh, kamu manggil aku? 😴', 'Mau tanya soal saham? Sini!', 'Ketik /help buat lihat command~'];
        fab.addEventListener('mouseenter', function () { if (!M || box.classList.contains('open')) return; setScene('sit'); hoo('hi', 1600); showTip(TIPS[Math.floor(Math.random() * TIPS.length)], 3000); });
        var rq = 0; document.addEventListener('mousemove', function (e) { if (rq) return; rq = requestAnimationFrame(function () { rq = 0; var tg = box.classList.contains('open') ? peek : fab, r = tg.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), k = function (v) { return Math.max(-1, Math.min(1, v / 180)) * 3.6; }; [fab, peek].forEach(function (z) { z.style.setProperty('--hx', k(dx) + 'px'); z.style.setProperty('--hy', k(dy) * 0.6 + 'px'); }); }); }, { passive: true });
        function add(role, t) { var b = el('div', 'ec-b ' + (role === 'u' ? 'ec-u' : 'ec-a'), t); m.appendChild(b); m.scrollTop = m.scrollHeight; return b; }
        if (!hist.length) add('a', 'Hoaam… halo, aku Tido 😴 asisten Ewoks (ngantuk tapi paham). Tanya santai aja soal saham, kripto, forex, manajemen risiko, atau cara pakai web ini. Ketik /help buat lihat command (/harga, /rekomendasi, /pagi, /swing, /fibo, dll). Aku bantu belajar ya, bukan kasih sinyal beli/jual pasti.');
        hist.forEach(function (i) { add(i.r, i.t); });
        fab.onclick = function () { tip.classList.remove('on'); box.classList.add('open'); fab.style.display = 'none'; hoo('hi', 2200); inp.focus(); m.scrollTop = m.scrollHeight; };
        x.onclick = function () { box.classList.remove('open'); fab.style.display = ''; if (M) enter(); };
        f.onsubmit = async function (e) {
            e.preventDefault(); var q = inp.value.trim(); if (!q || busy) return;
            var api = (typeof getEwoksLiveApi === 'function') ? getEwoksLiveApi() : '';
            inp.value = ''; add('u', q);
            if (normCmd(q) != null) {
                var cw = add('a', 'Tido lagi ngitung sambil ngucek mata…'); busy = true; sb.disabled = true; hoo('think');
                try {
                    var cr = await runCmd(q), ct = typeof cr === 'string' ? cr : cr.text; rich(cw, ct);
                    if (cr && cr.opts) { var bar = el('div'); bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px'; cr.opts.forEach(function (o) { var bt = el('button', '', o[0]); bt.type = 'button'; bt.style.cssText = 'padding:5px 10px;border-radius:999px;border:1px solid #10b981;background:transparent;color:#34d399;font-size:12px;font-weight:700;cursor:pointer'; bt.onclick = function () { inp.value = o[1]; f.dispatchEvent(new Event('submit', { cancelable: true })); }; bar.appendChild(bt); }); cw.appendChild(bar); }
                } catch (_) { cw.textContent = 'Command gagal dijalankan. Coba lagi.'; }
                talk(cw.textContent); busy = false; sb.disabled = false; m.scrollTop = m.scrollHeight; return;
            }
            if (!api) { add('a', 'Server asisten belum diatur.'); return; }
            busy = true; sb.disabled = true; var w = add('a', 'Tido lagi mikir…'); hoo('think');
            try {
                var ctl = new AbortController(); var tm = setTimeout(function () { ctl.abort(); }, 30000);
                var r = await fetch(api + '/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
                    body: JSON.stringify({ q: q, hist: hist.slice(-6), page: document.body.getAttribute('data-page') || location.pathname.split('/').pop() }) });
                clearTimeout(tm);
                var d = await r.json().catch(function () { return {}; });
                var ans = d && d.ok ? d.a : (d && d.code === 'not_configured' ? 'Asisten belum diaktifkan oleh pemilik situs.' : (d && d.error) || 'Gagal menghubungi asisten.');
                w.textContent = ans;
                if (d && d.ok) { hist.push({ r: 'u', t: q }); hist.push({ r: 'a', t: ans }); save(); }
            } catch (_) { w.textContent = 'Koneksi bermasalah atau terlalu lama. Coba lagi.'; }
            talk(w.textContent); busy = false; sb.disabled = false; m.scrollTop = m.scrollHeight;
        };
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
