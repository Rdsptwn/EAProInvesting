// --- WATCHLIST ---
function addWatchlist() {
    const ticker = document.getElementById('wl-ticker').value.toUpperCase().trim().replace(/\.JK$/, '');
    const price = document.getElementById('wl-price').value;
    const note = document.getElementById('wl-note').value;
    const foreign = document.getElementById('wl-foreign').value; 
    
    if(!/^[A-Z0-9]{2,6}$/.test(ticker) || !price || !(parseFloat(price) > 0)) {
        showToast("Kode emiten (2–6 huruf/angka, tanpa spasi) dan Harga Target Beli wajib diisi dengan valid!", "error");
        return;
    }
    
    watchlist.push({ id: Date.now(), ticker, price, note, foreign });
    localStorage.setItem('ewoks_watchlist', JSON.stringify(watchlist));
    
    document.getElementById('wl-ticker').value = '';
    document.getElementById('wl-price').value = '';
    document.getElementById('wl-note').value = '';
    document.getElementById('wl-foreign').value = '';
    
    showToast(`${ticker} berhasil ditambahkan ke Watchlist!`, "success");
    renderWatchlist();
}

function clearWatchlist() {
    if(confirm("Yakin ingin menghapus seluruh data Watchlist Anda?")) {
        watchlist = [];
        localStorage.removeItem('ewoks_watchlist');
        renderWatchlist();
        showToast("Watchlist berhasil dibersihkan", "success");
    }
}

// Cadangan harga: seluruh emiten dari idx-screener.json (snapshot harian punya lebih sedikit emiten).
let __wlScr = null;
function wlLoadScr() {
    if (__wlScr !== null) return;
    __wlScr = {};
    const V = encodeURIComponent(window.EWOKS_ASSET_V || '1'), B = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    fetch(B + 'assets/data/idx-screener.json?v=' + V).then(r => r.json()).then(d => {
        (d.rows || []).forEach(r => { __wlScr[r[0]] = { price: r[1], changePct: r[3], date: r[10] }; });
        renderWatchlist(true);
    }).catch(() => {});
}
// Pasar sudah tutup? (WIB: Sabtu-Minggu, atau Senin-Jumat setelah 16:00)
function wlMarketClosed() {
    const w = new Date(Date.now() + 7 * 3600e3), d = w.getUTCDay(), h = w.getUTCHours() + w.getUTCMinutes() / 60;
    return d === 0 || d === 6 || h >= 16 || h < 9;
}
function wlBowHtml(w, cur, chg) {
    const b = w.bow; if (!b) return '';
    const f = n => Math.round(n).toLocaleString('id-ID');
    let st, cls;
    if (cur == null) { st = 'Menunggu data harga'; cls = 'text-slate-500'; }
    else if (cur <= b.cl) { st = '❌ Jebol Strict CL'; cls = 'text-red-600'; }
    else if (cur >= b.tp) { st = '🎯 TP tercapai'; cls = 'text-emerald-600'; }
    else if (cur >= b.lo && cur <= b.hi) { st = '🟢 Masih di area BoW'; cls = 'text-emerald-600'; }
    else if (cur > b.hi) { st = '⬆️ Naik meninggalkan area BoW'; cls = 'text-sky-600'; }
    else { st = '⚠️ Di bawah area BoW, dekat CL'; cls = 'text-amber-600'; }
    const since = cur != null && b.ref ? (cur - b.ref) / b.ref * 100 : null;
    const arrow = v => v == null ? '-' : (v >= 0 ? '▲ +' : '▼ ') + v.toFixed(2) + '%';
    const clr = v => v == null ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-500';
    const closed = wlMarketClosed();
    return `<div class="mt-2 p-2 rounded-xl border border-emerald-100 bg-emerald-50/40 text-[10px] font-bold text-slate-600">
        <p class="font-black ${cls}">${st}</p>
        <p>Area BoW ${f(b.lo)} - ${f(b.hi)} · TP ${f(b.tp)} · CL ${f(b.cl)}</p>
        <p>${closed ? 'Penutupan' : 'Hari ini'}: <span class="${clr(chg)}">${arrow(chg)}</span> · Sejak dipantau (Rp ${f(b.ref)}): <span class="${clr(since)}">${arrow(since)}</span></p>
    </div>`;
}

function renderWatchlist(isTick = false) {
    wlLoadScr();
    const container = document.getElementById('watchlist-container');
    if(watchlist.length === 0) {
        if(!isTick) container.innerHTML = `<div class="col-span-full p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-2xl font-bold bg-white">Watchlist masih kosong. Mulai tambahkan pantauan emiten Anda!</div>`;
        return;
    }

    // Harga asli dari snapshot/live Yahoo (.JK). Tidak ada lagi harga simulasi acak.
    watchlist.forEach(w => {
        const q = typeof getIdxQuote === 'function' ? getIdxQuote(w.ticker) : null;
        const q2 = q && q.price != null ? q : (__wlScr && __wlScr[w.ticker]) || null;
        w.currentPrice = q2 && q2.price != null ? Number(q2.price) : null;
        w.changePct = q2 && q2.changePct != null ? Number(q2.changePct) : null;
    });
    container.innerHTML = watchlist.map(w => {
        const target = parseFloat(w.price);
        const current = w.currentPrice;
        const hasPrice = current != null && Number.isFinite(current);
        // Target BELI: tercapai saat harga turun ke / di bawah target
        const isHit = hasPrice && Number.isFinite(target) && current <= target;
        const chgTxt = hasPrice && w.changePct != null ? ` (${w.changePct >= 0 ? '+' : ''}${w.changePct.toFixed(2)}%)` : '';
        
        return `
        <div class="bg-white border ${isHit ? 'border-emerald-400 shadow-emerald-100' : 'border-slate-200'} rounded-2xl p-5 shadow-sm relative group hover:border-amber-400 transition-colors flex flex-col h-full dark-mode-card">
            <button onclick="deleteWatchlist(${w.id})" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors z-10"><i class="fas fa-times"></i></button>
            ${isHit ? `<div class="absolute -top-3 -right-2 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-10 animate-bounce">🎯 TARGET HIT!</div>` : ''}
            
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 ${isHit ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} rounded-xl flex items-center justify-center font-black cursor-pointer hover:opacity-80" onclick="openTVChart('${String(w.ticker).replace(/[^A-Z0-9]/gi,'')}')" title="Buka Chart Live">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div>
                    <h4 class="font-black text-slate-900 text-lg leading-none">${escapeHtml(w.ticker)}</h4>
                    <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Target Beli: <span class="text-emerald-600">Rp ${Number(w.price).toLocaleString('id-ID')}</span></p>
                    <p class="text-[10px] font-bold mt-0.5 ${isHit ? 'text-emerald-500' : 'text-slate-500'}">${hasPrice ? `Harga: Rp ${Math.round(current).toLocaleString('id-ID')}${chgTxt}` : 'Harga: menunggu data pasar'}</p>
                </div>
            </div>
            
            ${wlBowHtml(w, hasPrice ? current : null, w.changePct)}
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex-grow mt-2">
                <p class="text-xs text-slate-600 italic">"${escapeHtml(w.note || 'Tidak ada catatan')}"</p>
            </div>

            ${w.foreign ? `
            <div class="bg-indigo-50 p-2 rounded-xl border border-indigo-100 flex items-center gap-2 mt-2">
                <i class="fas fa-globe text-indigo-500 text-[10px]"></i>
                <span class="text-[10px] font-black text-indigo-700 uppercase">Foreign: ${escapeHtml(w.foreign)}</span>
            </div>` : ''}

            <div class="grid grid-cols-2 gap-2 mt-4">
                <button onclick="openTVChart('${String(w.ticker).replace(/[^A-Z0-9]/gi,'')}')" class="w-full text-[10px] font-black text-slate-600 bg-slate-100 py-3 rounded-xl hover:bg-slate-200 transition-colors uppercase"><i class="fas fa-chart-pie mr-1"></i> Chart</button>
                <button onclick="showPage('kalkulator'); document.getElementById('calc-name').value='${String(w.ticker).replace(/[^A-Z0-9]/gi,'')}'; document.getElementById('calc-price').value='${Number(w.price) || 0}'; runSimpleCalc();" class="w-full text-[10px] font-black text-blue-600 bg-blue-50 py-3 rounded-xl hover:bg-blue-100 transition-colors uppercase">Trading Plan</button>
            </div>
        </div>
    `}).join('');
}

function deleteWatchlist(id) {
    watchlist = watchlist.filter(w => w.id !== id);
    localStorage.setItem('ewoks_watchlist', JSON.stringify(watchlist));
    renderWatchlist();
    showToast("Item dihapus dari Watchlist", "success");
}
