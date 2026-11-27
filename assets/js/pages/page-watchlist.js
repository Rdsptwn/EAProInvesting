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

// Harga cadangan/semua pasar dari snapshot JSON: IHSG (idx-screener), Kripto, Forex, Saham Global. Disegarkan tiap 5 menit.
let __wlScr = null, __wlMk = { kripto: {}, forex: {}, global: {}, komoditas: {}, rd: {} }, __wlAt = 0;
function wlLoadScr() {
    const missing = __wlScr !== null && Date.now() - __wlAt > 15000 && watchlist.some(w => (w.mk || 'idx') !== 'idx' && !(__wlMk[w.mk] && __wlMk[w.mk][w.ticker]));
    if (__wlScr !== null && Date.now() - __wlAt < 300000 && !missing) return;
    const first = __wlScr === null; __wlScr = __wlScr || {}; __wlAt = Date.now();
    const V = encodeURIComponent(window.EWOKS_ASSET_V || '1') + '.' + Math.floor(Date.now() / 300000), B = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    const get = n => fetch(B + 'assets/data/' + n + '?v=' + V).then(r => r.json());
    const need = new Set(watchlist.map(w => w.mk || 'idx'));
    const jobs = [];
    if (first || need.has('idx')) jobs.push(get('idx-screener.json').then(d => { (d.rows || []).forEach(r => { __wlScr[r[0]] = { price: r[1], changePct: r[3], date: r[10] }; }); }).catch(() => {}).then(() => get('live-idx.json').then(l => { Object.keys(l.q || {}).forEach(k => { const x = l.q[k], o = __wlScr[k]; if (o && x && x[0] > 0) { o.price = x[0]; o.changePct = x[2]; } }); }).catch(() => {})));
    if (need.has('kripto')) jobs.push(get('crypto.json').then(d => { (d.items || []).forEach(x => { __wlMk.kripto[x.k] = { price: x.price, changePct: x.chg, date: x.time }; }); }).catch(() => {}));
    if (need.has('forex')) jobs.push(get('forex.json').then(d => { (d.items || []).forEach(x => { __wlMk.forex[x.k] = { price: x.price, changePct: x.chg, date: x.time }; }); }).catch(() => {}));
    if (need.has('global')) jobs.push(get('global-screener.json').then(d => { (d.rows || []).forEach(r => { __wlMk.global[r[0]] = { price: r[1], changePct: r[3], date: r[9] }; }); }).catch(() => {}).then(() => get('live-global.json').then(l => { Object.keys(l.q || {}).forEach(k => { const x = l.q[k], o = __wlMk.global[k]; if (o && x && x[0] > 0) { o.price = x[0]; o.changePct = x[2]; } }); }).catch(() => {})));
    if (need.has('komoditas')) jobs.push(get('global-commodities.json').then(d => { (d.items || []).forEach(x => { __wlMk.komoditas[x.id] = { price: x.price, changePct: x.chg, chg1m: x.chg1m, u: x.u || '', n: x.n, date: x.time }; }); }).catch(() => {}));
    if (need.has('rd')) jobs.push(get('pasar-global.json').then(d => { (d.instruments || []).forEach(x => { __wlMk.rd[x.ticker] = x; }); }).catch(() => {}));
    if (need.has('rd')) jobs.push(get('rd-nav.json').then(d => { __wlMk.rdNav = (d && d.funds) || {}; }).catch(() => {}));
    Promise.all(jobs).then(() => renderWatchlist(true));
}
// Format harga per pasar: IHSG Rp, Kripto/Global $, Forex tanpa simbol.
function wlFmt(w, v) {
    if (v == null || !Number.isFinite(Number(v))) return '-';
    v = Number(v); const mk = w.mk || 'idx';
    if (mk === 'komoditas') { const it = __wlMk.komoditas[w.ticker]; return v.toLocaleString('en-US', { minimumFractionDigits: v >= 1000 ? 0 : v >= 10 ? 2 : 4, maximumFractionDigits: v >= 1000 ? 0 : v >= 10 ? 2 : 4 }) + (it && it.u ? ' ' + it.u : ''); }
    if (mk === 'idx') return 'Rp ' + Math.round(v).toLocaleString('id-ID');
    const d = mk === 'forex' ? (/JPY|IDR|KRW|INR|XAU|XAG/.test(w.ticker) ? 3 : 5) : (v >= 1000 ? 2 : v >= 1 ? 3 : v >= 0.01 ? 5 : 8);
    return (mk === 'forex' ? '' : '$') + v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
const WL_MK_LABEL = { kripto: 'Kripto', forex: 'Forex', global: 'Saham Global', komoditas: 'Komoditas/Kurs/Indeks', rd: 'Reksa Dana' };
function wlChartUrl(w) {
    if (w.mk === 'rd') return 'pasar-global.html?q=' + encodeURIComponent(w.ticker);
    if (w.mk === 'komoditas') { const it = __wlMk.komoditas[w.ticker]; return 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(({ gold: 'COMEX:GC1!', silver: 'COMEX:SI1!', brent: 'TVC:UKOIL', wti: 'TVC:USOIL', copper: 'COMEX:HG1!', gas: 'NYMEX:NG1!', usdidr: 'FX_IDC:USDIDR' })[w.ticker] || (it && it.n) || w.ticker); }
    const t = String(w.ticker).replace(/[^A-Z0-9.=-]/gi, '');
    const sym = w.mk === 'kripto' ? 'BINANCE:' + t + 'USDT' : w.mk === 'forex' ? (/^(XAU|XAG)/.test(t) ? 'OANDA:' + t : 'FX:' + t) : t;
    return 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(sym);
}
// Pasar sudah tutup? (WIB: Sabtu-Minggu, atau Senin-Jumat setelah 16:00)
function wlMarketClosed() {
    const w = new Date(Date.now() + 7 * 3600e3), d = w.getUTCDay(), h = w.getUTCHours() + w.getUTCMinutes() / 60;
    return d === 0 || d === 6 || h >= 16 || h < 9;
}
function wlBowHtml(w, cur, chg) {
    const b = w.bow; if (!b) return '';
    const f = n => wlFmt(w, n).replace(/^Rp /, '');
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
    const closed = (w.mk || 'idx') === 'idx' ? wlMarketClosed() : null;
    return `<div class="mt-2 p-2 rounded-xl border border-emerald-100 bg-emerald-50/40 text-[10px] font-bold text-slate-600">
        <p class="font-black ${cls}">${st}</p>
        <p>Area BoW ${f(b.lo)} - ${f(b.hi)} · TP ${f(b.tp)} · CL ${f(b.cl)}</p>
        <p>${closed === null ? 'Perubahan terakhir' : closed ? 'Penutupan' : 'Hari ini'}: <span class="${clr(chg)}">${arrow(chg)}</span> · Sejak dipantau (${wlFmt(w, b.ref)}): <span class="${clr(since)}">${arrow(since)}</span></p>
    </div>`;
}

function wlRdSpark(sr) {
    if (!sr || !sr.v || sr.v.length < 8) return '';
    const v = sr.v, lo = Math.min(...v), hi = Math.max(...v), W = 220, H = 40, sp = hi - lo || 1;
    const pts = v.map((y, i) => (i / (v.length - 1) * W).toFixed(1) + ',' + (H - 3 - (y - lo) / sp * (H - 6)).toFixed(1)).join(' ');
    const up = v[v.length - 1] >= v[0];
    return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-10 mt-1" preserveAspectRatio="none" role="img" aria-label="Grafik NAB mingguan"><polyline points="${pts}" fill="none" stroke="${up ? '#059669' : '#ef4444'}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}
function wlRdHtml(w) {
    const x = __wlMk.rd[w.ticker]; if (!x) return '<p class="mt-2 text-[10px] font-bold text-slate-500">Menunggu data database reksa dana…</p>';
    const nv = (__wlMk.rdNav || {})[String(x.id)];
    const pc = v => v == null ? '-' : '<span class="' + (v >= 0 ? 'text-emerald-600' : 'text-red-500') + '">' + (v >= 0 ? '+' : '') + v + '%</span>';
    let nab = '<p class="font-medium text-slate-400">NAB harian untuk fund ini belum tersedia di dataset; cek NAB terbaru di aplikasi manajer investasi.</p>';
    if (nv) {
        const r = nv.ret || {};
        nab = `<p>NAB <b>${Number(nv.v).toLocaleString('id-ID', { maximumFractionDigits: 4 })}</b> (${escapeHtml(nv.d)}) · harian ${pc(+nv.c1d.toFixed(2))}</p>
        <p>1B ${pc(r['1b'])} · 3B ${pc(r['3b'])} · 1T ${pc(r['1t'])} · 3T ${pc(r['3t'])} · 5T ${pc(r['5t'])}</p>${wlRdSpark(nv.s)}
        <p class="font-medium text-slate-400">Grafik NAB mingguan sampai 5 tahun. Sumber dataset publik tidak resmi, cek ke manajer investasi. Return masa lalu tidak menjamin hasil ke depan.</p>`;
    }
    const asof = x.dataAsOf ? ` (per ${escapeHtml(x.dataAsOf)})` : '';
    return `<div class="mt-2 p-2 rounded-xl border border-sky-100 bg-sky-50/50 text-[10px] font-bold text-slate-600">
        <p class="font-black text-sky-700">${escapeHtml(x.assetClass || '')}</p>
        ${nab}
        <p>AUM ${escapeHtml(x.aum || '-')} · Risiko ${escapeHtml(x.risk || '-')}${x.expense != null ? ' · Expense ' + x.expense + '%' : ''}</p>
    </div>`;
}
function wlKomHtml(w) {
    const it = __wlMk.komoditas[w.ticker]; if (!it || it.chg1m == null) return '';
    const v = it.chg1m; return `<p class="mt-1 text-[10px] font-bold text-slate-500">1 bulan: <span class="${v >= 0 ? 'text-emerald-600' : 'text-red-500'}">${v >= 0 ? '▲ +' : '▼ '}${Number(v).toFixed(2)}%</span></p>`;
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
        const mk = w.mk || 'idx';
        const q = mk === 'idx' && typeof getIdxQuote === 'function' ? getIdxQuote(w.ticker) : null;
        const q2 = mk === 'rd' ? null : mk !== 'idx' ? (__wlMk[mk] && __wlMk[mk][w.ticker]) || null : (q && q.price != null ? q : (__wlScr && __wlScr[w.ticker]) || null);
        w.currentPrice = q2 && q2.price != null ? Number(q2.price) : null;
        w.changePct = q2 && q2.changePct != null ? Number(q2.changePct) : null;
    });
    const card = w => {
        const target = parseFloat(w.price);
        const current = w.currentPrice;
        const hasPrice = current != null && Number.isFinite(current);
        // Status: TP tercapai = TARGET HIT; harga <= CL = KENA CL; harga <= target beli = di area beli (belum target).
        const b = w.bow;
        const st = !hasPrice ? '' : b && Number.isFinite(b.tp) && current >= b.tp ? 'tp' : b && Number.isFinite(b.cl) && current <= b.cl ? 'cl' : Number.isFinite(target) && current <= target ? 'buy' : '';
        const isHit = st === 'tp', isCl = st === 'cl', isBuy = st === 'buy';
        const badge = isHit ? ['bg-emerald-500', '🎯 TARGET HIT (TP)', ' animate-bounce'] : isCl ? ['bg-red-500', '🛑 KENA CL', ''] : isBuy ? ['bg-amber-500', '📍 DI AREA BELI', ''] : null;
        const chgTxt = hasPrice && w.changePct != null ? ` (${w.changePct >= 0 ? '+' : ''}${w.changePct.toFixed(2)}%)` : '';
        
        return `
        <div class="bg-white border ${isHit ? 'border-emerald-400 shadow-emerald-100' : isCl ? 'border-red-400' : isBuy ? 'border-amber-400' : 'border-slate-200'} rounded-2xl p-5 shadow-sm relative group hover:border-amber-400 transition-colors flex flex-col h-full dark-mode-card">
            <button onclick="deleteWatchlist(${w.id})" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors z-10"><i class="fas fa-times"></i></button>
            ${badge ? `<div class="absolute -top-3 -right-2 ${badge[0]} text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-10${badge[2]}">${badge[1]}</div>` : ''}
            
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 ${isHit ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} rounded-xl flex items-center justify-center font-black cursor-pointer hover:opacity-80" onclick="${w.mk && w.mk !== 'idx' ? `window.open('${wlChartUrl(w)}','_blank','noopener')` : `openTVChart('${String(w.ticker).replace(/[^A-Z0-9]/gi,'')}')`}" title="Buka Chart Live">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div>
                    <h4 class="font-black text-slate-900 text-lg leading-none">${escapeHtml(w.name || (w.mk === 'komoditas' && __wlMk.komoditas[w.ticker] ? __wlMk.komoditas[w.ticker].n : w.ticker))}</h4>
                    <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">${w.mk === 'rd' ? 'Reksa dana · ' + escapeHtml(w.ticker) : 'Target Beli: <span class="text-emerald-600">' + (Number.isFinite(parseFloat(w.price)) ? wlFmt(w, w.price) : 'belum diatur') + '</span>'}${w.mk && w.mk !== 'idx' ? ` <span class="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 normal-case">${WL_MK_LABEL[w.mk] || ''}</span>` : ''}</p>
                    <p class="text-[10px] font-bold mt-0.5 ${isHit ? 'text-emerald-500' : 'text-slate-500'}">${w.mk === 'rd' ? '' : hasPrice ? `Harga: ${wlFmt(w, current)}${chgTxt}` : 'Harga: menunggu data pasar'}</p>
                </div>
            </div>
            
            ${w.mk === 'rd' ? wlRdHtml(w) : wlBowHtml(w, hasPrice ? current : null, w.changePct)}
            ${w.mk === 'komoditas' ? wlKomHtml(w) : ''}
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex-grow mt-2">
                <p class="text-xs text-slate-600 italic">"${escapeHtml(w.note || 'Tidak ada catatan')}"</p>
            </div>

            ${w.foreign ? `
            <div class="bg-indigo-50 p-2 rounded-xl border border-indigo-100 flex items-center gap-2 mt-2">
                <i class="fas fa-globe text-indigo-500 text-[10px]"></i>
                <span class="text-[10px] font-black text-indigo-700 uppercase">Foreign: ${escapeHtml(w.foreign)}</span>
            </div>` : ''}

            <div class="grid grid-cols-2 gap-2 mt-4">
                <button onclick="${w.mk && w.mk !== 'idx' ? `window.open('${wlChartUrl(w)}','_blank','noopener')` : `openTVChart('${String(w.ticker).replace(/[^A-Z0-9]/gi,'')}')`}" class="w-full text-[10px] font-black text-slate-600 bg-slate-100 py-3 rounded-xl hover:bg-slate-200 transition-colors uppercase"><i class="fas fa-chart-pie mr-1"></i> Chart</button>
                <button onclick="showPage('kalkulator'); document.getElementById('calc-name').value='${String(w.ticker).replace(/[^A-Z0-9]/gi,'')}'; document.getElementById('calc-price').value='${Number(w.price) || 0}'; runSimpleCalc();" class="w-full text-[10px] font-black text-blue-600 bg-blue-50 py-3 rounded-xl hover:bg-blue-100 transition-colors uppercase">Trading Plan</button>
            </div>
        </div>
    `};
    // Dikelompokkan per pasar supaya IHSG, Global, Kripto, Forex, dst. tidak tercampur.
    const GROUPS = [['idx', 'IHSG (Saham Indonesia)'], ['global', 'Saham Global'], ['kripto', 'Kripto'], ['forex', 'Forex'], ['komoditas', 'Komoditas, Kurs & Indeks'], ['rd', 'Reksa Dana']];
    container.innerHTML = GROUPS.map(([k, label]) => {
        const items = watchlist.filter(w => (w.mk || 'idx') === k);
        return items.length ? `<h3 class="col-span-full text-sm font-black text-slate-700 mt-2 first:mt-0">${label} <span class="text-slate-400 font-bold">(${items.length})</span></h3>` + items.map(card).join('') : '';
    }).join('');
}

function deleteWatchlist(id) {
    watchlist = watchlist.filter(w => w.id !== id);
    localStorage.setItem('ewoks_watchlist', JSON.stringify(watchlist));
    renderWatchlist();
    showToast("Item dihapus dari Watchlist", "success");
}
