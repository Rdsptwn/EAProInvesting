// --- JURNAL TRADING & LOG BOOK ---
function calcRRR() {
    const buy = parseFloat(document.getElementById('jr-buy').value) || 0;
    const tp = parseFloat(document.getElementById('jr-tp').value) || 0;
    const sl = parseFloat(document.getElementById('jr-sl').value) || 0;
    const indicator = document.getElementById('rr-indicator');

    if(buy > 0 && tp > 0 && sl > 0 && tp > buy && buy > sl) {
        const risk = buy - sl;
        const reward = tp - buy;
        const ratio = reward / risk;
        
        let text = `RRR 1 : ${ratio.toFixed(1)}`;
        if(ratio >= 3) {
            indicator.innerHTML = `<span class="text-emerald-500"><i class="fas fa-check-circle"></i> ${text} (Sangat Bagus)</span>`;
        } else if(ratio >= 2) {
            indicator.innerHTML = `<span class="text-blue-500"><i class="fas fa-check"></i> ${text} (Ideal)</span>`;
        } else {
            indicator.innerHTML = `<span class="text-rose-500"><i class="fas fa-exclamation-triangle"></i> ${text} (Kurang Ideal / Berisiko)</span>`;
        }
    } else {
        indicator.innerHTML = '';
    }
}

function getJournalCapital() {
    try { const v = parseFloat(localStorage.getItem('ewoks_jr_capital')); return Number.isFinite(v) && v > 0 ? v : 0; } catch (_) { return 0; }
}
function saveJournalCapital() {
    const v = parseFloat(document.getElementById('jr-capital')?.value);
    try { if (Number.isFinite(v) && v > 0) localStorage.setItem('ewoks_jr_capital', String(v)); else localStorage.removeItem('ewoks_jr_capital'); } catch (_) {}
    renderJournal(document.getElementById('jr-search')?.value || '');
}
document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('jr-capital');
    const c = getJournalCapital();
    if (el && c > 0) el.value = c;
});

function saveJournal() {
    try { localStorage.setItem('ewoks_journal', JSON.stringify(journal)); return true; }
    catch (_) { showToast('Gagal menyimpan ke penyimpanan peramban (penuh/mode privat). Data hanya ada selama halaman terbuka.', 'error'); return false; }
}

function addJournal() {
    const date = document.getElementById('jr-date').value;
    const ticker = document.getElementById('jr-ticker').value.toUpperCase().trim();
    const lot = parseFloat(document.getElementById('jr-lot').value);
    const buy = parseFloat(document.getElementById('jr-buy').value);
    const sell = parseFloat(document.getElementById('jr-sell').value);
    const slRaw = parseFloat(document.getElementById('jr-sl')?.value);
    const pct = (id, def) => { const v = parseFloat(document.getElementById(id)?.value); return Number.isFinite(v) && v >= 0 ? v : def; };
    const feeBuy = pct('jr-fee', EWOKS_FEE_DEFAULT.buy);
    const feeSell = pct('jr-fee-sell', EWOKS_FEE_DEFAULT.sell);
    const tax = EWOKS_FEE_DEFAULT.tax;
    const reason = document.getElementById('jr-reason').value;
    const emotion = document.getElementById('jr-emotion').value;
    const screenshot = document.getElementById('jr-screenshot').value.trim();

    if(!date || !ticker || !lot || !buy || !sell) {
        showToast("Semua kolom input bertanda wajib harus diisi!", "error");
        return;
    }
    if(buy <= 0 || sell <= 0 || lot <= 0) {
        showToast("Kesalahan Validasi: Harga dan Lot tidak boleh bernilai negatif atau nol!", "error");
        return;
    }
    if(!Number.isInteger(lot)) {
        showToast("Lot harus bilangan bulat (1 lot = 100 lembar).", "error");
        return;
    }
    if(date > ewoksTodayWIB()) {
        showToast("Tanggal trade tidak boleh di masa depan.", "error");
        return;
    }

    const r = ewoksTradeNet(buy, sell, lot, feeBuy, feeSell, tax);
    let id = Date.now();
    while (journal.some(x => x.id === id)) id += 1;
    const entry = { id, date, ticker, lot, buy, sell, feeBuy, feeSell, tax, reason, emotion, screenshot, netPnL: r.net, isWin: r.net > 0 };
    if (Number.isFinite(slRaw) && slRaw > 0 && slRaw < buy) entry.sl = slRaw; // untuk menghitung R-multiple
    journal.unshift(entry);
    saveJournal();

    document.getElementById('jr-ticker').value = '';
    document.getElementById('jr-lot').value = '';
    document.getElementById('jr-buy').value = '';
    document.getElementById('jr-sell').value = '';
    document.getElementById('jr-tp').value = '';
    document.getElementById('jr-sl').value = '';
    document.getElementById('jr-screenshot').value = '';
    document.getElementById('rr-indicator').innerHTML = '';

    showToast("Catatan Trade berhasil disimpan ke Jurnal!", "success");
    renderJournal();
}

/** Urutan kronologis stabil: tanggal, lalu id (waktu input) sebagai pemisah trade pada hari yang sama. */
function sortJournalChrono(list) {
    return [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
}

/** Metrik standar manajer investasi dari daftar trade (net setelah fee & pajak). */
function computeJournalMetrics(list) {
    const sorted = sortJournalChrono(list);
    const wins = sorted.filter(j => j.netPnL > 0), losses = sorted.filter(j => j.netPnL < 0);
    const be = sorted.length - wins.length - losses.length;
    const gw = wins.reduce((a, j) => a + j.netPnL, 0);
    const gl = losses.reduce((a, j) => a + Math.abs(j.netPnL), 0);
    const n = sorted.length;
    const avgWin = wins.length ? gw / wins.length : 0;
    const avgLoss = losses.length ? gl / losses.length : 0;
    let eq = 0, peak = 0, mdd = 0;
    sorted.forEach(j => { eq += j.netPnL; peak = Math.max(peak, eq); mdd = Math.min(mdd, eq - peak); });
    const rs = sorted.filter(j => j.sl && j.sl < j.buy).map(j => {
        const risk = (j.buy - j.sl) * j.lot * 100;
        return j.netPnL / risk;
    });
    return {
        n, wins: wins.length, losses: losses.length, be,
        net: eq, gw, gl, avgWin, avgLoss,
        winRate: n ? wins.length / n : 0,
        expectancy: n ? (gw - gl) / n : 0,
        profitFactor: gl > 0 ? gw / gl : (gw > 0 ? Infinity : 0),
        payoff: avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? Infinity : 0),
        mdd, peak,
        avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
        nR: rs.length
    };
}

function renderJurnalCharts(journalData) {
    if(!journalData || journalData.length === 0) {
        if(window.equityChartInstance) { window.equityChartInstance.destroy(); window.equityChartInstance = null; }
        if(window.winLossChartInstance) { window.winLossChartInstance.destroy(); window.winLossChartInstance = null; }
        return;
    }

    const sorted = sortJournalChrono(journalData);
    let equity = [];
    let labels = [];
    let currentEq = 0;
    let wins = 0;
    let losses = 0;

    sorted.forEach((j) => {
        currentEq += j.netPnL;
        equity.push(currentEq);
        labels.push(`${j.ticker} (${j.date.split('-').slice(1).join('/')})`);
        if(j.netPnL > 0) wins++; else if(j.netPnL < 0) losses++;
    });

    const ctxEq = document.getElementById('equityChart');
    if(ctxEq) {
        if(window.equityChartInstance) window.equityChartInstance.destroy();
        window.equityChartInstance = new Chart(ctxEq.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Kumulatif PnL Bersih (Rp)',
                    data: equity,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    x: { display: false },
                    y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(226, 232, 240, 0.5)' } }
                }
            }
        });
    }

    const ctxWl = document.getElementById('winLossChart');
    if(ctxWl) {
        if(window.winLossChartInstance) window.winLossChartInstance.destroy();
        window.winLossChartInstance = new Chart(ctxWl.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Win', 'Loss'],
                datasets: [{
                    data: [wins, losses],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
                cutout: '70%'
            }
        });
    }
}

function renderJournal(searchQuery = '') {
    const tbody = document.getElementById('journal-tbody');
    const emptyState = document.getElementById('journal-empty');
    
    let filteredJournal = journal;
    if(searchQuery) {
        const q = searchQuery.toLowerCase();
        filteredJournal = journal.filter(j => String(j.ticker || '').toLowerCase().includes(q));
    }
    
    if(filteredJournal.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hide');
        document.getElementById('jr-total-trade').innerText = '0';
        document.getElementById('jr-win-rate').innerText = '0%';
        document.getElementById('jr-total-win').innerText = '0';
        document.getElementById('jr-total-loss').innerText = '0';
        document.getElementById('jr-total-modal').innerText = '0';
        ['jr-net','jr-expectancy','jr-pf','jr-mdd','jr-avgr'].forEach(id => { const el = document.getElementById(id); if (el) el.innerText = '–'; });
        
        if(window.equityChartInstance) window.equityChartInstance.destroy();
        if(window.winLossChartInstance) window.winLossChartInstance.destroy();
        return;
    }
    
    emptyState.classList.add('hide');
    let totalModal = 0;

    tbody.innerHTML = filteredJournal.map(j => {
        totalModal += (j.buy * j.lot * 100);

        const pnlColor = j.netPnL > 0 ? 'text-emerald-500' : (j.netPnL < 0 ? 'text-rose-500' : 'text-slate-500');
        const pnlSign = j.netPnL > 0 ? '+' : '';
        const safeShot = /^https?:\/\//i.test(j.screenshot || '') ? escapeHtml(j.screenshot) : '';
        const screenHTML = safeShot ? `<a href="${safeShot}" rel="noopener noreferrer" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1 tooltip-trigger"><i class="fas fa-image"></i><span class="tooltip-text">Lihat Chart Entry</span></a>` : '';
        const id = Number(j.id);

        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50 bg-white transition-colors">
            <td class="p-4">
                <span class="font-black text-blue-600 text-sm flex items-center">${escapeHtml(j.ticker)} ${screenHTML}</span>
                <span class="text-[9px] text-slate-400 font-bold">${escapeHtml(j.date)}</span>
            </td>
            <td class="p-4">
                <p class="text-xs font-bold text-slate-700">B: <span class="text-slate-500">${Number(j.buy)}</span> | S: <span class="text-slate-500">${Number(j.sell)}</span></p>
                <p class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">${Number(j.lot)} Lot</p>
            </td>
            <td class="p-4">
                <span class="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block mb-1">${escapeHtml(j.reason)}</span><br>
                <span class="text-[10px] text-slate-500 italic"><i class="fas fa-brain text-slate-300 mr-1"></i>${escapeHtml(j.emotion)}</span>
            </td>
            <td class="p-4 text-right font-black ${pnlColor}">
                ${pnlSign}Rp ${Math.round(j.netPnL).toLocaleString('id-ID')}
            </td>
            <td class="p-4 text-center flex flex-col gap-1 items-center justify-center">
                <button onclick="shareWhatsAppJournal(${id})" class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors tooltip-trigger" title="Share WA"><i class="fab fa-whatsapp"></i></button>
                <button onclick="deleteJournal(${id})" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors tooltip-trigger" title="Hapus"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
        `;
    }).join('');

    const m = computeJournalMetrics(filteredJournal);
    const rp = (v) => (v < 0 ? '-' : '') + 'Rp ' + formatAbbreviated(Math.abs(v));
    const set = (id, t) => { const el = document.getElementById(id); if (el) el.innerText = t; };
    set('jr-total-trade', String(m.n));
    set('jr-win-rate', (m.winRate * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%' + (m.be ? ` (+${m.be} BEP)` : ''));
    set('jr-total-win', formatAbbreviated(m.gw));
    set('jr-total-loss', formatAbbreviated(m.gl));
    set('jr-total-modal', formatAbbreviated(totalModal));
    const cap = getJournalCapital();
    const pctTxt = (x) => x.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + '%';
    set('jr-net', rp(m.net) + (cap > 0 ? ` (${pctTxt(m.net / cap * 100)})` : ''));
    set('jr-expectancy', rp(m.expectancy));
    set('jr-pf', m.profitFactor === Infinity ? '∞' : m.profitFactor.toLocaleString('id-ID', { maximumFractionDigits: 2 }));
    set('jr-mdd', m.mdd < 0 ? rp(m.mdd) + (cap > 0 ? ` (${pctTxt(m.mdd / (cap + m.peak) * 100)})` : '') : (cap > 0 ? 'Rp 0 (0%)' : 'Rp 0'));
    set('jr-avgr', m.avgR === null ? 'n/a' : m.avgR.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + 'R');
    const sub = document.getElementById('jr-sample-note');
    if (sub) sub.innerText = (searchQuery ? `Subset filter "${searchQuery}" · ` : '') + `n=${m.n} trade` + (m.n < 30 ? ' — sampel kecil, metrik belum stabil secara statistik' : '') + (m.nR ? ` · Avg R dari ${m.nR} trade ber-SL` : ' · isi Stop Loss untuk mengaktifkan Avg R');

    renderJurnalCharts(filteredJournal);
}

function saveMacroNotes() {
    const notes = document.getElementById('macro-notes').value;
    localStorage.setItem('ewoks_macro_notes', notes);
    showToast('Catatan Sentimen Makro berhasil disimpan!', 'success');
}

function loadMacroNotes() {
    const notes = localStorage.getItem('ewoks_macro_notes');
    const el = document.getElementById('macro-notes');
    if (notes && el) el.value = notes;
}

function shareWhatsAppJournal(id) {
    const j = journal.find(x => x.id === id);
    if (!j) return;
    const status = j.netPnL > 0 ? "✅ PROFIT" : (j.netPnL < 0 ? "❌ LOSS" : "➖ BEP");
    const msg = `*JURNAL TRADING: ${j.ticker}*\nStatus: ${status}\n\nHarga Beli: Rp ${j.buy}\nHarga Jual: Rp ${j.sell}\nLot: ${j.lot} Lot\nNet PnL: Rp ${Math.round(j.netPnL).toLocaleString('id-ID')}\n\nSetup: ${j.reason}\nPsikologi: ${j.emotion}\n\n_Ewoks Academy Suite_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
}

function deleteJournal(id) {
    journal = journal.filter(j => j.id !== id);
    saveJournal();
    renderJournal(document.getElementById('jr-search').value);
    showToast('Data trade berhasil dihapus', 'success');
}

function clearJournal() {
    if(confirm('Yakin ingin menghapus SELURUH histori jurnal trading?')) {
        journal = [];
        localStorage.removeItem('ewoks_journal');
        document.getElementById('jr-search').value = '';
        renderJournal();
        showToast('Jurnal telah dibersihkan sepenuhnya', 'success');
    }
}

function exportJournalCSV() {
    if(journal.length === 0) { showToast('Jurnal masih kosong!', 'error'); return; }
    const q = (v) => {
        let t = String(v ?? '');
        if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // cegah formula injection di Excel
        return '"' + t.replace(/"/g, '""') + '"';
    };
    let csv = "Tanggal,Emiten,Lot,Buy,Sell,Fee Beli(%),Fee Jual(%),Pajak Jual(%),Stop Loss,Alasan Entry,Psikologi/Emosi,Link Gambar,Net PnL (Rp),Status\n";
    sortJournalChrono(journal).forEach(j => {
        const status = j.netPnL > 0 ? 'WIN' : (j.netPnL < 0 ? 'LOSS' : 'BEP');
        csv += [q(j.date), q(j.ticker), j.lot, j.buy, j.sell, j.feeBuy, j.feeSell, j.tax, j.sl ?? '', q(j.reason), q(j.emotion), q(j.screenshot || '-'), j.netPnL, status].join(',') + "\n";
    });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })));
    link.setAttribute("download", "Jurnal_Trading_Ewoks.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV berhasil diunduh', 'success');
}
