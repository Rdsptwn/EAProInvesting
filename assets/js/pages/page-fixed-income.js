// --- FIXED INCOME & SBN ---
// Yield SBN 10 tahun terbaru dari assets/data/macro.json (diisi harian oleh workflow)
let sbnYield10y = null;
async function loadSbnYield() {
    try {
        const res = await fetch(ewoksAssetUrl('assets/data/macro.json'), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const m = await res.json();
        if (Number.isFinite(m?.sbn10y?.value)) {
            sbnYield10y = m.sbn10y.value;
            const lbl = document.getElementById('sbn-yield-used');
            if (lbl) lbl.innerText = sbnYield10y.toFixed(2) + '%';
            if (yieldCurveInstance) { yieldCurveInstance.destroy(); yieldCurveInstance = null; yieldCurveRendered = false; renderYieldCurve(); }
            calcSbn();
        }
    } catch (e) { console.warn('macro.json', e); }
}

let yieldChartRendered = false;
function renderYieldChart() {
    if(yieldChartRendered) return;
    const canvas = document.getElementById('yieldChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pts = [
        {x: 0.5, y: 6.5, r: 9, label: 'Deposito', c: '#94a3b8'},
        {x: 1.0, y: 7.0, r: 11, label: 'SBN Ritel', c: '#34d399'},
        {x: 5.0, y: 8.5, r: 11, label: 'RD Campuran', c: '#fbbf24'},
        {x: 12.0, y: 12.0, r: 15, label: 'IHSG/ETF', c: '#60a5fa'},
        {x: 20.0, y: 25.0, r: 12, label: 'Trading aktif', c: '#f87171'}
    ];
    // label langsung di samping gelembung (tanpa legenda)
    const labelPlugin = { id: 'yLabels', afterDatasetsDraw(ch) {
        const c = ch.ctx, m = ch.getDatasetMeta(1); c.save(); c.font = '600 11px sans-serif'; c.fillStyle = '#e2e8f0';
        m.data.forEach((el, i) => { const l = pts[i].label, w = c.measureText(l).width, left = el.x + el.options.radius + 6 + w > ch.chartArea.right; c.textAlign = left ? 'right' : 'left'; c.fillText(l, el.x + (left ? -1 : 1) * (el.options.radius + 6), el.y + 4); });
        c.restore(); } };
    new Chart(ctx, {
        data: {
            datasets: [
                { type: 'line', data: pts.map(p => ({x: p.x, y: p.y})), borderColor: 'rgba(148,163,184,.55)', borderDash: [5, 5], borderWidth: 2, tension: 0.45, pointRadius: 0, fill: false, order: 2 },
                { type: 'bubble', data: pts.map(p => ({x: p.x, y: p.y, r: p.r, label: p.label})), backgroundColor: pts.map(p => p.c + 'cc'), borderColor: pts.map(p => p.c), borderWidth: 2, order: 1 }
            ]
        },
        plugins: [labelPlugin],
        options: {
            responsive: true, maintainAspectRatio: false,
            color: '#cbd5e1',
            layout: { padding: { right: 8, top: 8 } },
            plugins: {
                legend: { display: false },
                tooltip: { filter: (i) => i.datasetIndex === 1, callbacks: { label: (c) => c.raw.label + ': return ~' + c.raw.y + '%, risiko ' + c.raw.x + '%' } }
            },
            scales: {
                x: { min: 0, max: 24, title: { display: true, text: 'Risiko / Drawdown Maksimal (%)', color: '#94a3b8'}, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51, 65, 85, 0.35)' } },
                y: { min: 4, max: 28, title: { display: true, text: 'Est. Return Tahunan (%)', color: '#94a3b8'}, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51, 65, 85, 0.35)' } }
            }
        }
    });
    yieldChartRendered = true;
}

let yieldCurveRendered = false;
let yieldCurveInstance = null;
// Selisih tenor terhadap 10Y: bentuk kurva ILUSTRASI untuk edukasi (bukan data pasar per tenor)
const YIELD_CURVE_SPREADS = [-0.50, -0.30, -0.15, 0, 0.15, 0.30];
function renderYieldCurve() {
    if(yieldCurveRendered) return;
    const canvas = document.getElementById('yieldCurveChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const base = Number.isFinite(sbnYield10y) ? sbnYield10y : 7.0;
    yieldCurveInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1Y', '3Y', '5Y', '10Y', '15Y', '20Y'],
            datasets: [{
                label: 'Ilustrasi Yield Curve SBN (IDR)',
                data: YIELD_CURVE_SPREADS.map((d) => +(base + d).toFixed(2)),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            color: '#cbd5e1',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: function(ctx) { return 'Yield: ' + ctx.raw + '%'; } } }
            },
            scales: {
                x: { title: { display: true, text: 'Tenor (Tahun)', color: '#94a3b8'}, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } },
                y: { title: { display: true, text: 'Yield (%)', color: '#94a3b8'}, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } }
            }
        }
    });
    yieldCurveRendered = true;
}

function calcSbn() {
    const sbnModal = document.getElementById('sbn-modal');
    if (!sbnModal) return;
    const resEl = document.getElementById('sbn-res-month');
    if (!resEl) return;
    const modal = parseFloat(sbnModal.value) || 0;
    const yieldDash = document.getElementById('sbn-yield-dash');
    const yieldSBN = yieldDash
        ? (parseFloat(yieldDash.innerText.replace(/,/g, '')) / 100 || 0.065)
        : (Number.isFinite(sbnYield10y) ? sbnYield10y / 100 : 0.065);
    const grossYearly = modal * yieldSBN;
    const netYearly = grossYearly * 0.9;
    const netMonthly = netYearly / 12;
    resEl.innerText = `Rp ${Math.round(netMonthly).toLocaleString('id-ID')}`;
}

document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('sbn-modal')) loadSbnYield(); });
