/** Versi aset — naikkan setelah deploy agar GitHub Pages tidak pakai cache JS/CSS lama. */
window.EWOKS_ASSET_V = '20261125t0906';

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
    const at = liveAt || built;
    const full = at ? `Update data pasar: ${formatStampWib(at)}` : 'Update data pasar: belum tersedia';
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
    // Utama: global-news.json (diperbarui workflow sync-24jam tiap 30 menit, 24 jam, termasuk CNBC Indonesia). rss2json hanya cadangan.
    try {
        const V = encodeURIComponent(window.EWOKS_ASSET_V || '1') + '.' + Math.floor(Date.now() / 600000), B = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
        const gj = await (await fetch(B + 'assets/data/global-news.json?v=' + V)).json();
        const its = (gj.items || []).filter(x => x.lang === 'id' && x.title && x.link).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 12);
        if (its.length >= 4) {
            const dec = t => { const e = document.createElement('textarea'); e.innerHTML = t; return e.value; };
            const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
            container.innerHTML = its.map(item => {
                const d = new Date(item.ts), w = d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(':', '.') + ' WIB';
                return `<a href="${esc(item.link)}" target="_blank" rel="noopener" class="block p-3 rounded-xl border border-slate-100 hover:bg-blue-50 transition-colors bg-white shadow-sm">
                    <p class="text-[10px] text-blue-500 font-black mb-1 uppercase tracking-widest">${esc(w)} · ${esc(item.src || '')}</p>
                    <h4 class="text-xs md:text-sm font-bold text-slate-800 line-clamp-2">${esc(dec(item.title))}</h4>
                </a>`;
            }).join('');
            return;
        }
    } catch (_) { /* lanjut ke cadangan */ }
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



/** Cadangan tanpa Worker: harga ±10 menit dari file statis (live-idx.json, dibuat GitHub Actions di jam bursa). */
async function ewoksStaticLiveIdx() {
    try {
        const v = encodeURIComponent(window.EWOKS_ASSET_V || '1');
        const base = (typeof EwoksSiteContext !== 'undefined' && EwoksSiteContext.basePath) || '';
        const r = await fetch(`${base}assets/data/live-idx.json?v=${v}`, { cache: 'no-store' });
        if (!r.ok) return null;
        const d = await r.json();
        if (!d || !d.q || !d.ts) return null;
        // basi lebih dari 6 jam (pasar tutup/akhir pekan) tetap boleh: itu harga penutupan terakhir.
        return d;
    } catch (_) { return null; }
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
    if (!ok) {
        const st = await ewoksStaticLiveIdx();
        if (st) { const q2 = {}; codes.forEach((c) => { if (st.q[c]) q2[c] = st.q[c]; }); if (Object.keys(q2).length) return { q: q2, ts: st.ts, ok: 1, total: 1, static: true }; }
        throw lastErr || new Error('gagal');
    }
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
            watchlist.forEach((w) => w && w.ticker && (!w.mk || w.mk === 'idx') && set.add(String(w.ticker).toUpperCase()));
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
        let data = null;
        try {
            let res = null;
            for (let attempt = 0; attempt < 2 && !res; attempt++) {
                const ctl = new AbortController();
                const timer = setTimeout(() => ctl.abort(), 8000);
                try {
                    res = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
                } catch (err) {
                    if (attempt === 1) throw (err && err.name === 'AbortError' ? new Error('Worker terlalu lambat') : err);
                    await new Promise((r) => setTimeout(r, 800));
                } finally {
                    clearTimeout(timer);
                }
            }
            if (!res.ok) throw new Error('HTTP ' + res.status);
            data = await res.json();
        } catch (werr) {
            // Worker tidak terjangkau (mis. workers.dev diblokir jaringan): pakai harga statis ±10 menit.
            const st = await ewoksStaticLiveIdx();
            if (!st) throw werr;
            data = { ts: st.ts, quotes: {} };
            tickers.forEach((t) => { const a = st.q[t]; if (a) data.quotes[t] = { price: a[0], prevClose: a[1], changePct: a[2], time: st.ts }; });
            if (wantIhsg && st.ihsg) data.ihsg = { price: st.ihsg[0], prevClose: st.ihsg[1], changePct: st.ihsg[2] };
        }
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
    const pInf = document.getElementById('p-inflation'), pRet = document.getElementById('p-return');
    if (!infEl && !sbnEl && !biEl && !fedEl && !pInf && !pRet) return;
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
        // Kalkulator Pensiun: badge "AUTO LIVE" = isi asumsi dari data terbaru (sekali saat dibuka; tidak menimpa kalau pengguna sudah mengetik).
        const autoFill = (el, v) => { if (el && Number.isFinite(v) && document.activeElement !== el) { el.value = String(v); el.dispatchEvent(new Event('input')); } };
        autoFill(pInf, m?.inflation?.value); autoFill(pRet, m?.sbn10y?.value);
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
    var HELP = 'Command yang tersedia:\n/cek <kode>  ringkasan cepat: harga + bandar + Fibonacci (semua pasar)\n/rd [rdpu|rdpt|rds|rdc|rdi]  database reksa dana\n/istilah <kata>  arti istilah (PER, SBN, ARA, dst.)\n/topreturn [idx|global]  saham naik paling tinggi 52 minggu\n/pagi, /siang  5 rekomendasi + trading plan (BoW, TP, SL). Tambah budget: /pagi idx 500, /swing idx 1000, /scalp global 10\n/swing  10 kandidat swing ±1 minggu (TP1, TP2, TP Max)\n/scalp  kandidat scalping (TP 2,5% / SL 2% untuk saham)\nTiga command di atas: tambahkan pasar (ihsg | global | kripto | forex), atau ketik tanpa pasar lalu pilih tombolnya.\n/akum <kode> [tf], /topakum [pasar]  bandarmologi (akumulasi/distribusi), tf: 15M 30M 1J 4J 1H 7H 30H\n/ea [pasar] [tf], /eaus  Golden Cross MA5/MA20\n/analisa <kode>, /lk <kode>  valuasi, trading plan, nilai wajar (EPS x 15)\n/fibo <kode> [tf]  level Fibonacci (semua pasar)\n/global [kripto|forex|kode] [tf]  sinyal SMC (BoS, SMA, RSI)\n/harga <kode>  contoh: /harga BBCA, /harga BTC, /harga EURUSD, /harga NVDA\n/rekomendasi [ihsg|global|kripto|forex]  rekomendasi Bot Buy on Weakness\n/berita  5 berita terbaru\n/help  daftar ini\nBisa juga ketik biasa: "rekomendasi kripto", "harga bbca", "berita".\nPertanyaan lain dijawab asisten AI. Semua ini edukasi, bukan ajakan beli/jual.';
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
        if (/^(halo|hai|hi|hello|hallo|helo|selamat (pagi|siang|sore|malam)|makasih|terima kasih|thanks|thx)( tido)?[!. ]*$/.test(l)) return '/help'; // sapaan: jawab lokal (tanpa AI/Worker)
        if (l.length <= 160 && NL_RE.test(l)) return '/nl ' + t;
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
        if (r) return k + ' (' + (r[11] || 'IHSG') + ')\nHarga Rp ' + nf(r[1], 0).replace(/,/g, '.') + '  (' + (r[3] >= 0 ? '+' : '') + nf(r[3], 2) + '%)\nSupport Rp ' + nf(r[6], 0).replace(/,/g, '.') + ' · Resist Rp ' + nf(r[7], 0).replace(/,/g, '.') + '\nRentang 52 minggu Rp ' + nf(r[4], 0).replace(/,/g, '.') + ' - ' + nf(r[5], 0).replace(/,/g, '.') + '\nData harian IHSG, bisa tertunda. Detail: [Watchlist](' + CBASE + 'watchlist.html)';
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
    async function cmdRek(a) {
        var k = mkey(a);
        if (k === 'idx') { var L = await bowIdx(null, false), md = 'ketat'; if (!L || L.length < 4) { L = await bowIdx(null, true); md = 'longgar'; } if (!L) return 'Data IHSG belum bisa dimuat.'; if (!L.length) return 'Belum ada saham IHSG yang lolos saringan BoW hari ini.'; var Rr = function (v) { return 'Rp ' + nf(Math.round(v), 0).replace(/,/g, '.'); }; return { text: 'Rekomendasi Bot IHSG · Buy on Weakness (' + md + '): ' + L.length + ' saham lolos, tampil ' + Math.min(5, L.length) + ' teratas.\nData harian ' + L[0].date + '.' + '\n[Lihat semua di Terminal](' + CBASE + MK.idx[1] + ')' + DISC, picks: L.slice(0, 5).map(function (x) { return bowCard(x, Rr); }) }; }
        if (!k) return 'Rekomendasi Bot (Buy on Weakness) per pasar:\n- [IHSG](' + CBASE + MK.idx[1] + ')\n- [Saham Global](' + CBASE + MK.global[1] + ')\n- [Kripto](' + CBASE + MK.kripto[1] + ')\n- [Forex](' + CBASE + MK.forex[1] + ')\nKetik mis. "rekomendasi kripto". Dihitung otomatis dari candle, tombol timeframe 5 menit / 1 jam / 4 jam ada di halamannya. Edukasi, bukan ajakan beli/jual.';
        return planEngine('pagi', k, null);
    }
    async function cmdBerita() {
        var d = await cjson('global-news.json'), it = d && d.items ? d.items.slice(0, 5) : [];
        if (!it.length) return 'Berita belum bisa dimuat.';
        return 'Berita terbaru:\n' + it.map(function (x) { return '- [' + x.title + '](' + x.link + ') (' + x.src + ')'; }).join('\n');
    }


    /* /komoditas [kata] -> kartu harga komoditas/kurs/indeks dunia + tombol Pantau (tanpa level BoW) */
    var KOM_ALIAS = { emas: 'gold', perak: 'silver', minyak: 'brent wti', batubara: 'coal', 'batu bara': 'coal', tembaga: 'copper', gas: 'gas', kopi: 'coffee', gula: 'sugar', jagung: 'corn', gandum: 'wheat', kedelai: 'soy', kakao: 'cocoa', platina: 'platinum', dolar: 'usdidr', kurs: 'usdidr' };
    async function cmdKomoditas(args) {
        var d = await cjson('global-commodities.json'); if (!d || !d.items) return 'Data komoditas belum bisa dimuat.';
        var q = (args || []).join(' ').toLowerCase().trim(), ids = null;
        if (q) { ids = []; Object.keys(KOM_ALIAS).forEach(function (k) { if (q.indexOf(k) > -1) ids = ids.concat(KOM_ALIAS[k].split(' ')); }); }
        var its = d.items.filter(function (x) { return ids && ids.length ? ids.indexOf(x.id) > -1 : q ? (x.n + ' ' + x.id).toLowerCase().indexOf(q) > -1 : ['gold', 'silver', 'brent', 'wti', 'copper', 'coal', 'gas', 'usdidr'].indexOf(x.id) > -1; }).slice(0, 8);
        if (!its.length) return { text: 'Aku ga nemu komoditas itu 😴 Coba: emas, perak, minyak, batu bara, tembaga, gas, kopi, gula, dolar.', opts: [['Emas', '/komoditas emas'], ['Minyak', '/komoditas minyak'], ['Semua utama', '/komoditas']] };
        var pk = its.map(function (x) {
            var dp = x.price >= 1000 ? 0 : x.price >= 10 ? 2 : 4, F = function (v) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }); }, sg = function (v) { return v == null ? '-' : (v >= 0 ? '+' : '') + v.toFixed(2).replace('.', ',') + '%'; };
            return { t: x.n, price: x.price, priceTxt: F(x.price) + (x.u ? ' ' + x.u : ''), chg: x.chg, rows: [['1 hari', sg(x.chg), x.chg >= 0 ? 'g' : 'r'], ['1 bulan', sg(x.chg1m), x.chg1m >= 0 ? 'g' : 'r']], note: 'Data ' + (x.time ? new Date(x.time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'terbaru'), simple: { t: x.id, mk: 'komoditas', name: x.n } };
        });
        return { text: 'Komoditas, kurs, dan indeks dunia (data diperbarui otomatis tiap 30 menit, kecuali pasar tutup).' + DISC, picks: pk };
    }
    /* ---- Command rencana trading: /pagi /siang /swing /scalp (semua pasar, user memilih pasar) ---- */
    function askMarket(cmd, txt, only, suf) {
        var all = [['IHSG', 'idx'], ['Saham Global', 'global'], ['Kripto', 'kripto'], ['Forex', 'forex']];
        return { text: txt, opts: all.filter(function (o) { return !only || only.indexOf(o[1]) > -1; }).map(function (o) { return [o[0], cmd + ' ' + o[1] + (suf || '')]; }) };
    }

    /* ---- Kartu rekomendasi di chat (rapi) + tombol Pantau ke Watchlist ---- */
    function tkR(v, up) { var t = v < 200 ? 1 : v < 500 ? 2 : v < 2000 ? 5 : v < 5000 ? 10 : 25; return (up ? Math.ceil(v / t - 1e-9) : Math.floor(v / t + 1e-9)) * t; }
    function bowWatchAdd(p) {
        if (typeof watchlist === 'undefined' || !p || !p.bow) return 'err';
        if (watchlist.some(function (w) { return w.ticker === p.t && (w.mk || 'idx') === (p.mk || 'idx'); })) return 'dup';
        watchlist.push({ id: Date.now() + Math.floor(Math.random() * 1000), ticker: p.t, mk: p.mk || 'idx', price: String(p.bow.hi), note: 'Dari Tido · R/R ±' + p.bow.rr.toFixed(1), foreign: '', bow: { lo: p.bow.lo, hi: p.bow.hi, tp: p.bow.tp, cl: p.bow.cl, ref: p.price, date: new Date().toISOString().slice(0, 10) } });
        try { localStorage.setItem('ewoks_watchlist', JSON.stringify(watchlist)); } catch (_) {}
        try { if (typeof renderWatchlist === 'function' && document.getElementById('watchlist-container')) renderWatchlist(); } catch (_) {}
        return 'ok';
    }
    window.ewoksBowWatchAdd = bowWatchAdd;
    /* Pantau tanpa level BoW (komoditas/kurs/indeks dan reksa dana): {t, mk:'komoditas'|'rd', name} */
    function simpleWatchAdd(p) {
        if (typeof watchlist === 'undefined' || !p || !p.t) return 'err';
        if (watchlist.some(function (w) { return w.ticker === p.t && (w.mk || 'idx') === p.mk; })) return 'dup';
        watchlist.push({ id: Date.now() + Math.floor(Math.random() * 1000), ticker: p.t, mk: p.mk, name: p.name || '', price: '', note: p.note || (p.mk === 'rd' ? 'Reksa dana dari database Ewoks' : 'Dipantau dari Ewoks'), foreign: '' });
        try { localStorage.setItem('ewoks_watchlist', JSON.stringify(watchlist)); } catch (_) {}
        try { if (typeof renderWatchlist === 'function' && document.getElementById('watchlist-container')) renderWatchlist(); } catch (_) {}
        return 'ok';
    }
    window.ewoksWatchAdd = simpleWatchAdd;
    function picksCss() {
        if (document.getElementById('ec-pk-css')) return; var st = document.createElement('style'); st.id = 'ec-pk-css';
        st.textContent = '.ec-pk{display:flex;flex-direction:column;gap:10px;margin-top:10px;white-space:normal}.ec-pc{background:#0f172a;border:1px solid #334155;border-left:3px solid #22c55e;border-radius:10px;padding:9px 11px}' +
            '.ec-ph{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}.ec-ph b{font-size:15px;color:#fff}.ec-ph span{font-size:11px;color:#94a3b8}.ec-ph i{margin-left:auto;font-style:normal;font-size:11px;font-weight:700}.ec-ph i.u{color:#4ade80}.ec-ph i.d{color:#f87171}' +
            '.ec-pr{display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:2px 0;color:#cbd5e1}.ec-pr b{color:#fff;font-family:ui-monospace,monospace;font-weight:700}.ec-pr b.g{color:#4ade80}.ec-pr b.r{color:#f87171}' +
            '.ec-pn{font-size:10.5px;color:#64748b;margin-top:4px}.ec-pa{margin-top:7px;padding:4px 11px;border-radius:999px;border:0;background:#22c55e;color:#04130d;font-size:11px;font-weight:800;cursor:pointer}.ec-pa[disabled]{background:#334155;color:#94a3b8;cursor:default}.ec-pall{align-self:flex-start;padding:5px 12px;border-radius:999px;border:1px solid #22c55e;background:transparent;color:#4ade80;font-size:12px;font-weight:800;cursor:pointer}';
        document.head.appendChild(st);
    }
    var lastPicks = null;
    function picksUI(box, picks) {
        if (!picks || !picks.length) return; picksCss(); lastPicks = picks; box._pk = picks;
        var wrap = el('div', 'ec-pk'), btns = [];
        function mark(b, r) { b.textContent = r === 'dup' ? 'Sudah dipantau ✓' : r === 'ok' ? 'Dipantau ✓' : 'Gagal'; b.disabled = true; }
        picks.forEach(function (p) {
            var c = el('div', 'ec-pc'), h = el('div', 'ec-ph'); h.appendChild(el('b', '', p.t)); if (p.priceTxt) h.appendChild(el('span', '', p.priceTxt));
            if (p.chg != null) h.appendChild(el('i', p.chg >= 0 ? 'u' : 'd', (p.chg >= 0 ? '+' : '') + p.chg.toFixed(1).replace('.', ',') + '%'));
            c.appendChild(h);
            p.rows.forEach(function (r) { var d = el('div', 'ec-pr'); d.appendChild(el('span', '', r[0])); d.appendChild(el('b', r[2] || '', r[1])); c.appendChild(d); });
            if (p.note) c.appendChild(el('div', 'ec-pn', p.note));
            if (p.bow || p.simple) { var b = el('button', 'ec-pa', '+ Pantau'); b.type = 'button'; b.onclick = function () { mark(b, p.simple ? simpleWatchAdd(p.simple) : bowWatchAdd(p)); }; btns.push([b, p]); c.appendChild(b); }
            wrap.appendChild(c);
        });
        if (btns.length > 1) { var all = el('button', 'ec-pall', '+ Pantau semua (' + btns.length + ')'); all.type = 'button'; all.onclick = function () { btns.forEach(function (x) { if (!x[0].disabled) mark(x[0], x[1].simple ? simpleWatchAdd(x[1].simple) : bowWatchAdd(x[1])); }); all.disabled = true; all.textContent = 'Semua masuk Watchlist ✓'; }; wrap.appendChild(all); }
        box.appendChild(wrap);
    }
    /* BoW IHSG: aturan sama dengan kartu di halaman Terminal (page-bot-picks.js) */
    async function bowIdx(B, loose) {
        var d = await cjson('idx-screener.json'), st = await cjson('idx-status.json'); if (!d || !d.rows) return null;
        var info = d.info || {}, items = (st && st.items) || {}, out = [], cutoff = Date.now() - 6 * 86400e3;
        d.rows.forEach(function (r) {
            var t = r[0], price = r[1], chg = r[3], sup = r[6], res = r[7], ma50 = r[8], vol = r[9], date = r[10];
            if (!(price >= 60) || (B && price > B) || !sup || !res || !ma50 || !date || new Date(date).getTime() < cutoff) return;
            var fl = (items[t] || []).map(function (x) { return x[0]; });
            if (/SUSPEN|DELIST|PPK|UMA/.test(fl.join(' '))) return;
            var board = info[t] && info[t][0]; if (board && /pemantauan khusus|pengembangan/i.test(board) && board !== 'Utama') return;
            if ((vol || 0) * price < (B ? 2e8 : 5e8)) return;
            var dist = (price - sup) / price * 100, room = (res - price) / price * 100;
            if (price < ma50 * (loose ? 0.96 : 0.99) || dist < -0.5 || dist > (loose ? 10 : 6.5) || room < (loose ? 5 : 8)) return;
            var lo = tkR(sup, 1), hi = tkR(sup * 1.02, 1), cl = tkR(sup * 0.97), tp = tkR(res); if (hi <= lo) hi = lo + 1;
            var mid = (lo + hi) / 2, rr = (tp - mid) / (mid - cl); if (!(rr >= (loose ? 1.2 : 1.5)) || cl >= lo) return;
            out.push({ t: t, price: price, chg: chg, lo: lo, hi: hi, tp: tp, cl: cl, rr: rr, date: date, score: rr * 10 + Math.max(0, 6 - dist) * 2 + (chg != null && chg <= 0.5 ? 3 : 0) + Math.min(5, Math.log10((vol || 1) * price / 1e9)) });
        });
        out.sort(function (a, b) { return b.score - a.score; });
        return refineIdx(out, loose ? 'longgar' : 'ketat');
    }
    /* Ganti level persen tetap dengan level dari candle (swing support/resist + ATR). Kalau candle tidak tersedia, level kasar dipertahankan dan diberi tanda. */
    async function refineIdx(list, mode) {
        var E = await loadEngine(); if (!E || !E.idxSmart) return list.map(function (x) { x.rough = true; return x; });
        var top = list.slice(0, 18), r = await E.idxSmart(top.map(function (x) { return { k: x.t }; }), mode);
        if (!r.avail) return list.map(function (x) { x.rough = true; return x; });
        var out = []; top.forEach(function (x) { var a = r.map[x.t]; if (a) { a.date = x.date; a.chg = x.chg; a.price = x.price; out.push(a); } });
        return out.sort(function (a, b) { return b.score - a.score; });
    }
    function bowCard(x, R) {
        return { t: x.t, price: x.price, priceTxt: 'Last ' + R(x.price), chg: x.chg, rows: [['Area BoW', R(x.lo).replace('Rp ', '') + ' - ' + R(x.hi).replace('Rp ', '')], ['TP terdekat', R(x.tp).replace('Rp ', ''), 'g'], ['Strict CL (jebol)', R(x.cl).replace('Rp ', ''), 'r']], note: 'R/R ±' + x.rr.toFixed(1) + (x.rough ? ' · Level kasar (candle belum tersedia).' : ' · Level dari candle harian (swing support/resist + ATR).'), mk: 'idx', bow: { lo: x.lo, hi: x.hi, tp: x.tp, cl: x.cl, rr: x.rr } };
    }
    function loadEngine() {
        if (window.EwoksPicksEngine) return Promise.resolve(window.EwoksPicksEngine);
        return new Promise(function (res) { var sc = document.createElement('script'); sc.src = CBASE + 'assets/js/picks-engine.js?v=' + encodeURIComponent(window.EWOKS_ASSET_V || '1'); sc.onload = function () { res(window.EwoksPicksEngine || null); }; sc.onerror = function () { res(null); }; document.head.appendChild(sc); });
    }
    function loadCmds() {
        if (window.EwoksChatCmds) return Promise.resolve(window.EwoksChatCmds);
        return new Promise(function (res) { var sc = document.createElement('script'); sc.src = CBASE + 'assets/js/chat-cmds.js?v=' + encodeURIComponent(window.EWOKS_ASSET_V || '1'); sc.onload = function () { res(window.EwoksChatCmds || null); }; sc.onerror = function () { res(null); }; document.head.appendChild(sc); });
    }
    var HEAVY = { akum: 1, bandar: 1, topakum: 1, ea: 1, eaus: 1, lk: 1, lkus: 1, analisa: 1, analisaus: 1, fibo: 1, fibous: 1, global: 1, scalpglobal: 1, globalcrypto: 1, globalforex: 1, rd: 1, reksadana: 1, istilah: 1, topreturn: 1, koneksi: 1, diag: 1 };
    var KIND = { pagi: 'Rekomendasi Pagi', siang: 'Rekomendasi Siang', swing: 'Swing (±1 minggu)', scalp: 'Scalping' };
    var DISC = '\nEdukasi, bukan ajakan beli/jual. Selalu pakai stop loss.';
    async function planIdx(kind, B) {
        var d = await cjson('idx-screener.json'); if (!d || !d.rows) return 'Data IHSG belum bisa dimuat.';
        var R = function (v) { return 'Rp ' + nf(Math.round(v), 0).replace(/,/g, '.'); }, out = '', date = '';
        if (kind === 'scalp') {
            var sc = d.rows.filter(function (r) { return r[1] > 50 && (!B || r[1] <= B) && r[3] >= 2 && r[3] <= 15 && r[1] * (r[9] || 0) > (B ? 2e8 : 2e9); }).sort(function (a, b) { return b[1] * b[9] - a[1] * a[9]; }).slice(0, 5);
            if (!sc.length) return 'Belum ada saham IHSG' + budTxt(B) + ' yang lolos filter scalping (naik 2-15%, transaksi cukup). Coba budget lebih besar atau /pagi.';
            var spk = sc.map(function (r) { date = r[10]; return { t: r[0], price: r[1], priceTxt: 'Last ' + R(r[1]), chg: r[3], rows: [['Entry dekat', nf(r[1], 0).replace(/,/g, '.')], ['TP (+2,5%)', nf(Math.round(r[1] * 1.025), 0).replace(/,/g, '.'), 'g'], ['SL (-2%)', nf(Math.round(r[1] * 0.98), 0).replace(/,/g, '.'), 'r']] }; });
            return { text: 'Scalping IHSG' + budTxt(B) + ' · naik 2-15%, transaksi ' + (B ? '> Rp 200 juta' : '> Rp 2 miliar') + '.\nData harian ' + date + '.' + DISC, picks: spk, opts: budOpts('scalp', 'idx', B) };
        }
        var n = kind === 'swing' ? 10 : 5;
        var rows = d.rows.filter(function (r) { return r[1] > 50 && (!B || r[1] <= B) && r[1] * (r[9] || 0) > 1e6 && r[3] > 0 && r[6] > 0 && r[7] > 0; }).sort(function (a, b) { return b[1] * b[9] - a[1] * a[9]; }).slice(0, 80)
            .map(function (r) { var tp = r[1] >= r[7] ? r[1] * 1.08 : r[7]; return { r: r, near: (r[1] - r[6]) / r[6], tp: tp, room: (tp - r[1]) / r[1] }; })
            .filter(function (x) { return x.room >= 0.03; }).sort(function (a, b) { return a.near - b.near; }).slice(0, 80); // candle statis murah dicek semua; hasil akhir dipotong n di bawah
        // Level dari candle harian (swing support/resist + ATR); kalau candle tidak tersedia, jatuh ke level kasar dari support/resist 20 hari.
        var E = await loadEngine(), sm = { map: {}, avail: 0 }, md = 'longgar';
        // Candle statis mencakup semua saham IHSG: cek semuanya (bukan hanya yang dekat support menurut screener), urut skor mesin.
        var wide = d.rows.filter(function (r) { return r[1] >= 50 && (!B || r[1] <= B); }).sort(function (a, b) { return b[1] * (b[9] || 0) - a[1] * (a[9] || 0); }).map(function (r) { return { r: r, tp: 0 }; });
        if (E && E.idxSmart) sm = await E.idxSmart(wide.map(function (x) { return { k: x.r[0] }; }), md);
        if (sm.avail) rows = wide.filter(function (x) { return sm.map[x.r[0]]; }).sort(function (a, b) { return sm.map[b.r[0]].score - sm.map[a.r[0]].score; });
        var rough = !sm.avail, picks = [];
        rows.forEach(function (x) {
            var r = x.r, a = sm.map[r[0]]; date = r[10];
            if (!rough && !a) return;
            var lo, hi, cl, tp, tp1, rr;
            if (a) { lo = a.lo; hi = a.hi; cl = a.cl; tp = a.tp; tp1 = a.tp1; rr = a.rr; }
            else { var sup = r[6]; lo = tkR(sup, 1); hi = tkR(sup * 1.03, 1); cl = tkR(sup * 0.96); tp = tkR(Math.max(x.tp, kind === 'swing' ? r[1] * 1.08 : 0)); tp1 = r[1] * 1.04; rr = (tp - (lo + hi) / 2) / ((lo + hi) / 2 - cl); }
            var N0 = function (v) { return nf(Math.round(v), 0).replace(/,/g, '.'); };
            var rw = [['Area BoW', N0(lo) + ' - ' + N0(hi)]];
            if (kind === 'swing') { rw.push(['TP1', N0(tp1), 'g']); rw.push(['TP Max', N0(tp), 'g']); } else rw.push(['TP', N0(tp), 'g']);
            rw.push(['Strict CL', N0(cl), 'r']);
            picks.push({ t: r[0], mk: 'idx', price: r[1], priceTxt: 'Last ' + R(r[1]), chg: r[3], rows: rw, note: 'R/R ±' + rr.toFixed(1) + (a ? ' · Level dari candle harian (swing + ATR)' : ' · Level kasar (candle belum tersedia)'), bow: rr > 0 && cl < lo ? { lo: lo, hi: hi, tp: tp, cl: cl, rr: rr } : null });
        });
        picks = picks.slice(0, n);
        if (!picks.length) return { text: 'Belum ada saham IHSG' + budTxt(B) + ' yang lolos saringan candle hari ini. Coba budget lebih besar.', opts: budOpts(kind, 'idx', B) };
        return { text: KIND[kind] + ' IHSG' + budTxt(B) + ' · momentum naik, urut paling dekat support.\nData harian ' + date + '. ' + (rough ? 'Level kasar (candle belum tersedia).' : 'Area/CL/TP dihitung dari candle harian: swing support-resist dan ATR.') + DISC, picks: picks, opts: budOpts(kind, 'idx', B) };
    }
    async function planGlobalScalp(B) {
        var d = await cjson('global-screener.json'); if (!d || !d.rows) return 'Data saham global belum bisa dimuat.';
        var sc = d.rows.filter(function (r) { return r[1] > (B ? 1 : 5) && (!B || r[1] <= B) && r[3] >= 1.5 && r[3] <= 25 && r[1] * (r[7] || 0) > 1e6; }).sort(function (a, b) { return b[1] * b[7] - a[1] * a[7]; }).slice(0, 5);
        if (!sc.length) return 'Belum ada saham global' + budTxt(B, '$') + ' yang lolos filter scalping (naik 1,5-25%). Coba budget lebih besar.';
        var out = ''; sc.forEach(function (r) { out += r[0] + ' (' + r[10] + ')  $' + px(r[1]) + ' (+' + nf(r[3], 1) + '%)\n  TP $' + nf(r[1] * 1.025, 2) + ' (+2,5%) · SL $' + nf(r[1] * 0.98, 2) + ' (-2%)\n'; });
        return { text: 'Scalping Saham Global' + budTxt(B, '$') + ' (naik 1,5-25%), data harian ' + sc[0][9] + ':\n' + out + DISC, opts: budOpts('scalp', 'global', B) };
    }
    async function planEngine(kind, k, B) {
        var E = await loadEngine(); if (!E) return 'Mesin rekomendasi belum bisa dimuat.';
        var mk = k === 'kripto' ? 'crypto' : k, tf = kind === 'swing' ? '4h' : kind === 'scalp' ? '5m' : '1h', tfl = { '4h': '4 jam', '5m': '5 menit', '1h': '1 jam' }[tf];
        var r = await E.forMarket(mk).run(tf, 'ketat'), n = kind === 'swing' ? 10 : 5, md = 'ketat';
        if (r.fail !== r.total && (B ? r.list.filter(function (x) { return x.price <= B; }) : r.list).length < 3) { var r2 = await E.forMarket(mk).run(tf, 'longgar'); if (r2.list.length > r.list.length) { r = r2; md = 'longgar'; } } // ketat sering kosong: pakai longgar dan bilang
        if (r.fail === r.total) return 'Data candle ' + MK[k][0] + ' belum tersedia (cek koneksi atau Worker).' + (E.lastErr && E.lastErr() ? ' Detail: ' + E.lastErr() + '.' : '');
        if (B) r.list = r.list.filter(function (x) { return x.price <= B; });
        if (!r.list.length) return 'Belum ada ' + MK[k][0] + budTxt(B, k === 'idx' ? 'Rp' : '$') + ' yang lolos saringan BoW di candle ' + tfl + '. Coba lagi nanti, budget lebih besar, atau pasar lain.';
        var pre = k === 'forex' ? '' : '$';
        var epk = r.list.slice(0, n).map(function (x) {
            var F = function (v) { return E.fmt(mk, v, x.t); }, rw = [['Area BoW', F(x.lo) + ' - ' + F(x.hi)]];
            if (kind === 'swing') { rw.push(['TP1', F(x.tp1), 'g']); rw.push(['TP Max', F(x.tp), 'g']); } else rw.push(['TP', F(x.tp), 'g']);
            rw.push(['CL', F(x.cl), 'r']);
            return { t: x.t, mk: k, price: x.price, priceTxt: 'Last ' + pre + F(x.price), chg: x.chg, rows: rw, note: 'R/R ±' + x.rr.toFixed(1) + ' · Level dari swing support/resist + ATR', bow: { lo: x.lo, hi: x.hi, tp: x.tp, cl: x.cl, rr: x.rr } };
        });
        return { text: KIND[kind] + ' ' + MK[k][0] + budTxt(B, '$') + ' · Buy on Weakness, candle ' + tfl + '.\nDihitung langsung dari candle saat ini: tren naik, dekat support, ada ruang ke resist.' + (md === 'longgar' ? ' Saringan longgar (yang ketat tidak meloloskan cukup saham).' : '') + DISC, picks: epk, opts: budOpts(kind, k, B) };
    }
    function parseBudget(tok) {
        var m = String(tok).toLowerCase().replace(/^(<=|<|≤|maks|max)/, '').replace(/^rp\.?\s*/, '').replace(/^\$/, '');
        var mm = m.match(/^(\d[\d.,]*)(k|rb|ribu)?$/); if (!mm) return null;
        var v = parseFloat(mm[1].replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.')); if (mm[2]) v *= 1000;
        return isFinite(v) && v > 0 ? v : null;
    }
    function budTxt(B, cur) { return B ? ' dengan harga ≤ ' + (cur === '$' ? '$' + nf(B, B < 10 ? 2 : 0) : 'Rp ' + nf(B, 0).replace(/,/g, '.')) : ''; }
    function budOpts(kind, mk, B) {
        var base = '/' + kind + ' ' + mk, o = [];
        if (mk === 'idx') { if (B !== 500) o.push(['Harga ≤ Rp500', base + ' 500']); if (B !== 1000) o.push(['Harga ≤ Rp1.000', base + ' 1000']); if (B !== 2000) o.push(['Harga ≤ Rp2.000', base + ' 2000']); if (B) o.push(['Semua harga', base]); }
        else if (mk === 'global' || mk === 'kripto') { if (B !== 10) o.push(['Harga ≤ $10', base + ' 10']); if (B !== 50) o.push(['Harga ≤ $50', base + ' 50']); if (B) o.push(['Semua harga', base]); }
        return o;
    }
    async function cmdPlan(kind, args) {
        args = [].concat(args || []); var mkk = '', B = null;
        args.forEach(function (a) { var m = mkey(a), b = parseBudget(a); if (m) mkk = m; else if (b) B = b; });
        var bs = B ? ' ' + B : '';
        if (!mkk) return kind === 'scalp' ? askMarket('/scalp', 'Scalping untuk pasar mana?' + (B ? ' (harga ≤ ' + nf(B, 0) + ')' : ''), ['idx', 'global', 'kripto', 'forex'], bs) : askMarket('/' + kind, KIND[kind] + ' untuk pasar mana?' + (B ? ' (harga ≤ ' + nf(B, 0) + ')' : ''), null, bs);
        if (mkk === 'idx') return planIdx(kind, B);
        if (mkk === 'global' && kind === 'scalp') return planGlobalScalp(B);
        return planEngine(kind, mkk, B);
    }
    /* ---- Intent dari bahasa biasa: "cari tau akumulasi saham brpt" -> langsung jalankan /akum BRPT (tanpa AI) ---- */
    var STOP = {}; ('ada apa ini itu yang dan atau dong deh sih nih lah bisa mau halo hai hi hello hallo helo makasih thanks thx oke ok okay sip siap mantap test tes cek cari tau tahu coba tolong gmn gimana bagaimana brp berapa harga saham koin kripto sama buat untuk dari pada lagi sudah udah belum bagus naik turun kok yuk ya pak bro tido gak ga nggak engga tidak akumulasi distribusi bandar bandarmologi asing fibo fibonacci analisa analisis prospek laporan keuangan nilai wajar valuasi golden cross sinyal lihat liat kasih kasi info tentang soal dengan kalo kalau kenapa karena jadi terus pake pakai hari besok minggu bulan banyak sedikit yg tdk bgt banget aja saja lalu juga masih ikut cuma hanya pasar forex global ihsg idx us pagi siang swing scalp rekomendasi saran per pbv eps fundamental layak retracement kurs price scalping smc emas gold aku kamu dia kita lu gue w mah dulu nanti sekarang terbaru terkini lagi yang gmn'.split(' ')).forEach(function (w) { STOP[w] = 1; });
    var KNOWN = null;
    async function knownMap() {
        if (KNOWN) return KNOWN; var m = {}, g = await cjson('global-screener.json'), f = await cjson('forex.json'), cr = await cjson('crypto.json'), id = await cjson('idx-screener.json');
        if (g && g.rows) g.rows.forEach(function (r) { m[r[0]] = 'global'; }); if (f && f.items) f.items.forEach(function (x) { m[x.k] = 'forex'; }); if (cr && cr.items) cr.items.forEach(function (x) { m[x.k] = 'kripto'; }); if (id && id.rows) id.rows.forEach(function (r) { m[r[0]] = 'idx'; });
        KNOWN = m; return m;
    }
    async function nlIntent(q) {
        var l = ' ' + q.toLowerCase().replace(/[?!.,;:()"]/g, ' ') + ' ';
        var toks = (l.match(/[a-z0-9]{2,8}/g) || []).filter(function (w) { return !STOP[w]; }), code = null, mk = null, K = await knownMap();
        for (var i = 0; i < toks.length; i++) { var U = toks[i].toUpperCase(); if (K[U]) { code = U; mk = K[U]; break; } if (/^(xau|xag)$/i.test(toks[i])) { code = toks[i].toUpperCase() + 'USD'; mk = 'forex'; break; } }
        var has = function (re) { return re.test(l); }, mkw = has(/ihsg|idx|indonesia/) ? 'idx' : has(/ global| us | amerika/) ? 'global' : has(/kripto|crypto|koin/) ? 'kripto' : has(/forex|fx| gold| emas/) ? 'forex' : '';
        if (has(/akumulasi|distribusi|bandar/)) return code ? { cmd: '/akum ' + code, code: code, mk: mk, intro: 'Oke, aku intip akumulasi/distribusi ' + code + ' dulu ya…' } : { cmd: '/topakum ' + mkw, intro: 'Siap, aku cari yang lagi diakumulasi…' };
        if (has(/fibo|retracement/) && code) return { cmd: '/fibo ' + code, code: code, mk: mk, intro: 'Oke, aku tarik Fibonacci ' + code + '…' };
        if (has(/laporan keuangan|nilai wajar|valuasi|fundamental| per | pbv | eps /) && code) return { cmd: '/lk ' + code, code: code, mk: mk, intro: 'Aku bukain laporan keuangan ' + code + ' ya…' };
        if (has(/golden cross/)) return { cmd: '/ea ' + mkw, intro: 'Aku scan Golden Cross dulu ya…' };
        if (has(/sinyal|smc|scalping/) && (mkw === 'kripto' || mkw === 'forex' || mk === 'kripto' || mk === 'forex')) return { cmd: '/global ' + (code && (mk === 'kripto' || mk === 'forex') ? code : mkw), intro: 'Aku cek radar sinyal SMC-nya…' };
        if (has(/harga|berapa| kurs|price/) && code) return { cmd: '/harga ' + code, code: code, mk: mk, intro: '' };
        if (code && (has(/analisa|analisis|prospek|gimana|bagaimana|gmn|bagus|layak|cek|cari tau|cari tahu|lihat|liat|info/) || toks.length <= 2)) return { cmd: 'cek', code: code, mk: mk, intro: 'Siap, aku cek ' + code + ' dari beberapa sisi (harga, bandar, Fibonacci)…' };
        return null;
    }
    async function cmdCek(code, mk) {
        var M = await loadCmds(), out = [await cmdHarga(code)], iscrypto = mk === 'kripto', isfx = mk === 'forex';
        if (M && !isfx) { var a = await M.run('akum', [code, '7H']); if (typeof a === 'string' && /^BANDAR/.test(a)) out.push(a.split('\n').slice(0, 6).join('\n')); }
        if (M) { var f = await M.run('fibo', [code]); if (typeof f === 'string' && /Golden Zone/.test(f)) { var gz = (f.match(/Area buy terbaik[^\n]*/) || [''])[0], zn = (f.match(/ZONA[^\n]*/) || [''])[0]; out.push('Fibonacci (3 bulan): ' + gz + '\n' + zn); } }
        var opts = []; if (!iscrypto && !isfx) { opts.push(['Analisa ' + code, '/analisa ' + code]); opts.push(['Laporan keuangan', '/lk ' + code]); } opts.push(['Fibo lengkap', '/fibo ' + code]); if (!isfx) opts.push(['Bandar 30H', '/akum ' + code + ' 30H']);
        return { text: out.join('\n\n') + DISC, opts: opts };
    }


    /* ---- Bahasa biasa -> command (tanpa AI): "tido, cari tau akumulasi saham brpt" -> /akum BRPT ---- */
    var NL_RE = /(komoditas|watchlist|pantauan|akumulasi|distribusi|bandar|aliran dana|fibo|retracement|analisa|analisis|laporan keuangan|keuangan|nilai wajar|valuasi|fundamental|golden cross|\bea\b|harga|price|berapa|sinyal|scalping|\bsmc\b|rekomendasi|rekomen|saran|pilihan|jagoan|swing|\bpagi\b|\bsiang\b|berita|rdpu|rdpt|\brds\b|\brdc\b|\brdi\b|reksa ?dana|pasar uang|apa itu|apa sih|artinya|maksud|pengertian|jelaskan|bedanya|return tertinggi|paling cuan|paling tinggi|top gainer|naik paling)/;
    var NL_ALIAS = { BITCOIN: 'BTC', ETHEREUM: 'ETH', EMAS: 'XAUUSD', GOLD: 'XAUUSD', PERAK: 'XAGUSD', SILVER: 'XAGUSD', DOGE: 'DOGE', DOGECOIN: 'DOGE', SOLANA: 'SOL', RIPPLE: 'XRP', DOLAR: 'USDIDR' };
    async function nlCode(q) {
        var words = q.replace(/[^A-Za-z0-9=.^ -]/g, ' ').split(/\s+/).filter(Boolean), i, w, W;
        var idr = await cjson('idx-screener.json'), idS = {}; if (idr && idr.rows) idr.rows.forEach(function (r) { idS[r[0]] = 1; });
        var cr = await cjson('crypto.json'), crS = {}; if (cr && cr.items) cr.items.forEach(function (x) { crS[x.k] = 1; });
        var fx = await cjson('forex.json'), fxS = {}; if (fx && fx.items) fx.items.forEach(function (x) { fxS[x.k] = 1; });
        for (i = 0; i < words.length; i++) { w = words[i]; W = w.toUpperCase(); if (NL_ALIAS[W]) { W = NL_ALIAS[W]; if (fxS[W]) return W; if (crS[W]) return W; } }
        for (i = 0; i < words.length; i++) { W = words[i].toUpperCase(); if (W.length >= 3 && idS[W] && !/^(YANG|DARI|ATAU|BISA|BANK|GOLD|SAHAM|UNTUK)$/.test(W)) return W; }
        for (i = 0; i < words.length; i++) { W = words[i].toUpperCase(); if (fxS[W] && W.length >= 5) return W; }
        for (i = 0; i < words.length; i++) { W = words[i].toUpperCase(); if (crS[W] && W.length >= 3 && !/^(ONE|SUN|NEAR|FUN|ALL)$/.test(W)) return W; }
        var gs = await cjson('global-screener.json'), gS = {}; if (gs && gs.rows) gs.rows.forEach(function (r) { gS[r[0]] = 1; });
        for (i = 0; i < words.length; i++) { w = words[i]; if (w === w.toUpperCase() && gS[w] && w.length >= 2) return w; }
        return '';
    }
    function nlMarket(l) { if (/\b(ihsg|idx|indonesia)\b/.test(l)) return 'idx'; if (/\b(global|amerika|us)\b/.test(l)) return 'global'; if (/\b(kripto|crypto|koin)\b/.test(l)) return 'kripto'; if (/\b(forex|fx)\b/.test(l)) return 'forex'; return ''; }
    async function nlRun(q) {
        var l = q.toLowerCase().replace(/^\s*tido\s*[,!:]?\s*/, ''), mk = nlMarket(l), code = await nlCode(q.replace(/^\s*tido\s*[,!:]?\s*/i, ''));
        var tfm = l.match(/\b(\d{1,2}\s?(?:m|j|h)|1h|4h)\b/), tf = tfm ? tfm[1].replace(/\s/g, '') : '', cmd = '', intro = '';
        var K = code || '';
        if (/(watchlist|pantauan|daftar pantau|watch list)/.test(l) && /(masukin|masukkan|masuk|tambah|simpan|pantau|add|catat|pindah)/.test(l)) {
            if (!lastPicks || !lastPicks.length) return { text: 'Belum ada rekomendasi yang bisa dimasukkan 😴 Minta dulu ya, nanti tinggal klik "+ Pantau" atau bilang "masukin ke watchlist".', opts: [['Rekomendasi IHSG', '/rekomendasi idx'], ['Swing IHSG', '/swing idx'], ['Rekomendasi Kripto', '/rekomendasi kripto']] };
            var want = {}; (q.toUpperCase().match(/[A-Z0-9]{2,8}/g) || []).forEach(function (w) { want[w] = 1; });
            var sel = lastPicks.filter(function (p) { return p.bow || p.simple; }), named = sel.filter(function (p) { return want[p.t]; }); if (named.length) sel = named;
            if (!sel.length) return 'Rekomendasi tadi belum punya level BoW yang bisa dipantau (mis. scalping).';
            var ok = [], dup = []; sel.forEach(function (p) { var r = p.simple ? simpleWatchAdd(p.simple) : bowWatchAdd(p); (r === 'ok' ? ok : dup).push(p.t); });
            return { text: (ok.length ? 'Beres, masuk Watchlist: ' + ok.join(', ') + ' ✅' + (sel.some(function (p) { return p.bow; }) ? ' (lengkap dengan area BoW, TP, CL; naik/turunnya kelihatan di Watchlist).' : '') : '') + (dup.length ? (ok.length ? '\n' : '') + 'Sudah ada: ' + dup.join(', ') + '.' : '') + '\n[Buka Watchlist](' + CBASE + 'watchlist.html)' };
        }
        if (/(komoditas|\bemas\b|\bperak\b|minyak|batu ?bara|tembaga|\bkopi\b|\bgula\b|jagung|gandum)/.test(l) && /(harga|berapa|komoditas|pantau|naik|turun|cek|lihat)/.test(l) && !/(saham|reksa)/.test(l)) { var kr = await cmdKomoditas(l.replace(/[^a-z ]/g, ' ').split(/\s+/).filter(function (w) { return KOM_ALIAS[w]; })); if (kr && kr.picks) return kr; }
        var RDT = /\b(rdpu|rdpt|rds|rdc|rdi)\b|reksa ?dana|pasar uang/.test(l), DEF = /(apa itu|apa sih|artinya|arti |maksud|pengertian|jelaskan|bedanya|beda )/.test(l);
        if (RDT) { var rr0 = await runCmd('/rd ' + l.replace(/[^a-z0-9 ]/g, ' ')); if (typeof rr0 === 'string') return 'Oke, aku buka database reksa dana ya 😴\n\n' + rr0; rr0.text = 'Oke, aku buka database reksa dana ya 😴\n\n' + rr0.text; return rr0; }
        if (/(return|cuan|naik|gain|untung)/.test(l) && /(tertinggi|paling|terbesar|teratas|\btop\b)/.test(l) && /(tahun|bulan|saham|ihsg)/.test(l) && !code && !DEF) {
            var ym1 = l.match(/(\d+|lima|tiga|satu) ?(tahun|thn)/), yv1 = ym1 ? ({ lima: 5, tiga: 3, satu: 1 }[ym1[1]] || parseInt(ym1[1], 10)) : 0, yy1 = yv1 >= 5 ? 5 : yv1 >= 3 ? 3 : yv1 >= 1 ? 1 : (/(bulan|minggu|52)/.test(l) ? 52 : 1); var rr1 = await runCmd('/topreturn ' + (mk || 'idx') + ' ' + yy1); var in1 = 'Sip, aku cek datanya dulu ya 😴';
            if (typeof rr1 === 'string') return in1 + '\n\n' + rr1; rr1.text = in1 + '\n\n' + rr1.text; return rr1;
        }
        if (DEF) { var MG = await loadCmds(); var gl = MG ? await MG.run('istilah', [l]) : null; if (gl) return gl; }
        if (/(akumulasi|distribusi|bandar|aliran dana)/.test(l)) {
            if (code) { cmd = '/akum ' + code + (tf ? ' ' + tf : ''); intro = 'Oke, aku intip bandar ' + code + ' dulu ya 😴'; }
            else if (/(top|teratas|paling|daftar|apa saja|saham apa)/.test(l)) { cmd = '/topakum ' + mk; intro = 'Sip, aku cari yang lagi diakumulasi ya.'; }
            else return null;
        } else if (/(fibo|retracement)/.test(l) && code) { cmd = '/fibo ' + code + (tf ? ' ' + tf : ''); intro = 'Aku tarik Fibonacci ' + code + ' ya.'; }
        else if (/(laporan keuangan|keuangan|nilai wajar|valuasi|fundamental)/.test(l) && code) { cmd = '/lk ' + code; intro = 'Aku buka laporan keuangan ' + code + ' dulu, bentar ya 😴'; }
        else if (/(analisa|analisis)/.test(l) && code) { cmd = '/analisa ' + code; intro = 'Oke, analisa ringkas ' + code + ':'; }
        else if (/(sinyal|scalping|\bsmc\b)/.test(l) && (code || mk === 'kripto' || mk === 'forex') && mk !== 'idx' && mk !== 'global') { cmd = '/global ' + (code || mk) + (tf ? ' ' + tf : ''); intro = 'Aku cek radar sinyalnya ya.'; }
        else if (/(golden cross|\bea\b)/.test(l)) { cmd = '/ea ' + mk; intro = 'Aku scan Golden Cross-nya ya.'; }
        else if (/(harga|price|berapa)/.test(l) && code) { cmd = '/harga ' + code; intro = ''; }
        else if (/(rekomendasi|rekomen|saran|pilihan|jagoan|swing|\bpagi\b|\bsiang\b|scalp)/.test(l) && (mk || /(swing|pagi|siang|scalp|rekomendasi)/.test(l)) && !code) {
            var kind = /swing/.test(l) ? 'swing' : /scalp/.test(l) ? 'scalp' : /pagi/.test(l) ? 'pagi' : /siang/.test(l) ? 'siang' : 'rekomendasi';
            var bm = l.match(/(?:di ?bawah|dibawah|kurang dari|maks(?:imal)?|max|budget|modal|<=?|≤)\s*(?:rp\.?|\$)?\s*(\d[\d.,]*)\s*(k|rb|ribu)?/), bud = '';
            if (bm && kind !== 'rekomendasi') { var bv = parseBudget(bm[1] + (bm[2] || '')); if (bv) bud = ' ' + bv; }
            cmd = '/' + kind + (mk ? ' ' + mk : '') + bud; intro = 'Siap, ini hasil screener-nya' + (bud ? ' untuk budget minim' : '') + ' (bukan ajakan beli/jual ya):';
        }
        else if (/berita/.test(l)) cmd = '/berita';
        else return null;
        var r = await runCmd(cmd); if (r == null) return null;
        if (typeof r === 'string') return (intro ? intro + '\n\n' : '') + r;
        r.text = (intro ? intro + '\n\n' : '') + r.text; return r;
    }
    async function runCmd(q) {
        var c = normCmd(q); if (c == null) return null;
        if (c.slice(0, 4) === '/nl ') return nlRun(c.slice(4));
        var p = c.split(/\s+/), n = p[0].toLowerCase();
        if (n === '/help' || n === '/menu' || n === '/start') return HELP;
        if (n === '/harga' || n === '/price') return cmdHarga(p[1]);
        if (n === '/cek') { var ck = String(p[1] || '').toUpperCase(); if (!ck) return 'Format: /cek <kode>. Contoh: /cek BBCA, /cek BTC, /cek EURUSD. Aku cek harga, bandar, dan Fibonacci sekaligus.'; var KK = await knownMap(); return cmdCek(ck, KK[ck] || ''); }
        if (n === '/rekomendasi' || n === '/rekomen' || n === '/bow' || n === '/picks') return cmdRek(p[1]);
        if (n === '/pagi' || n === '/siang' || n === '/swing' || n === '/scalp') return cmdPlan(n.slice(1), p.slice(1));
        if (n === '/scalpus') return cmdPlan('scalp', ['global'].concat(p.slice(1)));
        if (HEAVY[n.slice(1)]) { var M = await loadCmds(); if (!M) return 'Modul command belum bisa dimuat. Coba lagi.'; var hr = await M.run(n.slice(1), p.slice(1)); return hr == null ? 'Command belum tersedia.' : hr; }
        if (n === '/berita' || n === '/news') return cmdBerita();
        if (n === '/komoditas' || n === '/kom') return cmdKomoditas(p.slice(1));
        return 'Command "' + p[0] + '" belum ada di chat web. Ketik /help. (Command lengkap dengan gambar ada di bot WhatsApp.)';
    }
    function rich(b, t) {
        b._raw = t; b.textContent = '';
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
            '.ec-prow{display:flex;gap:4px;align-items:flex-start;align-self:stretch}.ec-prow .ec-b{flex:1;min-width:0;max-width:none}.ec-prof{position:sticky;top:2px;flex:0 0 92px;width:92px;height:106px}.ec-b{max-width:88%;padding:8px 10px;border-radius:10px;white-space:pre-wrap;line-height:1.45;word-break:break-word}.ec-u{align-self:flex-end;background:#10b981;color:#04130d}.ec-a{align-self:flex-start;background:#1e293b}' +
            '.ec-f{display:flex;gap:6px;padding:8px;border-top:1px solid #334155}.ec-box .ec-f input{flex:1;background:#1e293b!important;border:1px solid #334155!important;border-radius:8px;padding:8px;color:#e2e8f0!important;font-size:13px;min-width:0}' +
            '.ec-f button{background:#10b981;border:0;border-radius:8px;color:#04130d;padding:0 12px;font-weight:600;cursor:pointer}.ec-f button:disabled{opacity:.5}' +
            '.ec-n{font-size:10px;color:#64748b;padding:0 10px 6px}@media(min-width:768px){.ec-fab{bottom:84px}.ec-box{bottom:96px}}@media(min-width:1500px){.ec-fab{top:-4px;bottom:auto;right:10px;width:110px;height:104px}.ec-box{top:150px;bottom:auto;right:16px;height:min(520px,calc(100vh - 160px))}}';
        document.head.appendChild(st);
        var fab = el('button', 'ec-fab hk sc-fly', '💬'); fab.setAttribute('aria-label', 'Tanya Tido, asisten Ewoks'); var tip = el('span', 'ec-tip');
        var box = el('div', 'ec-box');
        var h = el('div', 'ec-h'); var ht = el('div', 'ec-ht'); ht.innerHTML = '<span><b>Tido</b><small>asisten Ewoks, ngantuk tapi paham</small></span>'; h.appendChild(ht);
        var peek = el('div', 'ec-peek pk'); box.appendChild(peek);
        var clr = el('button', '', '🗑'); clr.setAttribute('aria-label', 'Hapus semua chat'); clr.title = 'Hapus semua chat'; h.appendChild(clr);
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
        function profOn(txt) {
            if (!M || !M.prof) return; var bs = m.querySelectorAll('.ec-b.ec-a'), b = bs[bs.length - 1]; if (!b || b.parentNode.classList.contains('ec-prow')) return;
            m.querySelectorAll('.ec-prow').forEach(function (r) { var bb = r.querySelector('.ec-b'); if (bb) r.parentNode.insertBefore(bb, r); r.remove(); });
            var row = el('div', 'ec-prow'), pf = el('div', 'ec-prof kp-in is-talk'); pf.innerHTML = M.prof + '<span class="kp-puff"></span>';
            b.parentNode.insertBefore(row, b); row.appendChild(pf); row.appendChild(b);
            setTimeout(function () { pf.classList.remove('is-talk'); }, Math.max(2200, Math.min(7000, String(txt || '').length * 32)));
        }
        function talk(txt) { hoo('talk', Math.max(1400, Math.min(5000, String(txt || '').length * 26))); profOn(txt); }
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
        /* ---- Tido petakilan: sesekali keluar dari tombol chat dan bertingkah di seluruh halaman (acak) ---- */
        var roamer = null, roamAnim = null, roamT = null, roamRaf = 0, lastAct = '', RW = 120, RH = 112, lastM = { x: 0, y: 0, t: 0 };
        document.addEventListener('mousemove', function (e) { lastM.x = e.clientX; lastM.y = e.clientY; lastM.t = Date.now(); }, { passive: true });
        var ROAMCSS = '.ec-roam{position:fixed;left:0;top:0;width:' + RW + 'px;height:' + RH + 'px;z-index:55;pointer-events:none;will-change:transform}.ec-roam .in2{width:100%;height:100%;pointer-events:auto;cursor:pointer}.ec-roam.chase .in2{pointer-events:none}.ec-roam.run .k-legs{animation-duration:.22s}' +
            '.ec-roam-t{position:absolute;left:50%;top:-14px;transform:translateX(-50%);background:#fff;color:#0f172a;font:600 12px/1.2 system-ui,sans-serif;padding:3px 8px;border-radius:9px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none;transition:opacity .4s}' +
            '.ec-rope{position:absolute;width:2px;background:#94a3b8;left:' + (RW / 2 - 1) + 'px;top:0}.ec-hang{position:absolute;top:0;left:0;transform-origin:' + (RW / 2) + 'px 0}';
        var SAY = {
            fly: ['wiii~ 😴', 'terbaaang~', 'hoaam sambil terbang'], run: ['hup hup hup!', 'kejar akuu!', 'lari pagi~'], car: ['brrm brrm!', 'minggir dong~', 'nguuung!'], hang: ['ayun~ ayun~', 'jangan dilepas ya', 'wuuu~'],
            spin: ['muter muter~', 'pusing… tapi seru', 'wuuush!'], bounce: ['boing boing!', 'mantul~', 'duk duk duk'], peek: ['psst…', 'kamu liat aku?', 'cilukba!'], drop: ['zzz…', 'bruk! zzz…', 'zzz… 5 menit lagi'],
            zigzag: ['zig-zag!', 'ngebut ala kurir', 'wush wush!'], chase: ['tunggu aku!', 'ikut dong~', 'itu kursornya!']
        };
        function roamEnd() {
            clearTimeout(roamT); cancelAnimationFrame(roamRaf); roamRaf = 0; if (roamAnim) { try { roamAnim.cancel(); } catch (e) { } roamAnim = null; }
            if (roamer) { roamer.remove(); roamer = null; fab.style.visibility = ''; if (!box.classList.contains('open')) enter(); }
        }
        function roamNext() {
            clearTimeout(roamT);
            roamT = setTimeout(function () { if (!box.classList.contains('open') && !document.hidden && !roamer && M) roamGo(); roamNext(); }, 18000 + Math.random() * 27000);
        }
        function roamGo(act) {
            var rm = false; try { rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
            if (rm || roamer || !M) return;
            var vw = window.innerWidth, vh = window.innerHeight, rnd = Math.random, canChase = Date.now() - lastM.t < 30000 && !('ontouchstart' in window && !lastM.t);
            var acts = ['fly', 'run', 'car', 'hang', 'spin', 'bounce', 'peek', 'drop', 'zigzag'].concat(canChase ? ['chase', 'chase'] : []).filter(function (a) { return a !== lastAct; });
            act = act || acts[Math.floor(rnd() * acts.length)]; lastAct = act;
            var left = rnd() < .5, scn = { car: 'car', hang: 'sit', peek: 'sit', drop: 'sleep' }[act] || 'fly', words = SAY[act], say = words[Math.floor(rnd() * words.length)];
            roamer = el('div', 'ec-roam sc-' + scn + (act === 'run' || act === 'zigzag' ? ' run' : '') + (act === 'chase' ? ' chase' : '')); var inn = el('div', 'in2'); inn.innerHTML = M.fab; var bub = el('span', 'ec-roam-t', say); roamer.appendChild(inn);
            roamer.onclick = function () { roamEnd(); fab.onclick(); };
            document.body.appendChild(roamer); fab.style.visibility = 'hidden';
            var kf = [], i, n, dur = 7000, x0 = -RW - 20, x1 = vw + 20, gy = vh - RH - 6, host = roamer;
            function T(x, y, r) { return 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)' + (r ? ' rotate(' + r + 'deg)' : ''); }
            function say2(txt, ms) { setTimeout(function () { if (roamer) { bub.textContent = txt; bub.style.opacity = '1'; } }, ms); }
            roamer.appendChild(bub); setTimeout(function () { bub.style.opacity = '0'; }, 2400);
            if (act === 'hang') {
                var L = Math.max(90, Math.min(190, vh * .2)), px = 20 + rnd() * Math.max(10, vw - RW - 40), hang = el('div', 'ec-hang'), rope = el('div', 'ec-rope'); rope.style.height = L + 'px';
                hang.style.width = RW + 'px'; hang.style.height = (L + RH) + 'px'; inn.style.position = 'absolute'; inn.style.top = L + 'px'; inn.style.width = RW + 'px'; inn.style.height = RH + 'px';
                hang.appendChild(rope); hang.appendChild(inn); roamer.appendChild(hang); roamer.style.height = '0'; roamer.style.left = px + 'px'; hang.appendChild(bub); bub.style.top = (L - 16) + 'px';
                var up = -(L + RH + 12), ang = [0, 11, -11, 9, -9, 6, -5, 0];
                kf.push({ transform: 'translateY(' + up + 'px) rotate(0deg)', offset: 0 }); kf.push({ transform: 'translateY(0) rotate(0deg)', offset: .12, easing: 'ease-out' });
                ang.forEach(function (a, j) { kf.push({ transform: 'translateY(0) rotate(' + a + 'deg)', offset: .12 + (j + 1) * .095, easing: 'ease-in-out' }); });
                kf.push({ transform: 'translateY(' + up + 'px) rotate(0deg)', offset: 1, easing: 'ease-in' }); dur = 7000; host = hang;
            } else if (act === 'chase') {
                var cx = left ? x0 : x1, cy = vh * (.3 + rnd() * .4), t0 = Date.now(), fl = false;
                (function step() {
                    if (!roamer) return; var el2 = Date.now() - t0, out = el2 > 8500, tx = out ? (cx < vw / 2 ? -RW - 60 : vw + 60) : lastM.x - RW - 18, ty = out ? cy - 60 : lastM.y - RH / 2;
                    cx += (tx - cx) * (out ? .05 : .07); cy += (ty - cy) * .07; var nfl = tx < cx; if (nfl !== fl) { fl = nfl; inn.style.transform = fl ? 'scaleX(-1)' : ''; }
                    roamer.style.transform = T(cx, cy + Math.sin(el2 / 180) * 5);
                    if (out && (cx < -RW - 30 || cx > vw + 30)) { roamEnd(); return; } roamRaf = requestAnimationFrame(step);
                })(); dur = 0;
            } else if (act === 'spin') {
                n = 24; dur = 7500; var rx = vw * .34, ry = Math.max(60, vh * .26), laps = 1.4, ph = rnd() * 6.28, dir = left ? -1 : 1;
                for (i = 0; i <= n; i++) { var f = i / n, a = ph + dir * f * laps * 6.283; kf.push({ transform: T(vw / 2 - RW / 2 + Math.cos(a) * rx * (1 - .15 * f), vh / 2 - RH / 2 + Math.sin(a) * ry, f * 720 * dir), offset: f }); }
                kf[0].transform = T(x0, kf[0].transform.match(/,(-?\d+)px/)[1] * 1, 0);
            } else if (act === 'bounce') {
                var bx = rnd() * (vw - RW), by = rnd() * (vh - RH), dx = left ? -1 : 1, dy = rnd() < .5 ? -1 : 1, sl = .55 + rnd() * .6, tot = 0, pts = [[bx, by, 0]], hits = 0, mx = vw - RW, my = vh - RH, cuts = [0];
                while (hits < 9) { var tX = dx > 0 ? (mx - bx) : bx, tY = dy > 0 ? (my - by) / sl : by / sl, tt = Math.max(1, Math.min(tX, tY)); bx += dx * tt; by += dy * tt * sl; if (tt === tX) dx = -dx; else dy = -dy; tot += tt * Math.sqrt(1 + sl * sl); pts.push([bx, by, hits % 2 ? 10 : -10]); cuts.push(tot); hits++; }
                dur = Math.min(10000, Math.max(5500, tot * 2.2)); pts.forEach(function (p, j) { kf.push({ transform: T(p[0], p[1], p[2]), offset: cuts[j] / tot }); });
                kf.push({ transform: T(pts[pts.length - 1][0] + (dx > 0 ? vw : -vw), pts[pts.length - 1][1] - 80, 0), offset: 1 }); kf.forEach(function (k, j) { if (j === kf.length - 1) k.offset = 1; }); kf[kf.length - 1].offset = 1; kf[kf.length - 2].offset = Math.min(.92, kf[kf.length - 2].offset); dur += 800;
            } else if (act === 'peek') {
                var py = 110 + rnd() * Math.max(10, vh - RH - 240), sx = left ? -RW : vw, ox = left ? -RW * .38 : vw - RW * .62; if (!left) inn.style.transform = 'scaleX(-1)'; dur = 6500;
                [[0, sx, py], [.14, ox, py], [.28, ox, py - 10], [.42, ox, py + 4], [.55, ox, py], [.7, sx + (left ? -10 : 10), py], [.74, ox, py], [.9, ox, py], [1, sx, py]].forEach(function (p) { kf.push({ transform: T(p[1], p[2]), offset: p[0], easing: 'ease-in-out' }); });
                say2('…hilang~', 4300);
            } else if (act === 'drop') {
                var dx0 = 40 + rnd() * Math.max(10, vw - RW - 80); dur = 10000;
                [[0, dx0, -RH - 20, 0, 'ease-in'], [.14, dx0, gy, 0, 'ease-out'], [.2, dx0, gy - 38, -4, 'ease-in'], [.26, dx0, gy, 0, 'linear'], [.68, dx0, gy, 0, 'linear'], [.72, dx0, gy - 50, -10, 'ease-out'], [.78, dx0, gy, 0, 'linear'], [1, left ? x0 : x1, gy, 0, 'ease-in']].forEach(function (p) { kf.push({ transform: T(p[1], p[2], p[3]), offset: p[0], easing: p[4] }); });
                if (left) inn.style.transform = 'scaleX(-1)'; say2('!? aku ketiduran', 6600); setTimeout(function () { if (roamer) { roamer.classList.remove('sc-sleep'); roamer.classList.add('sc-fly', 'run'); bub.textContent = 'telat telat!'; bub.style.opacity = '1'; setTimeout(function () { bub.style.opacity = '0'; }, 1500); } }, 7200);
            } else if (act === 'zigzag') {
                n = 10; dur = Math.max(4200, Math.min(6500, vw * 4.5));
                for (i = 0; i <= n; i++) { var f2 = i / n; kf.push({ transform: T(x0 + (x1 - x0) * (left ? 1 - f2 : f2), i % 2 ? vh * (.2 + rnd() * .12) : vh * (.6 + rnd() * .12)), offset: f2, easing: 'ease-in-out' }); }
                if (left) inn.style.transform = 'scaleX(-1)';
            } else {
                n = 14; dur = Math.max(6000, Math.min(11000, vw * 8)); if (act === 'run') dur = Math.max(3800, Math.min(6500, vw * 5));
                var y0 = act === 'fly' ? 70 + rnd() * Math.max(10, vh - RH - 260) : gy;
                for (i = 0; i <= n; i++) {
                    var f3 = i / n, yy = y0;
                    if (act === 'fly') yy = y0 + Math.sin(f3 * Math.PI * 3) * 42 - Math.sin(f3 * Math.PI) * 18; else if (act === 'run') yy = y0 - (i % 2 ? 26 : 0); else yy = y0 - (i % 2 ? 3 : 0);
                    kf.push({ transform: T(x0 + (x1 - x0) * (left ? 1 - f3 : f3), yy), offset: f3, easing: act === 'run' ? 'ease-out' : 'linear' });
                }
                if (left) inn.style.transform = 'scaleX(-1)';
            }
            if (dur) { roamAnim = host.animate(kf, { duration: dur, fill: 'forwards' }); roamAnim.onfinish = roamEnd; }
        }
        window.EwoksTidoRoam = roamGo;
        loadMascot().then(function (MM) {
            if (!MM) return; M = MM; var st2 = document.createElement('style'); st2.textContent = M.css + ROAMCSS; document.head.appendChild(st2);
            fab.innerHTML = M.fab; fab.appendChild(tip); peek.innerHTML = M.peek; enter(); idle(); roamT = setTimeout(function () { if (!box.classList.contains('open') && !document.hidden) roamGo(); roamNext(); }, 9000 + Math.random() * 8000);
            try { if (!sessionStorage.getItem('ewoks_hoo_tip')) { sessionStorage.setItem('ewoks_hoo_tip', '1'); setTimeout(function () { if (!box.classList.contains('open')) showTip('Hoaam… eh, halo! Aku Tido. Tanya apa aja soal investasi ya 😴'); }, 2800); } } catch (_) {}
        });
        var TIPS = ['Hoaam… ada apa?', 'Eh, kamu manggil aku? 😴', 'Mau tanya soal saham? Sini!', 'Ketik /help buat lihat command~'];
        fab.addEventListener('mouseenter', function () { if (!M || box.classList.contains('open')) return; setScene('sit'); hoo('hi', 1600); showTip(TIPS[Math.floor(Math.random() * TIPS.length)], 3000); });
        var rq = 0; document.addEventListener('mousemove', function (e) { if (rq) return; rq = requestAnimationFrame(function () { rq = 0; var tg = box.classList.contains('open') ? peek : fab, r = tg.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), k = function (v) { return Math.max(-1, Math.min(1, v / 180)) * 3.6; }; [fab, peek].forEach(function (z) { z.style.setProperty('--hx', k(dx) + 'px'); z.style.setProperty('--hy', k(dy) * 0.6 + 'px'); }); }); }, { passive: true });
        function add(role, t) { var b = el('div', 'ec-b ' + (role === 'u' ? 'ec-u' : 'ec-a'), t); m.appendChild(b); m.scrollTop = m.scrollHeight; return b; }
        var GREET = 'Hoaam… halo, aku Tido 😴 asisten Ewoks (ngantuk tapi paham). Tanya santai aja soal saham, kripto, forex, manajemen risiko, atau cara pakai web ini. Ketik /help buat lihat command (/harga, /rekomendasi, /pagi, /swing, /fibo, dll). Aku bantu belajar ya, bukan kasih sinyal beli/jual pasti.';
        /* Riwayat chat tahan refresh (localStorage), otomatis dihapus setelah 24 jam; tombol 🗑 untuk hapus manual. */
        var LKEY = 'ewoks_chat_log', DAY = 86400000;
        function logGet() { try { var o = JSON.parse(localStorage.getItem(LKEY) || 'null'); if (o && o.items && o.items.length && Date.now() - o.t0 < DAY) return o; localStorage.removeItem(LKEY); } catch (_) {} return null; }
        function optsBar(b, opts) { var bar = el('div'); bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px'; opts.forEach(function (o) { var bt = el('button', '', o[0]); bt.type = 'button'; bt.style.cssText = 'padding:5px 10px;border-radius:999px;border:1px solid #10b981;background:transparent;color:#34d399;font-size:12px;font-weight:700;cursor:pointer'; bt.onclick = function () { inp.value = o[1]; f.dispatchEvent(new Event('submit', { cancelable: true })); }; bar.appendChild(bt); }); b.appendChild(bar); b._op = opts; }
        function snap() {
            try {
                var items = [], hasU = false;
                Array.prototype.forEach.call(m.querySelectorAll('.ec-b'), function (b) {
                    var tx = b._raw || b.textContent; if (/^Tido lagi ngitung/.test(tx)) return;
                    var u = b.classList.contains('ec-u'); if (u) hasU = true; items.push({ r: u ? 'u' : 'a', t: tx, pk: b._pk || null, op: b._op || null });
                });
                if (!hasU) return;
                items = items.slice(-40).map(function (it, i, a) { if (i < a.length - 12) { it.pk = null; it.op = null; } return it; });
                var old = null; try { old = JSON.parse(localStorage.getItem(LKEY) || 'null'); } catch (_) {}
                var t0 = old && old.t0 && Date.now() - old.t0 < DAY ? old.t0 : Date.now();
                localStorage.setItem(LKEY, JSON.stringify({ t0: t0, items: items }));
            } catch (e) { console.warn('chat snap gagal', e); }
        }
        var snapT = 0; try { new MutationObserver(function () { if (!snapT) snapT = setTimeout(function () { snapT = 0; snap(); }, 600); }).observe(m, { childList: true, subtree: true, characterData: true }); } catch (_) {}
        function greetIn() { add('a', GREET); }
        function chatReset() { try { localStorage.removeItem(LKEY); } catch (_) {} hist = []; save(); m.innerHTML = ''; lastPicks = null; greetIn(); }
        clr.onclick = function () { if (confirm('Hapus seluruh chat dengan Tido?')) chatReset(); };
        var saved = logGet();
        if (saved) { saved.items.forEach(function (it) { var b = add(it.r, it.t); if (it.r === 'a') rich(b, it.t); if (it.pk) picksUI(b, it.pk); if (it.op) optsBar(b, it.op); }); }
        else { if (!hist.length) greetIn(); hist.forEach(function (i) { add(i.r, i.t); }); }
        fab.onclick = function () { try { var lo = JSON.parse(localStorage.getItem(LKEY) || 'null'); if (lo && Date.now() - lo.t0 >= DAY) chatReset(); } catch (_) {} tip.classList.remove('on'); box.classList.add('open'); fab.style.display = 'none'; hoo('hi', 2200); inp.focus(); m.scrollTop = m.scrollHeight; };
        x.onclick = function () { box.classList.remove('open'); fab.style.display = ''; if (M) enter(); };
        f.onsubmit = async function (e) {
            e.preventDefault(); var q = inp.value.trim(); if (!q || busy) return;
            var api = (typeof getEwoksLiveApi === 'function') ? getEwoksLiveApi() : '';
            inp.value = ''; add('u', q);
            if (normCmd(q) != null) {
                var fall = false, cw = add('a', 'Tido lagi ngitung sambil ngucek mata…'); busy = true; sb.disabled = true; hoo('think');
                try {
                    var cr = await runCmd(q); if (cr == null) { fall = true; cw.remove(); } else { var ct = typeof cr === 'string' ? cr : cr.text; rich(cw, ct); if (cr && cr.picks) picksUI(cw, cr.picks);
                    if (cr && cr.opts) { cw._op = cr.opts; var bar = el('div'); bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px'; cr.opts.forEach(function (o) { var bt = el('button', '', o[0]); bt.type = 'button'; bt.style.cssText = 'padding:5px 10px;border-radius:999px;border:1px solid #10b981;background:transparent;color:#34d399;font-size:12px;font-weight:700;cursor:pointer'; bt.onclick = function () { inp.value = o[1]; f.dispatchEvent(new Event('submit', { cancelable: true })); }; bar.appendChild(bt); }); cw.appendChild(bar); }
                } } catch (_) { cw.textContent = 'Command gagal dijalankan. Coba lagi.'; }
                busy = false; sb.disabled = false;
                if (!fall) { talk(cw.textContent); m.scrollTop = m.scrollHeight; return; }
            }
            var ni = null; try { ni = await nlIntent(q); } catch (_) {}
            if (ni) {
                var nw = add('a', ni.intro || 'Tido lagi cek…'); busy = true; sb.disabled = true; hoo('think');
                try {
                    var nr = ni.cmd === 'cek' ? await cmdCek(ni.code, ni.mk) : await runCmd(ni.cmd), nt = typeof nr === 'string' ? nr : nr.text; rich(nw, (ni.intro ? ni.intro + '\n\n' : '') + nt); if (nr && nr.picks) picksUI(nw, nr.picks);
                    if (nr && nr.opts) { nw._op = nr.opts; var nb = el('div'); nb.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px'; nr.opts.forEach(function (o) { var bt = el('button', '', o[0]); bt.type = 'button'; bt.style.cssText = 'padding:5px 10px;border-radius:999px;border:1px solid #10b981;background:transparent;color:#34d399;font-size:12px;font-weight:700;cursor:pointer'; bt.onclick = function () { inp.value = o[1]; f.dispatchEvent(new Event('submit', { cancelable: true })); }; nb.appendChild(bt); }); nw.appendChild(nb); }
                } catch (_) { nw.textContent = 'Gagal ngecek datanya. Coba lagi ya.'; }
                talk(nw.textContent); busy = false; sb.disabled = false; m.scrollTop = m.scrollHeight; return;
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
