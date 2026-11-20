/* Jurnal trading multi-pasar (Saham Global, Kripto, Forex). Disimpan di localStorage peramban ini (ewoks_journal_multi). */
(function () {
    'use strict';
    var KEY = 'ewoks_journal_multi';
    var BASE = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function num(v, d) { return Number.isFinite(v) ? v.toLocaleString('id-ID', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) : '—'; }
    var MK = { global: 'Saham Global', crypto: 'Kripto', forex: 'Forex' };
    var UNIT = { global: 'Jumlah saham', crypto: 'Jumlah koin', forex: 'Ukuran (lot)' };
    var HINT = { global: ['AAPL', 'NVDA', 'TSLA', 'SPY', 'QQQ', 'MSFT'], crypto: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'PAXG'], forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'AUDUSD', 'USDCAD'] };
    var J = [], filt = 'all', rates = null;
    try { J = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(J)) J = []; } catch (_) { J = []; }
    var warned = false;
    function save() { try { localStorage.setItem(KEY, JSON.stringify(J)); return true; } catch (_) { if (!warned) { warned = true; alert('Penyimpanan peramban penuh atau mode privat. Gunakan Ekspor untuk menyimpan cadangan.'); } return false; } }
    fetch(BASE + 'assets/data/forex.json').then(function (r) { return r.json(); }).then(function (d) { rates = {}; d.items.forEach(function (i) { rates[i.k] = i.price; }); render(); }).catch(function () {});
    function toUsd(ccy) {
        if (ccy === 'USD') return 1; if (!rates) return null;
        if (rates[ccy + 'USD']) return rates[ccy + 'USD']; if (rates['USD' + ccy]) return 1 / rates['USD' + ccy]; return null;
    }
    function fxInfo(sym) {
        sym = sym.toUpperCase().replace(/[^A-Z]/g, '');
        if (sym === 'XAUUSD') return { pip: 0.1, contract: 100, quote: 'USD' };
        if (sym === 'XAGUSD') return { pip: 0.01, contract: 5000, quote: 'USD' };
        var q = sym.slice(3, 6); return { pip: q === 'JPY' ? 0.01 : 0.0001, contract: 100000, quote: q || 'USD' };
    }
    function pnlOf(t, exit) {
        var dir = t.side === 'short' ? -1 : 1, diff = (exit - t.entry) * dir;
        if (t.market === 'forex') { var fi = fxInfo(t.sym), qu = toUsd(fi.quote); if (qu == null) return null; return diff * t.size * fi.contract * qu; }
        return diff * t.size;
    }
    function calc(t) {
        var p = pnlOf(t, t.exit); if (p == null) return { net: null };
        var net = p - (t.fee || 0), risk = t.sl ? Math.abs(pnlOf(t, t.sl) || 0) : 0;
        var pips = t.market === 'forex' ? (t.exit - t.entry) * (t.side === 'short' ? -1 : 1) / fxInfo(t.sym).pip : null;
        return { net: net, r: risk > 0 ? net / risk : null, pips: pips };
    }
    function stats(list) {
        var rows = list.map(function (t) { return calc(t).net; }).filter(function (v) { return v != null; });
        var w = rows.filter(function (v) { return v > 0; }), l = rows.filter(function (v) { return v < 0; });
        var gw = w.reduce(function (a, b) { return a + b; }, 0), gl = Math.abs(l.reduce(function (a, b) { return a + b; }, 0));
        var eq = 0, peak = 0, mdd = 0; rows.forEach(function (v) { eq += v; peak = Math.max(peak, eq); mdd = Math.min(mdd, eq - peak); });
        var rs = list.map(function (t) { return calc(t).r; }).filter(function (v) { return v != null; });
        return { n: rows.length, win: rows.length ? w.length / rows.length * 100 : 0, net: eq, pf: gl ? gw / gl : (gw ? Infinity : 0), mdd: mdd, avgR: rs.length ? rs.reduce(function (a, b) { return a + b; }, 0) / rs.length : null, exp: rows.length ? eq / rows.length : 0, eq: rows.reduce(function (acc, v) { acc.push((acc.length ? acc[acc.length - 1] : 0) + v); return acc; }, []) };
    }
    function usd(v) { return v == null ? '—' : (v < 0 ? '-$' : '$') + num(Math.abs(v), 2); }
    function eqSvg(a) {
        if (a.length < 2) return '<p class="text-xs text-slate-400">Grafik ekuitas muncul setelah minimal 2 transaksi.</p>';
        var w = 600, h = 110, mn = Math.min(0, Math.min.apply(null, a)), mx = Math.max(0, Math.max.apply(null, a)), r = mx - mn || 1;
        var pts = a.map(function (v, i) { return (i / (a.length - 1) * w).toFixed(1) + ',' + (h - 6 - (v - mn) / r * (h - 12)).toFixed(1); }).join(' ');
        var zy = (h - 6 - (0 - mn) / r * (h - 12)).toFixed(1), up = a[a.length - 1] >= 0;
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="w-full h-28" preserveAspectRatio="none"><line x1="0" x2="' + w + '" y1="' + zy + '" y2="' + zy + '" stroke="#cbd5e1" stroke-dasharray="4"/><polyline fill="none" stroke="' + (up ? '#10b981' : '#f43f5e') + '" stroke-width="2.5" points="' + pts + '"/></svg>';
    }
    function render() {
        var list = J.filter(function (t) { return filt === 'all' || t.market === filt; }).sort(function (a, b) { return (a.date || '').localeCompare(b.date || '') || a.id - b.id; });
        var s = stats(list);
        $('jm-stats').innerHTML = [['Transaksi', s.n], ['Win rate', num(s.win, 1) + '%'], ['Net P&L', '<span class="' + (s.net >= 0 ? 'text-emerald-600' : 'text-rose-600') + '">' + usd(s.net) + '</span>'], ['Profit factor', s.pf === Infinity ? '∞' : num(s.pf, 2)], ['Rata-rata per trade', usd(s.exp)], ['Max drawdown', '<span class="text-rose-600">' + usd(s.mdd) + '</span>'], ['Rata-rata R', s.avgR == null ? '—' : num(s.avgR, 2) + 'R']]
            .map(function (x) { return '<div class="jm-card"><div class="text-[10px] font-bold text-slate-400">' + x[0] + '</div><div class="text-lg font-black text-slate-900 mt-1">' + x[1] + '</div></div>'; }).join('');
        $('jm-eq').innerHTML = eqSvg(s.eq);
        $('jm-tabs').querySelectorAll('[data-f]').forEach(function (b) { b.classList.toggle('on', b.dataset.f === filt); });
        var rows = list.slice().reverse().map(function (t) {
            var c = calc(t), pos = (c.net || 0) >= 0;
            return '<tr class="border-t border-slate-100"><td class="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">' + esc(t.date) + '</td><td class="px-3 py-2"><b>' + esc(t.sym) + '</b><div class="text-[10px] text-slate-400">' + MK[t.market] + ' · ' + (t.side === 'short' ? 'Short' : 'Long') + '</div></td><td class="px-3 py-2 text-right text-xs">' + num(t.entry, t.entry < 10 ? 5 : 2) + ' → ' + num(t.exit, t.exit < 10 ? 5 : 2) + '<div class="text-[10px] text-slate-400">ukuran ' + num(t.size, t.market === 'forex' ? 2 : 4) + (c.pips != null ? ' · ' + num(c.pips, 1) + ' pip' : '') + '</div></td><td class="px-3 py-2 text-right font-black ' + (pos ? 'text-emerald-600' : 'text-rose-600') + '">' + usd(c.net) + (c.r != null ? '<div class="text-[10px] font-bold">' + num(c.r, 2) + 'R</div>' : '') + '</td><td class="px-3 py-2 text-xs text-slate-500 hidden md:table-cell">' + esc([t.reason, t.emotion].filter(Boolean).join(' · ')) + (t.note ? '<div class="text-[11px] text-slate-400">' + esc(t.note) + '</div>' : '') + '</td><td class="px-3 py-2 text-right"><button type="button" data-del="' + t.id + '" class="text-slate-300 hover:text-rose-500" aria-label="Hapus"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        $('jm-body').innerHTML = rows || '<tr><td colspan="6" class="p-8 text-center text-sm text-slate-400">Belum ada catatan. Isi form di atas lalu simpan.</td></tr>';
        $('jm-forexnote').classList.toggle('hidden', !J.some(function (t) { return t.market === 'forex'; }) || rates != null);
    }
    function sync() {
        var m = $('jm-market').value;
        $('jm-unit').textContent = UNIT[m];
        $('jm-hints').innerHTML = HINT[m].map(function (h) { return '<option value="' + h + '">'; }).join('');
        $('jm-fee-l').textContent = 'Biaya total (USD, opsional)';
    }
    function add() {
        var t = { id: Date.now(), date: $('jm-date').value, market: $('jm-market').value, sym: $('jm-sym').value.toUpperCase().trim().replace(/\s+/g, ''), side: $('jm-side').value, entry: parseFloat($('jm-entry').value), exit: parseFloat($('jm-exit').value), size: parseFloat($('jm-size').value), fee: parseFloat($('jm-fee').value) || 0, sl: parseFloat($('jm-sl').value) || null, reason: $('jm-reason').value, emotion: $('jm-emotion').value, note: $('jm-note').value.trim().slice(0, 300) };
        if (!t.date || !t.sym || !(t.entry > 0) || !(t.exit > 0) || !(t.size > 0)) { $('jm-msg').textContent = 'Lengkapi tanggal, instrumen, harga masuk, harga keluar, dan ukuran.'; $('jm-msg').className = 'text-xs font-bold text-rose-600'; return; }
        J.push(t); save(); $('jm-msg').textContent = 'Tersimpan di peramban ini.'; $('jm-msg').className = 'text-xs font-bold text-emerald-600';
        ['jm-sym', 'jm-entry', 'jm-exit', 'jm-size', 'jm-fee', 'jm-sl', 'jm-note'].forEach(function (id) { $(id).value = ''; }); render();
    }
    function dl(name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
    function today() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); }
    document.addEventListener('DOMContentLoaded', function () {
        var m = (location.search.match(/m=(\w+)/) || [])[1]; if (m === 'bitcoin') m = 'crypto'; if (MK[m]) $('jm-market').value = m;
        $('jm-date').value = today(); sync(); render();
        $('jm-market').addEventListener('change', sync);
        $('jm-save').addEventListener('click', add);
        $('jm-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { filt = b.dataset.f; render(); } });
        $('jm-body').addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (!b || !confirm('Hapus catatan ini?')) return; J = J.filter(function (t) { return String(t.id) !== b.dataset.del; }); save(); render(); });
        $('jm-export').addEventListener('click', function () { dl('Ewoks_Jurnal_Pasar_' + today() + '.json', JSON.stringify({ app: 'ewoks-journal-multi', v: 1, items: J }, null, 1), 'application/json'); });
        $('jm-csv').addEventListener('click', function () {
            var head = 'tanggal,pasar,instrumen,arah,entry,exit,ukuran,biaya_usd,sl,net_usd,R,alasan,emosi,catatan';
            var csv = [head].concat(J.map(function (t) { var c = calc(t); return [t.date, MK[t.market], t.sym, t.side, t.entry, t.exit, t.size, t.fee, t.sl || '', c.net == null ? '' : c.net.toFixed(2), c.r == null ? '' : c.r.toFixed(2), t.reason, t.emotion, (t.note || '').replace(/[\r\n,]+/g, ' ')].join(','); })).join('\n');
            dl('Ewoks_Jurnal_Pasar_' + today() + '.csv', csv, 'text/csv');
        });
        $('jm-import').addEventListener('change', function (e) {
            var f = e.target.files[0]; if (!f) return; var r = new FileReader();
            r.onload = function () { try { var d = JSON.parse(r.result), items = Array.isArray(d) ? d : d.items; var ids = {}; J.forEach(function (t) { ids[t.id] = 1; }); var add = 0; items.forEach(function (t) { if (t && t.sym && MK[t.market] && !ids[t.id]) { J.push(t); add++; } }); save(); render(); alert(add + ' catatan diimpor (duplikat dilewati).'); } catch (_) { alert('File tidak valid.'); } };
            r.readAsText(f); e.target.value = '';
        });
    });
})();
