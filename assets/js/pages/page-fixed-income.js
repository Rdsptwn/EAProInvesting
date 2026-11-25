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
    // Batang berpasangan: return (hijau) vs risiko/drawdown (merah) per instrumen, urut dari paling aman
    const rows = [['Deposito', 6.5, 0.5], ['SBN Ritel', 7.0, 1], ['RD Campuran', 8.5, 5], ['IHSG / ETF', 12, 12], ['Trading aktif', 25, 20]];
    const valPlugin = { id: 'yVals', afterDatasetsDraw(ch) {
        const c = ch.ctx; c.save(); c.font = '600 11px sans-serif'; c.fillStyle = '#e2e8f0'; c.textBaseline = 'middle';
        ch.data.datasets.forEach((d, di) => ch.getDatasetMeta(di).data.forEach((b, i) => c.fillText(d.data[i] + '%', b.x + 6, b.y)));
        c.restore(); } };
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rows.map(r => r[0]),
            datasets: [
                { label: 'Est. return tahunan', data: rows.map(r => r[1]), backgroundColor: '#34d399', borderRadius: 6, barThickness: 11 },
                { label: 'Risiko / drawdown maks.', data: rows.map(r => r[2]), backgroundColor: '#fb7185', borderRadius: 6, barThickness: 11 }
            ]
        },
        plugins: [valPlugin],
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            color: '#cbd5e1',
            layout: { padding: { right: 36 } },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#cbd5e1', boxWidth: 10, boxHeight: 10, usePointStyle: true } },
                tooltip: { callbacks: { label: (c) => c.dataset.label + ': ~' + c.raw + '%' } }
            },
            scales: {
                x: { beginAtZero: true, max: 30, ticks: { stepSize: 10, color: '#94a3b8', callback: v => v + '%' }, grid: { color: 'rgba(51, 65, 85, 0.35)' } },
                y: { ticks: { color: '#e2e8f0', font: { weight: '600' } }, grid: { display: false } }
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
