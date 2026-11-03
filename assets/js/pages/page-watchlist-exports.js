// --- EKSPOR: hasil Screener (yang sedang tampil) & Watchlist, ke WhatsApp / Excel / CSV ---
function tpStamp() { return new Date().toISOString().slice(0, 10); }
function tpIdr(n) { return Number.isFinite(Number(n)) ? Math.round(Number(n)).toLocaleString('id-ID') : '-'; }

function tpScreenerRowsForExport() {
    const r = typeof tpGetFiltered === 'function' ? tpGetFiltered() : [];
    return r.map((x) => ({
        Kode: x.ticker, Nama: x.name, Harga: Math.round(x.price), 'Perubahan %': x.chg == null ? '' : Number(x.chg.toFixed(2)),
        'Low 52 Mgg': Math.round(x.low52 || 0), 'High 52 Mgg': Math.round(x.high52 || 0),
        Support: Math.round(x.support || 0), Resist: Math.round(x.resist || 0),
        'Posisi Range 52 Mgg %': x.pos == null ? '' : Math.round(x.pos),
        'Volume (lot)': x.vol == null ? '' : Math.round(x.vol / 100),
        Papan: x.board || '', Sektor: x.sector || ''
    }));
}
function tpDownload(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function tpToCsv(data) {
    if (!data.length) return '';
    const cols = Object.keys(data[0]);
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return '﻿' + [cols.map(q).join(',')].concat(data.map((r) => cols.map((c) => q(r[c])).join(','))).join('\r\n');
}
function tpLoadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = () => (window.XLSX ? res(window.XLSX) : rej(new Error('xlsx')));
        s.onerror = () => rej(new Error('xlsx'));
        document.head.appendChild(s);
    });
}
async function tpExportExcel(data, sheet, file) {
    if (!data.length) { showToast('Tidak ada data untuk diekspor. Atur filter dulu.', 'warning'); return; }
    try {
        const X = await tpLoadXlsx();
        const ws = X.utils.json_to_sheet(data);
        ws['!cols'] = Object.keys(data[0]).map((k) => ({ wch: Math.max(k.length + 2, k === 'Nama' ? 30 : 12) }));
        const wb = X.utils.book_new();
        X.utils.book_append_sheet(wb, ws, sheet);
        X.writeFile(wb, file + '.xlsx');
        showToast(`${data.length} baris diekspor ke Excel`, 'success');
    } catch (_) {
        tpDownload(new Blob([tpToCsv(data)], { type: 'text/csv;charset=utf-8' }), file + '.csv');
        showToast('Library Excel gagal dimuat, file diunduh sebagai CSV (bisa dibuka di Excel).', 'warning');
    }
}

function exportScreenerExcel() { tpExportExcel(tpScreenerRowsForExport(), 'Screener', `Screener_Ewoks_${tpStamp()}`); }
function exportScreenerCSV() {
    const d = tpScreenerRowsForExport();
    if (!d.length) { showToast('Tidak ada data untuk diekspor. Atur filter dulu.', 'warning'); return; }
    tpDownload(new Blob([tpToCsv(d)], { type: 'text/csv;charset=utf-8' }), `Screener_Ewoks_${tpStamp()}.csv`);
    showToast(`${d.length} baris diekspor ke CSV`, 'success');
}
function exportScreenerWA() {
    const r = typeof tpGetFiltered === 'function' ? tpGetFiltered() : [];
    if (!r.length) { showToast('Tidak ada hasil screener untuk dikirim. Atur filter dulu.', 'warning'); return; }
    const g = (id) => (document.getElementById(id) || {}).value;
    const f = [];
    if (g('f-q')) f.push(`kata "${g('f-q')}"`);
    if (g('f-pmin') || g('f-pmax')) f.push(`harga ${g('f-pmin') || 0}–${g('f-pmax') || '∞'}`);
    if (g('f-cmin') || g('f-cmax')) f.push(`chg ${g('f-cmin') || '-∞'}–${g('f-cmax') || '∞'}%`);
    const sel = (id) => { const e = document.getElementById(id); return e && e.value ? e.options[e.selectedIndex].text : ''; };
    if (sel('f-pos')) f.push(sel('f-pos')); if (sel('f-sr')) f.push(sel('f-sr'));
    const head = `*HASIL SCREENER EWOKS*\n${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB\nFilter: ${f.join(', ') || 'semua emiten'}\n${r.length} emiten cocok\n\n`;
    const foot = `\n_Data tertunda ±10 menit · Ewoks Academy_`;
    let body = '';
    for (const x of r.slice(0, 25)) {
        const line = `• *${x.ticker}* ${tpIdr(x.price)} (${x.chg == null ? '-' : (x.chg >= 0 ? '+' : '') + x.chg.toFixed(2) + '%'}) S:${tpIdr(x.support)} R:${tpIdr(x.resist)}\n`;
        if ((head + body + line + foot).length > 1700) break;
        body += line;
    }
    if (r.length > body.split('\n').length - 1) body += `…dan ${r.length - (body.split('\n').length - 1)} lainnya (unduh Excel untuk lengkap)\n`;
    window.open(`https://wa.me/?text=${encodeURIComponent(head + body + foot)}`, '_blank', 'noopener');
}

// --- Watchlist pribadi ---
function exportWatchlistExcel() {
    const d = (typeof watchlist !== 'undefined' ? watchlist : []).map((w) => {
        const q = typeof getIdxQuote === 'function' ? getIdxQuote(w.ticker) : null;
        return { Kode: w.ticker, 'Target Beli': Number(w.price) || '', 'Harga Terakhir': q && q.price != null ? Math.round(q.price) : '', Catatan: w.note || '', 'Foreign Flow': w.foreign || '' };
    });
    tpExportExcel(d, 'Watchlist', `Watchlist_Ewoks_${tpStamp()}`);
}
function exportWatchlistWA() {
    if (typeof watchlist === 'undefined' || !watchlist.length) { showToast('Watchlist masih kosong.', 'warning'); return; }
    let msg = '*WATCHLIST EWOKS*\n\n';
    watchlist.forEach((w) => {
        const q = typeof getIdxQuote === 'function' ? getIdxQuote(w.ticker) : null;
        msg += `• *${w.ticker}* target ${tpIdr(w.price)}${q && q.price != null ? ` | kini ${tpIdr(q.price)}` : ''}\n  ${w.note || '-'}${w.foreign ? ` | Foreign: ${w.foreign}` : ''}\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}
