// --- DANA PENSIUN ---
function calculateRetirement() {
    const exp = parseFloat(document.getElementById('p-expense').value) || 0;
    const savings = parseFloat(document.getElementById('p-savings').value) || 0;
    const ageNow = parseFloat(document.getElementById('p-age-now').value) || 0;
    const ageRetire = parseFloat(document.getElementById('p-age-retire').value) || 0;
    const ageMax = parseFloat(document.getElementById('p-age-max').value) || 0;
    const inflation = (parseFloat(document.getElementById('p-inflation').value) || 0) / 100;
    const returns = (parseFloat(document.getElementById('p-return').value) || 0) / 100;

    const yearsToRetire = ageRetire - ageNow;
    const yearsInRetirement = ageMax - ageRetire;
    if (yearsToRetire <= 0 || yearsInRetirement <= 0) {
        if (typeof showToast === 'function') showToast('Umur pensiun harus lebih besar dari umur sekarang, dan umur harapan hidup lebih besar dari umur pensiun.', 'warning');
        return;
    }

    // Tarif bulanan efektif (bukan r/12) supaya konsisten dengan pertumbuhan tahunan.
    const mRate = (annual) => Math.pow(1 + annual, 1 / 12) - 1;
    const futureMonthlyExp = exp * Math.pow(1 + inflation, yearsToRetire);

    // Masa pensiun: pengeluaran terus naik oleh inflasi sementara dana diinvestasikan, jadi
    // didiskon dengan return RIIL = (1+r)/(1+i)-1. Penarikan di AWAL bulan (annuity-due).
    const realAnnual = (1 + returns) / (1 + inflation) - 1;
    const rr = mRate(realAnnual);
    const totalMonths = yearsInRetirement * 12;
    const totalFund = Math.abs(rr) > 1e-9
        ? futureMonthlyExp * ((1 - Math.pow(1 + rr, -totalMonths)) / rr) * (1 + rr)
        : futureMonthlyExp * totalMonths;

    // Masa kerja: tabungan tumbuh dengan return nominal; iuran bulanan di akhir bulan, nominal tetap.
    const nr = mRate(returns);
    const workMonths = yearsToRetire * 12;
    const futureSavings = savings * Math.pow(1 + returns, yearsToRetire);
    const gap = totalFund - futureSavings;
    const monthlyInvest = gap <= 0 ? 0
        : (Math.abs(nr) > 1e-9 ? (gap * nr) / (Math.pow(1 + nr, workMonths) - 1) : gap / workMonths);

    document.getElementById('res-total-fund').innerText = Math.round(totalFund).toLocaleString('id-ID');
    document.getElementById('res-monthly-future').innerText = `Masa Depan: Rp ${Math.round(futureMonthlyExp).toLocaleString('id-ID')}/bln`;
    document.getElementById('res-monthly-invest').innerText = Math.round(monthlyInvest).toLocaleString('id-ID');
}

function shareWhatsAppPensiun() {
    const total = document.getElementById('res-total-fund').innerText;
    const invest = document.getElementById('res-monthly-invest').innerText;
    const ageRetire = document.getElementById('p-age-retire').value;
    const msg = `*EWOKS RETIREMENT PLAN*\n\nTarget Pensiun: Umur ${ageRetire}\nDana Wajib: Rp ${total}\nInvestasi/Bulan: Rp ${invest}\n\n_Ewoks Academy Suite_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}
