/** Pasar Global — ETF dunia (per tier MSCI), reksa dana, dan SBN dalam satu database. */
let pgData = null;
let pgFiltered = [];
let pgSelectedId = null;
let pgCagrChart = null;
let pgClassChart = null;
const pgState = { cls: 'ALL', sortCol: 'cagr', sortDir: 'desc' };

const PG_CLASS_ORDER = [
    'ETF',
    'Reksa Dana Saham',
    'Reksa Dana Pendapatan Tetap',
    'Pasar Uang',
    'Obligasi Negara / SBN',
    'Deposito',
    'Reksa Dana Campuran',
    'Reksa Dana Indeks'
];
const PG_RISK_ORDER = ['Sangat Rendah', 'Rendah', 'Moderat', 'Moderat-Tinggi', 'Tinggi', 'Sangat Tinggi', 'Ekstrem', 'Krisis / Distressed'];
const PG_TIER_ORDER = ['Developed', 'Emerging', 'Advanced Frontier', 'Frontier', 'Standalone'];

const PG_CLASS_INFO = {
    ETF: {
        icon: 'fa-chart-line',
        color: 'text-blue-500',
        what: 'Exchange Traded Fund: keranjang saham atau obligasi yang diperdagangkan di bursa seperti saham, biasanya melacak sebuah indeks.',
        for: 'Mau diversifikasi cepat ke satu negara, sektor, atau seluruh dunia dengan biaya rendah.',
        risk: 'Naik-turun mengikuti pasar acuannya. ETF luar negeri juga kena risiko kurs, pajak dividen asing, dan harus dibeli lewat broker yang mendukung bursa tersebut.',
        tip: 'Bandingkan expense ratio dan ukuran dana (AUM). Dana yang terlalu kecil berisiko sepi peminat dan bisa ditutup.'
    },
    'Reksa Dana Saham': {
        icon: 'fa-arrow-trend-up',
        color: 'text-emerald-500',
        what: 'Reksa dana yang minimal 80% portofolionya di saham, dikelola manajer investasi dan dihitung nilainya (NAV) tiap hari.',
        for: 'Tujuan jangka panjang (di atas 5 tahun) dan siap menerima fluktuasi besar.',
        risk: 'Tinggi: nilai bisa turun tajam saat pasar jatuh. Ada biaya pengelolaan dan kadang biaya jual-beli.',
        tip: 'Cek rekam jejak lebih dari satu siklus pasar, bukan hanya return setahun terakhir.'
    },
    'Reksa Dana Pendapatan Tetap': {
        icon: 'fa-coins',
        color: 'text-amber-500',
        what: 'Reksa dana yang minimal 80% portofolionya di obligasi dan instrumen utang.',
        for: 'Tujuan menengah (3 tahun ke atas) dengan fluktuasi lebih kecil dari saham.',
        risk: 'Moderat: harga obligasi turun saat suku bunga naik, dan ada risiko gagal bayar penerbit.',
        tip: 'Lihat durasi dan kualitas obligasi di dalamnya. Durasi panjang lebih sensitif terhadap suku bunga.'
    },
    'Pasar Uang': {
        icon: 'fa-vault',
        color: 'text-cyan-500',
        what: 'Reksa dana atau instrumen kas yang ditempatkan di deposito dan surat utang berjangka pendek (di bawah 1 tahun).',
        for: 'Dana darurat atau dana yang akan terpakai dalam waktu dekat.',
        risk: 'Rendah, tetapi bukan deposito dan tidak dijamin LPS. Return mengikuti suku bunga jangka pendek.',
        tip: 'Pilih untuk parkir dana. Return biasanya hanya mengejar inflasi, bukan tumbuh jauh di atasnya.'
    },
    Deposito: {
        icon: 'fa-piggy-bank',
        color: 'text-orange-500',
        what: 'Simpanan berjangka di bank (termasuk bank digital seperti SeaBank, Krom, Jago, Allo, Superbank) dengan bunga tetap selama tenor.',
        for: 'Dana jangka pendek sampai menengah yang butuh kepastian nilai dan bunga.',
        risk: 'Sangat rendah, tetapi penjaminan LPS hanya berlaku jika bunga tidak melebihi batas LPS (3,75% p.a. per 1 Okt 2026–31 Jan 2027) dan simpanan maks. Rp2 miliar. Bunga di atas batas itu tidak dijamin. Bunga kena pajak 20%.',
        tip: 'Bunga tinggi di bank digital biasanya berlaku untuk tenor tertentu atau saldo tertentu; cek tarif di aplikasi dan sebar dana agar tiap bank di bawah Rp2 miliar.'
    },
    'Reksa Dana Campuran': {
        icon: 'fa-scale-balanced',
        color: 'text-violet-500',
        what: 'Reksa dana yang mencampur saham, obligasi, dan pasar uang dengan porsi fleksibel menurut manajer investasi.',
        for: 'Tujuan menengah–panjang dengan risiko di antara saham dan pendapatan tetap.',
        risk: 'Moderat–tinggi: nilainya ikut turun saat saham jatuh, dan hasilnya sangat bergantung pada keputusan manajer.',
        tip: 'Return 1 tahun yang sangat tinggi biasanya mengikuti reli saham; periksa juga kinerjanya saat pasar turun.'
    },
    'Reksa Dana Indeks': {
        icon: 'fa-chart-simple',
        color: 'text-sky-500',
        what: 'Reksa dana pasif yang meniru sebuah indeks (mis. SRI-KEHATI, IDX Growth30, MSCI Indonesia Value) dengan biaya relatif rendah.',
        for: 'Investasi jangka panjang tanpa mengandalkan pemilihan saham oleh manajer.',
        risk: 'Tinggi: bergerak mengikuti indeks acuannya, naik maupun turun.',
        tip: 'Bandingkan selisih kinerja dengan indeks acuan (tracking difference) dan biaya pengelolaan.'
    },
    'Obligasi Negara / SBN': {
        icon: 'fa-landmark',
        color: 'text-rose-500',
        what: 'Surat utang yang diterbitkan pemerintah: SUN seri FR di pasar sekunder, serta SBN ritel seperti ORI, SR, ST, dan SBR.',
        for: 'Penghasilan kupon yang pasti dengan risiko gagal bayar sangat kecil karena dijamin negara.',
        risk: 'Harga seri FR bisa turun saat yield naik. SBN ritel aman sampai jatuh tempo, tetapi tidak bisa dicairkan sebebas reksa dana.',
        tip: 'Yield dan CAGR bukan hal yang sama: yield adalah imbal hasil saat dibeli, CAGR adalah pertumbuhan harga historis.'
    }
};

const PG_METRICS = [
    ['CAGR', 'Compound Annual Growth Rate: rata-rata pertumbuhan per tahun selama periode tertentu (idealnya 10 tahun). Untuk ETF yang diperbarui otomatis, dihitung dari harga penutupan dan belum termasuk dividen.'],
    ['AUM', 'Asset Under Management: total dana yang dikelola. Semakin besar biasanya semakin likuid dan kecil risiko ditutup.'],
    ['Expense ratio', 'Biaya pengelolaan tahunan dalam persen dari nilai investasi. 0,10% berarti Rp1 juta dikenai Rp1.000 per tahun. Selisih kecil menjadi besar jika ditumpuk bertahun-tahun.'],
    ['Risiko', 'Penilaian kualitatif dari Sangat Rendah sampai Krisis/Distressed. Itu cuma panduan awal, bukan pengganti membaca prospektus.'],
    ['Penanda data', 'Titik hijau berarti angka dihitung dari harga pasar atau dikumpulkan dari sumber 2026 (bunga deposito, kupon SBN, return reksa dana). Titik oranye berarti angka arsip yang belum diverifikasi untuk 2026.'],
    ['Return / CAGR', 'Untuk ETF: CAGR dari harga. Untuk deposito: bunga maksimum per tahun. Untuk SBN: kupon tenor terpanjang. Untuk reksa dana: return 1 tahun pada tanggal yang tertera. Jangan dibandingkan langsung antar-jenis; lihat keterangan di panel detail.']
];

const PG_TIERS = [
    ['Developed', 'Pasar maju: ekonomi besar, bursa likuid, aturan investor kuat (AS, Jepang, Eropa Barat, dll.).'],
    ['Emerging', 'Pasar berkembang: tumbuh cepat tetapi lebih fluktuatif dan sensitif terhadap kurs (Indonesia, India, Brasil, dll.).'],
    ['Advanced Frontier', 'Frontier yang lebih mapan atau likuid dibanding frontier biasa. Ini istilah internal database ini, bukan label resmi MSCI.'],
    ['Frontier', 'Pasar kecil dan kurang likuid. Potensi besar, tetapi sulit keluar masuk dan risikonya tinggi.'],
    ['Standalone', 'Pasar yang berdiri sendiri di luar klasifikasi utama karena akses atau likuiditasnya terbatas.']
];

function pgEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function pgLoad() {
    if (pgData) return pgData;
    const v = window.EWOKS_ASSET_V || '1';
    const base = typeof EwoksSiteContext !== 'undefined' ? EwoksSiteContext.basePath : '/';
    const res = await fetch(`${base}assets/data/pasar-global.json?v=${encodeURIComponent(v)}`);
    if (!res.ok) throw new Error('Data tidak ditemukan');
    pgData = await res.json();
    return pgData;
}

function pgRiskClass(r) {
    if (/Sangat Rendah|Rendah/.test(r)) return 'bg-emerald-100 text-emerald-800';
    if (r === 'Moderat') return 'bg-blue-100 text-blue-800';
    if (r === 'Moderat-Tinggi') return 'bg-amber-100 text-amber-800';
    return 'bg-rose-100 text-rose-800';
}

function pgTierClass(t) {
    if (t === 'Developed') return 'bg-blue-100 text-blue-800';
    if (t === 'Emerging') return 'bg-emerald-100 text-emerald-800';
    if (t === 'Advanced Frontier') return 'bg-indigo-100 text-indigo-800';
    if (t === 'Frontier') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-200 text-slate-700';
}

function pgCagrBadge(i) {
    if (i.cagr == null || !Number.isFinite(i.cagr)) return '<span class="text-slate-400 text-xs">(-)</span>';
    let bg = 'bg-slate-100 text-slate-700';
    if (i.cagr >= 12) bg = 'bg-emerald-100 text-emerald-800';
    else if (i.cagr >= 6) bg = 'bg-blue-100 text-blue-800';
    else if (i.cagr >= 0) bg = 'bg-amber-100 text-amber-800';
    else bg = 'bg-rose-100 text-rose-800';
    const live = i.cagrBasis === 'stooq';
    const ver = ['bunga', 'kupon', 'return1y'].includes(i.cagrBasis);
    const dot = live || ver
        ? `<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" title="${pgEsc(ver ? (i.metric || 'Data 2026') + ' · ' + (i.dataAsOf || '') : 'CAGR dihitung dari harga pasar')}"></span>`
        : '<span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" title="Angka arsip, belum diverifikasi 2026"></span>';
    return `<span class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-black ${bg}">${dot}${i.cagr}%</span>`;
}

function pgStatusBadge(i) {
    if (i.status === 'etf-as') return '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700">Harga pasar</span>';
    if (i.status === 'produk') return '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700">Produk UCITS</span>';
    if (i.status === 'terverifikasi') return '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700">Data 2026</span>';
    if (i.status === 'jadwal') return '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-sky-50 text-sky-700">Jadwal</span>';
    if (i.status === 'indikatif') return '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700">Indikatif</span>';
    return '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700">Arsip</span>';
}

function pgPopulateSelect(id, label, values) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="ALL">${label}</option>` + values.map((v) => `<option value="${pgEsc(v)}">${pgEsc(v)}</option>`).join('');
}

function pgBuildControls() {
    const list = pgData.instruments;
    const sortBy = (order) => (a, b) => (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)) || a.localeCompare(b);
    pgPopulateSelect('pgTier', 'Semua tier', [...new Set(list.map((i) => i.tier))].sort(sortBy(PG_TIER_ORDER)));
    pgPopulateSelect('pgCountry', 'Semua negara', [...new Set(list.map((i) => i.country))].sort((a, b) => a.localeCompare(b)));
    pgPopulateSelect('pgRisk', 'Semua risiko', [...new Set(list.map((i) => i.risk))].sort(sortBy(PG_RISK_ORDER)));
}

function pgRenderClassTabs() {
    const box = document.getElementById('pgClassTabs');
    if (!box) return;
    const visible = pgData.instruments.filter((i) => pgShowIndikatif() || i.status !== 'indikatif');
    const tabs = [['ALL', 'Semua', visible.length], ...PG_CLASS_ORDER.map((c) => [c, c, visible.filter((i) => i.assetClass === c).length])];
    box.innerHTML = tabs
        .map(([key, label, n]) => {
            const active = pgState.cls === key;
            const cls = active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
            return `<button type="button" data-pg-class="${pgEsc(key)}" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide ${cls}">${pgEsc(label)} <span class="opacity-60">${n}</span></button>`;
        })
        .join('');
    box.querySelectorAll('button[data-pg-class]').forEach((b) => {
        b.onclick = () => {
            pgState.cls = b.getAttribute('data-pg-class');
            pgApplyFilters();
        };
    });
}

function pgShowIndikatif() {
    return !!document.getElementById('pgShowIndikatif')?.checked;
}

function pgReset() {
    ['pgSearch'].forEach((id) => { const e = document.getElementById(id); if (e) e.value = ''; });
    ['pgTier', 'pgCountry', 'pgRisk'].forEach((id) => { const e = document.getElementById(id); if (e) e.value = 'ALL'; });
    const chk = document.getElementById('pgShowIndikatif');
    if (chk) chk.checked = false;
    pgState.cls = 'ALL';
    pgApplyFilters();
}

function pgApplyFilters() {
    if (!pgData) return;
    const q = (document.getElementById('pgSearch')?.value || '').toLowerCase().trim();
    const tier = document.getElementById('pgTier')?.value || 'ALL';
    const country = document.getElementById('pgCountry')?.value || 'ALL';
    const risk = document.getElementById('pgRisk')?.value || 'ALL';
    const showInd = pgShowIndikatif();

    pgFiltered = pgData.instruments.filter((i) => {
        if (!showInd && i.status === 'indikatif') return false;
        if (pgState.cls !== 'ALL' && i.assetClass !== pgState.cls) return false;
        if (tier !== 'ALL' && i.tier !== tier) return false;
        if (country !== 'ALL' && i.country !== country) return false;
        if (risk !== 'ALL' && i.risk !== risk) return false;
        if (!q) return true;
        return [i.name, i.ticker, i.country, i.manager, i.assetClass, i.tier].join(' ').toLowerCase().includes(q);
    });
    pgSort();
    pgRenderClassTabs();
    pgRenderTable();
    pgRenderSummary();
    pgRenderCharts();
    pgRenderTierCards();
}

function pgSort() {
    const { sortCol: col, sortDir: dir } = pgState;
    const mul = dir === 'asc' ? 1 : -1;
    pgFiltered.sort((a, b) => {
        let x = a[col];
        let y = b[col];
        if (col === 'risk') { x = PG_RISK_ORDER.indexOf(x); y = PG_RISK_ORDER.indexOf(y); }
        if (col === 'tier') { x = PG_TIER_ORDER.indexOf(x); y = PG_TIER_ORDER.indexOf(y); }
        if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y) * mul;
        const okx = Number.isFinite(x), oky = Number.isFinite(y);
        if (!okx && !oky) return 0;
        if (!okx) return 1;   // data kosong selalu di bawah
        if (!oky) return -1;
        return (x - y) * mul;
    });
}

function pgSortBy(col) {
    if (pgState.sortCol === col) pgState.sortDir = pgState.sortDir === 'asc' ? 'desc' : 'asc';
    else { pgState.sortCol = col; pgState.sortDir = col === 'name' || col === 'country' ? 'asc' : 'desc'; }
    pgApplyFilters();
}

function pgRenderTable() {
    const thead = document.getElementById('pgTableHead');
    const tbody = document.getElementById('pgTableBody');
    if (!thead || !tbody) return;
    const cols = [
        ['name', 'Instrumen', ''],
        ['country', 'Negara', 'hidden md:table-cell'],
        ['tier', 'Tier', 'hidden lg:table-cell'],
        ['assetClass', 'Kelas', 'hidden lg:table-cell'],
        ['cagr', 'Return / CAGR', ''],
        ['expense', 'Expense', 'hidden md:table-cell'],
        ['risk', 'Risiko', 'hidden sm:table-cell'],
        ['status', 'Data', 'hidden xl:table-cell']
    ];
    const arrow = (c) => (pgState.sortCol === c ? (pgState.sortDir === 'asc' ? ' ▲' : ' ▼') : '');
    thead.innerHTML = `<tr>${cols
        .map(([c, l, h]) => `<th class="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase cursor-pointer select-none ${h}" onclick="pgSortBy('${c}')">${l}${arrow(c)}</th>`)
        .join('')}</tr>`;

    document.getElementById('pgCount').textContent = String(pgFiltered.length);
    if (!pgFiltered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-10 text-center text-slate-400 font-bold">Tidak ada instrumen yang cocok dengan filter.</td></tr>';
        return;
    }
    tbody.innerHTML = pgFiltered
        .map((i) => {
            const sel = pgSelectedId === i.id;
            return `<tr data-pg-id="${i.id}" class="border-t border-slate-100 cursor-pointer hover:bg-blue-50/60 transition-colors ${sel ? 'bg-blue-50' : ''}">
                <td class="px-4 py-3"><div class="font-mono font-bold text-blue-600 text-xs">${pgEsc(i.ticker)}</div><div class="font-bold text-slate-800 leading-snug">${pgEsc(i.name)}</div></td>
                <td class="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">${pgEsc(i.country)}</td>
                <td class="px-4 py-3 hidden lg:table-cell"><span class="px-2 py-0.5 rounded text-[10px] font-black ${pgTierClass(i.tier)}">${pgEsc(i.tier)}</span></td>
                <td class="px-4 py-3 text-xs text-slate-600 hidden lg:table-cell">${pgEsc(i.assetClass)}</td>
                <td class="px-4 py-3">${pgCagrBadge(i)}</td>
                <td class="px-4 py-3 text-xs font-bold text-slate-700 hidden md:table-cell">${i.expense != null ? i.expense + '%' : '—'}</td>
                <td class="px-4 py-3 hidden sm:table-cell"><span class="px-2 py-0.5 rounded text-[10px] font-black ${pgRiskClass(i.risk)}">${pgEsc(i.risk)}</span></td>
                <td class="px-4 py-3 hidden xl:table-cell">${pgStatusBadge(i)}</td>
            </tr>`;
        })
        .join('');
    tbody.querySelectorAll('tr[data-pg-id]').forEach((tr) => {
        tr.onclick = () => pgSelect(parseInt(tr.getAttribute('data-pg-id'), 10));
    });
}

function pgRenderSummary() {
    const box = document.getElementById('pgSummaryCards');
    if (!box) return;
    const comparable = (i) => pgState.cls !== 'ALL' || !['bunga', 'kupon', 'return1y'].includes(i.cagrBasis) || i.assetClass === 'ETF'; // 'Semua' hanya membandingkan CAGR historis
    const withCagr = pgFiltered.filter((i) => Number.isFinite(i.cagr) && comparable(i));
    const best = withCagr.slice().sort((a, b) => b.cagr - a.cagr)[0];
    const cheap = pgFiltered.filter((i) => Number.isFinite(i.expense) && i.expense > 0).sort((a, b) => a.expense - b.expense)[0];
    const bm = pgData.meta?.benchmarks?.sbn10y;
    const card = (icon, color, label, value, sub) => `
        <div class="premium-card p-4">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest"><i class="fas ${icon} ${color} mr-1"></i> ${label}</p>
            <p class="text-xl md:text-2xl font-black text-slate-800 mt-1 leading-tight">${value}</p>
            <p class="text-[10px] text-slate-500 mt-1 leading-snug">${sub}</p>
        </div>`;
    box.innerHTML =
        card('fa-list', 'text-blue-500', 'Instrumen', String(pgFiltered.length), `dari ${pgData.instruments.length} di database`) +
        card('fa-trophy', 'text-amber-500', 'CAGR Tertinggi', best ? best.cagr + '%' : '—', best ? pgEsc(best.ticker) + ' · ' + pgEsc(best.name) : 'Tidak ada data') +
        card('fa-percent', 'text-emerald-500', 'Expense Termurah', cheap ? cheap.expense + '%' : '—', cheap ? pgEsc(cheap.ticker) + ' · ' + pgEsc(cheap.name) : 'Tidak ada data') +
        card('fa-landmark', 'text-rose-500', bm ? pgEsc(bm.label) : 'Yield SBN 10 th', bm ? bm.value + '%' : '—', bm ? `per ${pgEsc(bm.asOf)}` : 'Belum ada');
}

function pgRenderCharts() {
    if (typeof whenChartReady !== 'function') return;
    whenChartReady(() => {
        const top = pgFiltered.filter((i) => Number.isFinite(i.cagr) && (pgState.cls !== 'ALL' || !['bunga', 'kupon', 'return1y'].includes(i.cagrBasis) || i.assetClass === 'ETF')).sort((a, b) => b.cagr - a.cagr).slice(0, 10);
        const ctx1 = document.getElementById('pgCagrChart');
        if (ctx1) {
            if (pgCagrChart) pgCagrChart.destroy();
            pgCagrChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: top.map((i) => i.ticker),
                    datasets: [{ data: top.map((i) => i.cagr), backgroundColor: top.map((i) => (i.cagr >= 0 ? '#10b981' : '#f43f5e')), borderRadius: 4 }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` CAGR ${c.parsed.x}%` } } },
                    scales: { x: { ticks: { callback: (v) => v + '%' } } }
                }
            });
        }
        const counts = {};
        pgFiltered.forEach((i) => { counts[i.assetClass] = (counts[i.assetClass] || 0) + 1; });
        const ctx2 = document.getElementById('pgClassChart');
        if (ctx2) {
            if (pgClassChart) pgClassChart.destroy();
            pgClassChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(counts),
                    datasets: [{ data: Object.values(counts), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#f43f5e'], borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } }
            });
        }
    });
}

function pgSelect(id) {
    pgSelectedId = id;
    const i = pgData.instruments.find((x) => x.id === id);
    if (i && i.ticker && (pgData.yearlyRef || []).some((y) => y.ticker === i.ticker)) pgRenderYearly('y-' + String(i.ticker).toLowerCase());
    const panel = document.getElementById('pgDetailPanel');
    if (!i || !panel) return;
    const info = PG_CLASS_INFO[i.assetClass];
    const verified = ['bunga', 'kupon', 'return1y'].includes(i.cagrBasis);
    const basis = verified
        ? `${pgEsc(i.metric || 'Data 2026')}${i.dataAsOf ? ', per ' + pgEsc(i.dataAsOf) : ''}. Dikumpulkan dari media keuangan; lihat sumber di bawah.`
        : i.status === 'jadwal'
        ? 'Jadwal penawaran; kupon belum diumumkan.'
        : i.cagrBasis === 'stooq'
        ? `Dihitung dari harga penutupan${i.cagrYears ? ' ' + i.cagrYears + ' tahun' : ''}${i.dataAsOf ? ' sampai ' + pgEsc(i.dataAsOf) : ''} (tanpa dividen).`
        : (i.status === 'produk'
            ? 'Produk nyata (UCITS) yang diperdagangkan di bursa Eropa. Data kinerja belum tersedia di database ini.'
            : (i.cagr == null ? 'CAGR belum dihitung; akan terisi setelah pembaruan data otomatis berikutnya.' : 'Angka arsip, belum diverifikasi untuk 2026.'));
    const warn = i.status === 'indikatif'
        ? '<div class="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold"><i class="fas fa-triangle-exclamation mr-1"></i> Baris ini tidak ditemukan sebagai produk atau ticker resmi. Anggap sebagai gambaran umum pasarnya saja, jangan sebagai rekomendasi produk.</div>'
        : '';
    const cell = (label, value, cls = '') => `<div><p class="text-[10px] font-black text-slate-400 uppercase">${label}</p><p class="font-bold text-slate-800 ${cls}">${value}</p></div>`;
    panel.innerHTML = `
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
                <p class="font-mono text-xs font-bold text-blue-600">${pgEsc(i.ticker)} · ${pgEsc(i.country)}</p>
                <h4 class="text-lg font-black text-slate-900 leading-snug">${pgEsc(i.name)}</h4>
            </div>
            <div class="flex flex-wrap gap-2">
                <span class="px-2 py-1 rounded-lg text-[10px] font-black ${pgTierClass(i.tier)}">${pgEsc(i.tier)}</span>
                <span class="px-2 py-1 rounded-lg text-[10px] font-black ${pgRiskClass(i.risk)}">Risiko ${pgEsc(i.risk)}</span>
                ${pgStatusBadge(i)}
            </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            ${cell('Penerbit / Manajer', pgEsc(i.manager), 'text-xs')}
            ${cell('Kelas aset', pgEsc(i.assetClass), 'text-xs')}
            ${cell(verified ? pgEsc(i.metric || 'Return') : 'CAGR', i.cagr != null ? i.cagr + '%' : '—')}
            ${cell('Expense ratio', i.expense != null ? i.expense + '%' : '—')}
            ${cell(verified ? 'AUM' : 'AUM (arsip)', i.aum ? pgEsc(i.aum) : '—', 'text-xs')}
            ${i.minPlacement ? cell('Setoran awal', pgEsc(i.minPlacement), 'text-xs') : ''}
        </div>
        <h5 class="text-xs font-black text-slate-500 uppercase tracking-widest mt-5 mb-1"><i class="fas fa-bullseye text-blue-500 mr-1"></i> Bidang & fokus investasi</h5>
        <p class="leading-relaxed text-slate-700">${pgEsc(i.desc)}</p>
        ${info ? `<h5 class="text-xs font-black text-slate-500 uppercase tracking-widest mt-4 mb-1"><i class="fas ${info.icon} ${info.color} mr-1"></i> Tentang ${pgEsc(i.assetClass)}</h5><p class="leading-relaxed text-slate-600">${pgEsc(info.what)} ${pgEsc(info.risk)}</p>` : ''}
        ${i.rates ? `<h5 class="text-xs font-black text-slate-500 uppercase tracking-widest mt-4 mb-2"><i class="fas fa-table text-orange-500 mr-1"></i> Bunga per tenor (% p.a., sebelum pajak)</h5><div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${Object.entries(i.rates).map(([k, v]) => `<div class="bg-orange-50 rounded-xl p-3 text-center"><p class="text-[10px] font-black text-orange-700 uppercase">${pgEsc(k)}</p><p class="text-lg font-black text-slate-800">${v}%</p></div>`).join('')}</div>` : ''}
        ${i.tenors ? `<h5 class="text-xs font-black text-slate-500 uppercase tracking-widest mt-4 mb-2"><i class="fas fa-table text-rose-500 mr-1"></i> Kupon per tenor (% p.a.)</h5><div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${Object.entries(i.tenors).map(([k, v]) => `<div class="bg-rose-50 rounded-xl p-3 text-center"><p class="text-[10px] font-black text-rose-700 uppercase">${pgEsc(k)}</p><p class="text-lg font-black text-slate-800">${v}%</p></div>`).join('')}</div>` : ''}
        ${warn}
        <p class="text-[11px] text-slate-500 mt-4 border-t border-slate-100 pt-3"><strong>Data:</strong> ${basis}</p>
        ${i.src && i.src.length ? `<p class="text-[11px] text-slate-500 mt-1"><strong>Sumber:</strong> ${i.src.map((u, n) => `<a href="${pgEsc(u)}" target="_blank" rel="noopener" class="text-blue-600 hover:underline">[${n + 1}]</a>`).join(' ')}</p>` : ''}`;
    document.querySelectorAll('#pgTableBody tr').forEach((tr) => {
        tr.classList.toggle('bg-blue-50', parseInt(tr.getAttribute('data-pg-id'), 10) === id);
    });
    document.getElementById('pgDetailCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function pgRenderExplainers() {
    const box = document.getElementById('pgClassExplainers');
    if (box) {
        box.innerHTML = PG_CLASS_ORDER.map((c) => {
            const i = PG_CLASS_INFO[c];
            const n = pgData.instruments.filter((x) => x.assetClass === c && x.status !== 'indikatif').length;
            return `<div class="premium-card p-5">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-black text-slate-800 text-sm"><i class="fas ${i.icon} ${i.color} mr-2"></i>${pgEsc(c)}</h4>
                    <span class="text-[10px] font-black text-slate-400">${n} instrumen</span>
                </div>
                <p class="text-xs text-slate-600 leading-relaxed">${pgEsc(i.what)}</p>
                <p class="text-xs text-slate-600 leading-relaxed mt-2"><strong class="text-slate-800">Cocok untuk:</strong> ${pgEsc(i.for)}</p>
                <p class="text-xs text-slate-600 leading-relaxed mt-2"><strong class="text-slate-800">Risiko:</strong> ${pgEsc(i.risk)}</p>
                <p class="text-xs text-blue-700 bg-blue-50 rounded-lg p-2 mt-3 leading-relaxed"><i class="fas fa-lightbulb mr-1"></i>${pgEsc(i.tip)}</p>
            </div>`;
        }).join('');
    }
    const dl = (id, rows) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = rows.map(([t, d]) => `<div><dt class="font-black text-slate-800">${pgEsc(t)}</dt><dd class="text-slate-600 leading-relaxed">${pgEsc(d)}</dd></div>`).join('');
    };
    dl('pgMetricGlossary', PG_METRICS);
    dl('pgTierGlossary', PG_TIERS);
}

const PG_TIER_CARDS = [
    { tier: 'Developed', dot: 'bg-blue-500', txt: 'text-blue-600', nick: 'Kakak Dewasa 🧔🏻‍♂️', desc: 'Mandiri, kaya, aturan main paling jelas. CAGR stabil, paling aman buat uang besar.' },
    { tier: 'Emerging', dot: 'bg-emerald-500', txt: 'text-emerald-600', nick: 'Remaja Bongsor 🏃🏻‍♂️', desc: 'Lagi tumbuh kenceng. Return tinggi tapi gampang masuk angin kalau ada badai suku bunga.' },
    { tier: 'Advanced Frontier', dot: 'bg-purple-500', txt: 'text-purple-600', nick: 'Anak Seragam Pramuka 👦🏻', desc: 'Pasar imut tapi tertib banget ikutan aturan Uni Eropa (Romania, Slovenia, Estonia).' },
    { tier: 'Frontier', dot: 'bg-amber-500', txt: 'text-amber-600', nick: 'Balita Belajar Jalan 👶🏻', desc: 'Pasar kecil. Dapet uang asing langsung terbang, tapi modal ditarik langsung jatuh.' },
    { tier: 'Standalone', dot: 'bg-red-500', txt: 'text-red-600', nick: 'Anak Karantina 🛑', desc: 'Bermasalah (perang, krisis, gembok uang). Dipisah penyedia indeks karena berisiko.' }
];

function pgRenderTierCards() {
    const box = document.getElementById('pgTierCards');
    if (!box) return;
    const active = document.getElementById('pgTier')?.value || 'ALL';
    box.innerHTML = PG_TIER_CARDS.map((c) => {
        const n = pgData.instruments.filter((i) => i.tier === c.tier && (pgShowIndikatif() || i.status !== 'indikatif')).length;
        const on = active === c.tier;
        return `<button type="button" onclick="pgSelectTier('${c.tier}')" class="text-left premium-card p-4 transition cursor-pointer border ${on ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-blue-300'}">
            <div class="flex items-center gap-2 mb-2"><span class="w-2.5 h-2.5 rounded-full ${c.dot}"></span><h4 class="font-black text-sm text-slate-800">${pgEsc(c.tier)}</h4><span class="ml-auto text-[10px] font-bold text-slate-400">${n} instrumen</span></div>
            <p class="text-xs font-bold ${c.txt} mb-1">${c.nick}</p>
            <p class="text-xs text-slate-500 leading-relaxed">${pgEsc(c.desc)}</p>
        </button>`;
    }).join('');
}

function pgSelectTier(tier) {
    const sel = document.getElementById('pgTier');
    if (!sel) return;
    sel.value = sel.value === tier ? 'ALL' : tier;
    pgApplyFilters();
}

let pgYearlyChart = null;

function pgYearLabel(y) {
    return y === new Date().getFullYear() ? y + ' (YTD)' : String(y);
}

function pgRenderYearly(id) {
    const list = pgData.yearlyRef || [];
    if (!list.length) return;
    const sel = document.getElementById('pgYearlySelect');
    const item = list.find((x) => x.id === id) || list[0];
    if (sel && sel.value !== item.id) sel.value = item.id;
    const rows = (item.yearly || []).slice().sort((a, b) => a.year - b.year);
    const t = document.getElementById('pgYearlyTitle');
    if (t) t.textContent = (item.ticker ? item.ticker + ' · ' : '') + item.name;
    const m = document.getElementById('pgYearlyMeta');
    if (m) {
        const est = item.basis === 'estimasi' ? ' · estimasi referensi' : '';
        m.textContent = `${item.group} · ${item.focus || ''}${item.cagr10y != null ? ' · CAGR ±10 th: ' + item.cagr10y + '%' : ''}${est}`;
    }
    const l = document.getElementById('pgYearlyList');
    if (l) l.innerHTML = rows.slice().reverse().map((r) => `<div class="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-50"><span class="font-bold text-slate-600">${pgYearLabel(r.year)}</span><span class="font-black ${r.return >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${r.return >= 0 ? '+' : ''}${r.return}%</span></div>`).join('');
    const n = document.getElementById('pgYearlyNote');
    if (n) n.textContent = item.note || (item.basis === 'pasar' ? 'Return harga penutupan per tahun kalender, tahun berjalan dihitung sampai update terakhir.' : '');
    if (typeof whenChartReady !== 'function') return;
    whenChartReady(() => {
        const ctx = document.getElementById('pgYearlyChart');
        if (!ctx) return;
        if (pgYearlyChart) pgYearlyChart.destroy();
        pgYearlyChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: rows.map((r) => pgYearLabel(r.year)), datasets: [{ data: rows.map((r) => r.return), backgroundColor: rows.map((r) => (r.return >= 0 ? '#10b981' : '#f43f5e')), borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.y}%` } } }, scales: { y: { ticks: { callback: (v) => v + '%' } } } }
        });
    });
}

function pgInitYearly() {
    const sel = document.getElementById('pgYearlySelect');
    const list = pgData.yearlyRef || [];
    if (!sel || !list.length) { document.getElementById('pgYearlyCard')?.classList.add('hidden'); return; }
    const groups = ['ETF', 'Reksa Dana', 'Obligasi'];
    sel.innerHTML = groups.map((g) => `<optgroup label="${g}">${list.filter((x) => x.group === g).map((x) => `<option value="${pgEsc(x.id)}">${pgEsc((x.ticker ? x.ticker + ' — ' : '') + x.name)}</option>`).join('')}</optgroup>`).join('');
    pgRenderYearly(list[0].id);
}

function pgRenderNotes() {
    const m = pgData.meta || {};
    const box = document.getElementById('pgNotes');
    const meta = document.getElementById('pgMetaText');
    const stooq = pgData.instruments.filter((i) => i.cagrBasis === 'stooq').length;
    if (meta) {
        meta.textContent = `Database per ${m.asOf || '—'} · ${pgData.instruments.length} instrumen · ${stooq} ETF dengan CAGR dihitung otomatis dari harga pasar${m.builtAt ? ' (pembaruan terakhir ' + m.builtAt.slice(0, 10) + ')' : ''} · selebihnya data arsip.`;
    }
    if (!box) return;
    const corr = (m.corrections || []).map((c) => `<li>${pgEsc(c)}</li>`).join('');
    box.innerHTML = `
        <p>${pgEsc(m.note || '')}</p>
        <p>${pgEsc(m.yearlyNote || '')}</p>
        <p><strong>Data indikatif</strong> adalah baris yang tidak ditemukan sebagai produk atau ticker resmi. Baris itu disembunyikan secara default.</p>
        ${corr ? `<div><strong>Koreksi dari file lama:</strong><ul class="list-disc ml-5 mt-1">${corr}</ul></div>` : ''}
        <p class="italic text-slate-500">Seluruh informasi untuk tujuan edukasi, bukan rekomendasi membeli atau menjual. Return masa lalu tidak menjamin hasil di masa depan.</p>`;
}

async function pgInit() {
    try {
        await pgLoad();
    } catch (e) {
        const meta = document.getElementById('pgMetaText');
        if (meta) meta.textContent = 'Gagal memuat data pasar global. Coba muat ulang halaman.';
        return;
    }
    pgBuildControls();
    pgRenderExplainers();
    pgRenderNotes();
    let deepId = null;
    try {
        const sp = new URLSearchParams(location.search);
        const q = (sp.get('q') || '').trim(), cls = sp.get('cls');
        if (cls && PG_CLASS_ORDER.includes(cls)) pgState.cls = cls;
        if (q) {
            const se = document.getElementById('pgSearch');
            if (se) se.value = q;
            const hit = pgData.instruments.find((i) => String(i.ticker).toUpperCase() === q.toUpperCase());
            if (hit) deepId = hit.id;
        }
    } catch (_) {}
    pgApplyFilters();
    pgInitYearly();
    if (deepId != null) setTimeout(() => pgSelect(deepId), 150);
}

document.addEventListener('DOMContentLoaded', pgInit);
