let compoundChartInstance = null;
let compoundChartRetry = 0;

function calcCompound() {
    const num = (id) => { const v = parseFloat(document.getElementById(id)?.value); return Number.isFinite(v) ? v : 0; };
    const modalAwal = Math.max(0, num('cmp-awal'));
    const setoran = Math.max(0, num('cmp-bulanan'));
    const tahun = Math.min(60, Math.max(0, num('cmp-tahun')));
    const returnTahunan = num('cmp-return');
    const inflasi = num('cmp-inflasi');

    // Return tahunan dianggap EFEKTIF per tahun; tarif bulanan setara = (1+r)^(1/12)-1
    // (r/12 akan menggandakan bunga dan menghasilkan return efektif lebih tinggi dari input).
    const g = 1 + returnTahunan / 100;
    const rateBulan = g > 0 ? Math.pow(g, 1 / 12) - 1 : -1;
    // Setoran di akhir bulan (ordinary annuity). FV setelah m bulan:
    const fv = (m) => {
        const grow = Math.pow(1 + rateBulan, m);
        return modalAwal * grow + (Math.abs(rateBulan) < 1e-12 ? setoran * m : setoran * ((grow - 1) / rateBulan));
    };

    const bulan = Math.round(tahun * 12);
    const totalAkhir = fv(bulan);
    const totalSetor = modalAwal + setoran * bulan;
    const totalBunga = totalAkhir - totalSetor;

    document.getElementById('res-cmp-pokok').innerText = "Rp " + Math.round(totalSetor).toLocaleString('id-ID');
    document.getElementById('res-cmp-bunga').innerText = (totalBunga < 0 ? "-" : "") + "Rp " + Math.abs(Math.round(totalBunga)).toLocaleString('id-ID');
    document.getElementById('res-cmp-total').innerText = "Rp " + Math.round(totalAkhir).toLocaleString('id-ID');
    const realEl = document.getElementById('res-cmp-real');
    if (realEl) {
        const deflator = Math.pow(1 + inflasi / 100, tahun);
        realEl.innerText = "Rp " + Math.round(totalAkhir / deflator).toLocaleString('id-ID');
    }

    let labels = [];
    let dataPokok = [];
    let dataBunga = [];
    for (let i = 0; i <= tahun; i++) {
        labels.push('Thn ' + i);
        const pokok = modalAwal + setoran * 12 * i;
        dataPokok.push(pokok);
        dataBunga.push(fv(i * 12) - pokok);
    }
    // Bunga negatif (return < 0) tidak bisa ditumpuk di bar; tampilkan nol dan biarkan total akhir yang menjelaskan.
    dataBunga = dataBunga.map(v => Math.max(0, v));

    renderCompoundChart(labels, dataPokok, dataBunga);
}

function renderCompoundChart(labels, pokokData, bungaData) {
    const canvasEl = document.getElementById('compoundChartCanvas');
    if (!canvasEl) return;
    if (typeof Chart === 'undefined') {
        if (compoundChartRetry < 50) {
            compoundChartRetry += 1;
            setTimeout(() => renderCompoundChart(labels, pokokData, bungaData), 120);
        }
        return;
    }
    compoundChartRetry = 0;
    const ctx = canvasEl.getContext('2d');
    const abbrev = typeof formatAbbreviated === 'function'
        ? formatAbbreviated
        : (n) => Math.round(Number(n) || 0).toLocaleString('id-ID');

    if (compoundChartInstance) {
        compoundChartInstance.destroy();
    }

    const isDark = document.body.classList.contains('dark-mode-override');

    compoundChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Modal Pokok',
                    data: pokokData,
                    backgroundColor: '#3b82f6', // blue-500
                    stacked: true,
                },
                {
                    label: 'Keuntungan Bunga',
                    data: bungaData,
                    backgroundColor: '#10b981', // emerald-500
                    stacked: true,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        boxWidth: 12, 
                        font: { size: 10 }, 
                        color: isDark ? '#94a3b8' : '#64748b' 
                    } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': Rp ' + Math.round(context.raw).toLocaleString('id-ID');
                        }
                    }
                }
            },
            scales: {
                x: { 
                    stacked: true, 
                    ticks: { 
                        font: { size: 9 }, 
                        color: isDark ? '#94a3b8' : '#64748b' 
                    }, 
                    grid: { display: false } 
                },
                y: { 
                    stacked: true, 
                    ticks: { 
                        font: { size: 9 }, 
                        color: isDark ? '#94a3b8' : '#64748b',
                        callback: function(value) { return 'Rp ' + abbrev(value); } 
                    }, 
                    grid: { 
                        color: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)' 
                    } 
                }
            }
        }
    });
}

function shareWhatsAppCompound() {
    const modalAwal = document.getElementById('cmp-awal').value;
    const setoran = document.getElementById('cmp-bulanan').value;
    const tahun = document.getElementById('cmp-tahun').value;
    const totalAkhir = document.getElementById('res-cmp-total').innerText;
    const msg = `*SIMULASI COMPOUNDING INTEREST*\n\nModal Awal: Rp ${Number(modalAwal).toLocaleString('id-ID')}\nSetoran Rutin: Rp ${Number(setoran).toLocaleString('id-ID')}/bln\nDurasi: ${tahun} Tahun\n\n🎯 *Nilai Akhir: ${totalAkhir}*\n\n_Ewoks Academy Pro_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

function calcDarurat() {
    const expense = parseFloat(document.getElementById('dar-expense').value) || 0;
    const multiplier = parseFloat(document.getElementById('dar-status').value) || 6;
    const current = parseFloat(document.getElementById('dar-current').value) || 0;

    const target = expense * multiplier;
    let kurang = target - current;
    let pct = target > 0 ? (current / target) * 100 : 0;

    if (pct > 100) pct = 100;
    if (kurang < 0) kurang = 0;

    document.getElementById('res-dar-target').innerText = "Rp " + Math.round(target).toLocaleString('id-ID');
    document.getElementById('res-dar-kurang').innerText = "Rp " + Math.round(kurang).toLocaleString('id-ID');
    document.getElementById('res-dar-pct').innerText = Math.round(pct) + "%";
    document.getElementById('res-dar-bar').style.width = pct + "%";
}

function shareWhatsAppDarurat() {
    const target = document.getElementById('res-dar-target').innerText;
    const pct = document.getElementById('res-dar-pct').innerText;
    const msg = `*TARGET DANA DARURAT*\n\nTarget Dana Darurat saya adalah *${target}*.\nProgress saat ini: ${pct}\n\n_Dihitung via Ewoks Academy Pro_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}
