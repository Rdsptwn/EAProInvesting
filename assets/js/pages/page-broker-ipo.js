/* Broker: tab Database IPO & Penjamin */
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const V = () => encodeURIComponent(window.EWOKS_ASSET_V || '1');
    const base = () => (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let items = [], perf = {}, perfAsOf = '', scr = {}, scrDate = {}, scrBuilt = 0, shown = 50, loaded = false, open = null;

    window.brokerTab = function (t) {
        const ipo = t === 'ipo';
        $('broker-pane-list').classList.toggle('hidden', ipo);
        $('broker-pane-ipo').classList.toggle('hidden', !ipo);
        $('bk-tab-list').classList.toggle('on', !ipo);
        $('bk-tab-ipo').classList.toggle('on', ipo);
        if (ipo && !loaded) load();
        try { history.replaceState(null, '', ipo ? '#ipo' : location.pathname + location.search); } catch (_) {}
    };

    const fx = (n, d = 0) => (Number.isFinite(n) ? Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
    const pct = (v) => (Number.isFinite(v) ? `<span class="${v >= 0 ? 'text-emerald-600' : 'text-rose-600'} font-black">${v >= 0 ? '+' : ''}${v.toLocaleString('id-ID', { maximumFractionDigits: v > 999 ? 0 : 1 })}%</span>` : '<span class="text-slate-300">—</span>');
    const dmy = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');
    const median = (a) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

    function enrich(x) {
        const p = perf[x.t], price = x.price;
        const o = { ...x, d1: null, ath: null, athDate: null, athG: null, cur: null, last: null, dd: null, curG: null, sf: 1 };
        if (p && price > 0) {
            const sf = p[7] > 0 ? p[7] : 1, base = price / sf; // harga IPO setara harga Yahoo (sudah disesuaikan split)
            o.sf = sf;
            const d1 = (p[1] / base - 1) * 100;
            const gap = x.date && p[0] ? Math.abs((new Date(p[0]) - new Date(x.date)) / 86400000) : 99;
            // hari-1 hanya ditampilkan bila bar Yahoo pertama = hari listing dan masih dalam batas auto reject
            o.d1 = gap <= 3 && d1 > -30 && d1 < 45 ? d1 : null;
            o.ath = p[2] * sf; o.athDate = p[3]; o.athG = (p[2] / base - 1) * 100;
            o.last = p[4] * sf; o.curG = (p[4] / base - 1) * 100; o.dd = (p[4] / p[2] - 1) * 100;
        } else if (scr[x.t] && price > 0) { o.last = scr[x.t]; o.curG = (scr[x.t] / price - 1) * 100; }
        o.cur = o.curG;
        const fl = ewoksStatusOf(x.t).filter((f) => f[0] !== 'GOCAP' || true);
        o.flags = fl;
        o.stat = fl.some((f) => f[0] !== 'GOCAP') ? 'bermasalah' : 'aktif';
        return o;
    }

    function filtered() {
        const y = $('ipo-year').value, q = $('ipo-q').value.trim().toLowerCase(), up = $('ipo-up').checked, st = $('ipo-status').value, so = $('ipo-sort').value;
        let a = items.map(enrich).filter((x) => (y === 'ALL' || (x.date || '').startsWith(y))
            && (!q || x.t.toLowerCase().includes(q) || (x.name || "").toLowerCase().includes(q) || x.lead.concat(x.syn).some((u) => u.toLowerCase().includes(q)))
            && (st === 'ALL' || (st === 'aktif' ? x.stat === 'aktif' : x.stat !== 'aktif'))
            && (!up || (Number.isFinite(x.cur) && x.cur > 0)));
        const key = { date: (x) => x.date || '', cur: (x) => x.cur, athg: (x) => x.athG, d1: (x) => x.d1, funds: (x) => x.fundsBn, loss: (x) => (Number.isFinite(x.cur) ? -x.cur : null) }[so];
        a.sort((m, n) => {
            const u = key(m), v = key(n);
            if (so === 'date') return String(v).localeCompare(String(u));
            if (u == null && v == null) return 0; if (u == null) return 1; if (v == null) return -1;
            return v - u;
        });
        return a;
    }

    function cards(a) {
        const w = a.filter((x) => Number.isFinite(x.cur));
        const up = w.filter((x) => x.cur > 0).length;
        const best = w.slice().sort((m, n) => n.cur - m.cur)[0];
        const bestAth = a.filter((x) => Number.isFinite(x.athG)).sort((m, n) => n.athG - m.athG)[0];
        const med = median(w.map((x) => x.cur));
        const c = (t, v, s) => `<div class="bg-white rounded-2xl border border-slate-200 p-3"><div class="text-[10px] font-black text-slate-400 uppercase">${t}</div><div class="text-xl font-black text-slate-800 mt-1">${v}</div><div class="text-[10px] text-slate-500 font-semibold mt-0.5">${s}</div></div>`;
        const bad = a.filter((x) => x.stat !== 'aktif').length;
        $('ipo-cards').innerHTML = c('Jumlah IPO', fx(a.length), `${a.filter((x) => x.price).length} punya harga IPO`)
            + c('Di atas harga IPO', w.length ? `${Math.round(up / w.length * 100)}%` : '—', `${up} dari ${w.length} yang punya harga sekarang`)
            + c('Median return sekarang', med == null ? '—' : pct(med), 'terhadap harga IPO')
            + c('Suspen / tak aktif', fx(bad), 'tetap ditampilkan sebagai rekam jejak')
            + c('Terbaik (ATH)', bestAth ? `${esc(bestAth.t)} ${pct(bestAth.athG)}` : (best ? `${esc(best.t)} ${pct(best.cur)}` : '—'), bestAth ? 'kenaikan tertinggi sejak IPO' : 'return sekarang tertinggi');
    }

    function uwTable(a) {
        const m = {};
        for (const x of a) for (const u of x.lead) { (m[u] = m[u] || []).push(x); }
        const rows = Object.entries(m).map(([u, xs]) => {
            const cur = xs.map((x) => x.cur).filter(Number.isFinite);
            return { u, n: xs.length, funds: xs.reduce((s, x) => s + (x.fundsBn || 0), 0), med: median(cur), win: cur.length ? cur.filter((v) => v > 0).length / cur.length : null, k: cur.length };
        }).sort((p, q) => q.n - p.n || q.funds - p.funds).slice(0, 12);
        $('ipo-uw').innerHTML = rows.length ? rows.map((r) => `<tr class="border-t border-slate-100"><td class="py-2 pr-3 font-extrabold text-slate-700">${esc(r.u)}</td><td class="py-2 pr-3 text-right font-black">${r.n}</td><td class="py-2 pr-3 text-right">${r.funds ? 'Rp' + fx(r.funds) + ' M' : '—'}</td><td class="py-2 pr-3 text-right">${r.med == null ? '—' : pct(r.med)}</td><td class="py-2 text-right">${r.win == null ? '—' : Math.round(r.win * 100) + '% <span class="text-slate-400">(' + r.k + ')</span>'}</td></tr>`).join('')
            : '<tr><td colspan="5" class="py-3 text-slate-400">Belum ada data penjamin.</td></tr>';
    }

    window.ipoToggle = function (t) { open = open === t ? null : t; ipoRender(); };

    window.ipoMore = function () { shown += 50; ipoRender(true); };

    window.ipoRender = function (keep) {
        if (keep !== true) shown = 50;
        const all = filtered(), a = all.slice(0, shown);
        cards(all); uwTable(all);
        const mb = $('ipo-more'); mb.classList.toggle('hidden', all.length <= shown); mb.textContent = `Tampilkan lebih banyak (${shown} dari ${all.length})`;
        $('ipo-body').innerHTML = a.map((x) => {
            const uw = x.lead.length ? esc(x.lead.join(', ')) : '<span class="text-slate-300">belum tercatat</span>';
            const main = `<tr class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer bg-white" onclick="ipoToggle('${x.t}')">
                <td class="px-4 py-3"><div class="font-black text-blue-600">${esc(x.t)}<div class="st-row">${ewoksStatusBadges(x.t)}</div></div><div class="text-[10px] text-slate-500 font-semibold max-w-[200px] truncate">${esc(x.name || "")}</div></td>
                <td class="px-3 py-3 whitespace-nowrap text-slate-600 font-semibold">${dmy(x.date)}</td>
                <td class="px-3 py-3 text-right font-black text-slate-800">${x.price ? 'Rp' + fx(x.price) : '—'}</td>
                <td class="px-3 py-3 text-right text-slate-600">${x.fundsBn ? 'Rp' + fx(x.fundsBn) + ' M' : '—'}</td>
                <td class="px-3 py-3 text-slate-600 font-semibold max-w-[220px]">${uw}</td>
                <td class="px-3 py-3 text-right">${pct(x.d1)}</td>
                <td class="px-3 py-3 text-right whitespace-nowrap">${Number.isFinite(x.ath) ? `<div class="font-bold text-slate-700">${fx(x.ath)}</div><div class="text-[10px]">${pct(x.athG)} · ${dmy(x.athDate)}</div>` : '<span class="text-slate-300">—</span>'}</td>
                <td class="px-3 py-3 text-right whitespace-nowrap">${Number.isFinite(x.last) ? `<div class="font-bold text-slate-700">${fx(x.last)}</div><div class="text-[10px]">${pct(x.curG)}${Number.isFinite(x.dd) ? ` · <span class="text-slate-400">dari ATH ${x.dd.toFixed(0)}%</span>` : ''}</div>` : '<span class="text-slate-300">—</span>'}</td>
            </tr>`;
            if (open !== x.t) return main;
            const src = (x.src || []).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener" class="text-blue-600 hover:underline">[${i + 1}]</a>`).join(' ');
            return main + `<tr class="bg-slate-50 border-b border-slate-200"><td colspan="8" class="px-4 py-3 text-[11px] text-slate-600 leading-relaxed">
                <b>${esc(x.name || "")}</b> · ${esc(x.sector || '—')} · papan ${esc(x.board || '—')} · saham ditawarkan ${x.shares ? fx(x.shares) : '—'}<br>
                <b>Penjamin pelaksana:</b> ${x.lead.length ? esc(x.lead.join(', ')) : 'belum tercatat'} · <b>Penjamin emisi lain:</b> ${x.syn.length ? esc(x.syn.join(', ')) : '—'}<br>
                ${x.flags.length ? x.flags.map((f) => `<b class="text-rose-600">${esc(ewoksStatusLabel(f[0]))}:</b> ${esc(f[1])}${f[2] ? ` <a href="${esc(f[2])}" target="_blank" rel="noopener" class="text-blue-600 hover:underline">[sumber]</a>` : ''}<br>`).join('') : ''}${x.note ? esc(x.note) + '<br>' : ''}${x.sf !== 1 ? `Disesuaikan stock split (faktor ${x.sf.toLocaleString('id-ID')}).<br>` : ''}${Number.isFinite(x.ath) ? `Terendah sejak IPO: ${fx(perf[x.t][6] * x.sf)} · ATH ${fx(x.ath)} (${dmy(x.athDate)}).<br>` : ''}Sumber: ${src || '—'}<div class="mt-1">${ewoksStatusLinks(x.t)}</div></td></tr>`;
        }).join('') || '<tr><td colspan="8" class="p-6 text-center text-slate-400">Tidak ada data.</td></tr>';
    };

    async function load() {
        loaded = true;
        try {
            const get = (f) => fetch(`${base()}assets/data/${f}?v=${V()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(f)));
            await ewoksStatusLoad(); const [ipo, pf, sc] = await Promise.all([get('ipo.json'), get('ipo-perf.json').catch(() => null), get('idx-screener.json').catch(() => null)]);
            items = ipo.items || [];
            if (pf) { perf = pf.perf || {}; perfAsOf = pf.asOf; }
            if (sc) { scrBuilt = new Date((sc.meta && sc.meta.built) || Date.now()).getTime(); for (const r of sc.rows || []) { scr[r[0]] = r[1]; scrDate[r[0]] = r[10]; } }
            const years = [...new Set(items.map((x) => (x.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
            $('ipo-year').innerHTML = '<option value="ALL">Semua tahun</option>' + years.map((y) => `<option>${y}</option>`).join('');
            const got = Object.keys(perf).length;
            $('ipo-stamp').textContent = `${items.length} IPO · data IPO per ${ipo.asOf} · ` + (got ? `riwayat harga/ATH per ${new Date(perfAsOf).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })} (${got} emiten)` : 'ATH menunggu pembaruan harian berikutnya; kolom "Sekarang" memakai harga screener');
            ipoRender();
        } catch (e) { $('ipo-stamp').textContent = 'Gagal memuat data IPO.'; }
    }

    if (location.hash === '#ipo') document.addEventListener('DOMContentLoaded', () => brokerTab('ipo'));
})();

document.addEventListener('ewoks-status', () => { try { if (window.ipoRender) ipoRender(true); } catch (_) {} });
(function () {
    const q = new URLSearchParams(location.search).get('q');
    if (!q) return;
    const go = () => { const el = document.getElementById('ipo-q'); if (!el || !window.ipoRender) return setTimeout(go, 400); el.value = q.toUpperCase(); if (window.brokerTab) brokerTab('ipo'); ipoRender(); };
    setTimeout(go, 600);
})();
