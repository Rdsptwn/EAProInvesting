/** Versi aset — naikkan setelah deploy agar GitHub Pages tidak pakai cache JS/CSS lama. */
window.EWOKS_ASSET_V = '20261108t1341';

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
let history = readStoredArray('calc_history');
let journal = readStoredArray('ewoks_journal');
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
    a.download = `Ewoks_Backup_${new Date().toISOString().split('T')[0]}.json`;
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
            if(Array.isArray(data.journal)) localStorage.setItem('ewoks_journal', JSON.stringify(data.journal));
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
        'pasar-global': 'pasar-global.html'
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
    const full = !liveAt && window.__ewoksLiveErr ? `${text} · live gagal (${window.__ewoksLiveErr})` : text;
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

            const itemsToShow = filteredItems.length > 0 ? filteredItems.slice(0, 5) : data.items.slice(0, 5);

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
        window.__ewoksLiveErr = /Failed to fetch|NetworkError|Load failed/i.test(m) ? 'diblokir CORS/jaringan: cek ALLOWED_ORIGINS di Worker' : m;
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
    if (!infEl && !sbnEl) return;
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
        if (sbnEl && Number.isFinite(m?.sbn10y?.value)) {
            sbnEl.innerText = `${m.sbn10y.value.toFixed(2)}%`;
            sbnEl.title = `Yield SBN 10 tahun per ${fmtDate(m.sbn10y.asOf)}`;
            if (typeof calcSbn === 'function') calcSbn();
        }
    } catch (e) {
        console.warn('macro.json', e);
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
    const asing = ['AK', 'BK', 'CS', 'RX', 'KZ', 'CG', 'YU'];
    const ritel = ['YP', 'PD', 'CC', 'NI', 'XC'];
    if (asing.includes(kode)) return '<span class="bg-indigo-100 text-indigo-700 text-[9px] px-2 py-1 rounded font-bold ml-2">Asing/Institusi</span>';
    if (ritel.includes(kode)) return '<span class="bg-rose-100 text-rose-700 text-[9px] px-2 py-1 rounded font-bold ml-2">Dominan Ritel</span>';
    return '<span class="bg-slate-100 text-slate-500 text-[9px] px-2 py-1 rounded font-bold ml-2">Standar Lokal</span>';
}



// --- UTILITIES & SYSTEM ---
function formatAbbreviated(num) {
    const n = Number(num) || 0;
    if (n >= 1000000000) return (n / 1000000000).toFixed(2) + ' Miliar';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + ' Juta';
    if (n >= 1000) return (n / 1000).toFixed(1) + ' Ribu';
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

    const today = new Date().toISOString().split('T')[0];
    const tgl = document.getElementById('tanggal');
    const jr = document.getElementById('jr-date');
    if (tgl) tgl.value = today;
    if (jr) jr.value = today;

    updateClock();
    fetchRealIHSG();
    loadMacroIndicators();
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
    const LBL = { SUSPEN: 'SUSPEN', DELIST: 'DELISTING', PPK: 'PEMANTAUAN KHUSUS', RI: 'RI', DIV: 'DIVIDEN', SPLIT: 'SPLIT', UMA: 'UMA', AKSI: 'AKSI KORPORASI', IDLE: 'TAK ADA TRANSAKSI', GOCAP: 'GOCAP' };
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
