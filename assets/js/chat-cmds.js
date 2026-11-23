/* Command analisa untuk chat web (dimuat saat dibutuhkan): /akum /bandar /topakum /ea /eaus /lk /lkus /analisa /analisaus /fibo /fibous /global.
   Diport dari logika bot WhatsApp (index.js), dihitung di browser. Sumber: Worker ewoks-live (Yahoo), Binance (kripto), data situs.
   Semua keluaran adalah edukasi, bukan ajakan beli/jual. */
(function () {
    'use strict';
    if (window.EwoksChatCmds) return;
    var BASE = (window.EwoksSiteContext && EwoksSiteContext.basePath) || '';
    var V = encodeURIComponent(window.EWOKS_ASSET_V || '1');
    var MEM = {};
    function jfile(n) { if (!MEM[n]) MEM[n] = fetch(BASE + 'assets/data/' + n + '?v=' + V).then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(function () { delete MEM[n]; return null; }); return MEM[n]; }
    function api() { return (typeof getEwoksLiveApi === 'function' ? getEwoksLiveApi() : '') || ''; }
    function nf(v, d) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
    var DISC = '\nEdukasi, bukan ajakan beli/jual. Selalu pakai stop loss.';
    var MKT = { idx: 'IHSG', global: 'Saham Global', kripto: 'Kripto', forex: 'Forex' };
    var DOLLAR = 'USD';

    function mkey(a) { a = String(a || '').toLowerCase(); if (/^(ihsg|idx|indonesia|id)$/.test(a)) return 'idx'; if (/^(global|us|amerika|usa)$/.test(a)) return 'global'; if (/^(kripto|crypto|coin)$/.test(a)) return 'kripto'; if (/^(forex|fx|gold|emas)$/.test(a)) return 'forex'; return ''; }
    function askMarket(cmd, txt, only) {
        return { text: txt, opts: ['idx', 'global', 'kripto', 'forex'].filter(function (k) { return !only || only.indexOf(k) > -1; }).map(function (k) { return [MKT[k], cmd + ' ' + k]; }) };
    }
    /* harga: IDX Rp bulat; forex 5 desimal (3 untuk JPY); lainnya adaptif */
    function fp(mk, v, k) {
        v = Number(v); if (!isFinite(v)) return '-';
        if (mk === 'idx') return 'Rp ' + nf(Math.round(v), 0).replace(/,/g, '.');
        if (mk === 'forex') return nf(v, /JPY|IDR|KRW|INR|XAU|XAG|GC=F|SI=F/.test(k || '') ? 3 : 5);
        var d = v >= 1000 ? 2 : v >= 1 ? 2 : v >= 0.01 ? 5 : 8; return '$' + nf(v, d);
    }

    /* ---------- pencarian kode ---------- */
    var STABLE = /^(USDT|USDC|DAI|FDUSD|TUSD|USDE|USDD|USDS|PYUSD|STETH|WBTC|WETH)$/;
    async function resolve(code, hint) {
        var k = String(code || '').toUpperCase().replace(/^\$/, '').replace(/[^A-Z0-9.=^-]/g, ''); if (!k) return null;
        if (hint === 'idx') return { mk: 'idx', k: k, sym: k };
        if (hint === 'kripto') return { mk: 'kripto', k: k.replace(/-?USDT?$/, ''), sym: k.replace(/-?USDT?$/, '') };
        if (hint === 'global') return { mk: 'global', k: k, sym: k };
        var fx = await jfile('forex.json'), f = fx && fx.items ? fx.items.filter(function (x) { return x.k === k; })[0] : null;
        if (hint === 'forex' || f) return f ? { mk: 'forex', k: f.k, sym: f.s, name: f.n } : { mk: 'forex', k: k, sym: /=X$|=F$/.test(k) ? k : k + '=X' };
        var id = await jfile('idx-screener.json'), r = id && id.rows ? id.rows.filter(function (x) { return x[0] === k; })[0] : null;
        if (r) return { mk: 'idx', k: k, sym: k, name: r[11], row: r };
        var cr = await jfile('crypto.json'), c = cr && cr.items ? cr.items.filter(function (x) { return x.k === k; })[0] : null;
        if (c) return { mk: 'kripto', k: c.k, sym: c.k, name: c.n, ysym: c.s };
        return { mk: 'global', k: k, sym: k };
    }
    async function pool(mk, n) {
        if (mk === 'idx') { var d = await jfile('idx-screener.json'); return d && d.rows ? d.rows.filter(function (r) { return r[1] > 50; }).sort(function (a, b) { return b[1] * (b[9] || 0) - a[1] * (a[9] || 0); }).slice(0, n).map(function (r) { return { mk: 'idx', k: r[0], sym: r[0], price: r[1] }; }) : []; }
        if (mk === 'global') { var g = await jfile('global-screener.json'); return g && g.rows ? g.rows.filter(function (r) { return r[1] > 5 && /^[A-Z]{1,5}$/.test(r[0]); }).sort(function (a, b) { return b[1] * (b[8] || 0) - a[1] * (a[8] || 0); }).slice(0, n).map(function (r) { return { mk: 'global', k: r[0], sym: r[0], price: r[1] }; }) : []; }
        if (mk === 'kripto') { var c = await jfile('crypto.json'); return c && c.items ? c.items.filter(function (x) { return !STABLE.test(x.k); }).slice(0, n).map(function (x) { return { mk: 'kripto', k: x.k, sym: x.k, ysym: x.s, price: x.price }; }) : []; }
        var f = await jfile('forex.json'); return f && f.items ? f.items.filter(function (x) { return x.k !== 'DXY'; }).slice(0, n).map(function (x) { return { mk: 'forex', k: x.k, sym: x.s, price: x.price }; }) : [];
    }
    function mapLimit(items, n, fn) {
        var out = new Array(items.length), i = 0;
        return Promise.all(Array.from({ length: Math.min(n, items.length) }, function () { return (function next() { var j = i++; if (j >= items.length) return Promise.resolve(); return fn(items[j]).then(function (r) { out[j] = r; }, function () { out[j] = null; }).then(next); })(); })).then(function () { return out; });
    }

    /* ---------- candle ---------- */
    var WK = { '1m': ['5d', '1m'], '5m': ['5d', '5m'], '15m': ['5d', '15m'], '30m': ['1mo', '30m'], '1h': ['1mo', '60m'], '4h': ['3mo', '60m'], 'd': ['3mo', '1d'] };
    var BN = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1h', '4h': '4h', 'd': '1d' };
    function clean(t, o, h, l, c, v) {
        var R = { t: [], o: [], h: [], l: [], c: [], v: [] };
        for (var i = 0; i < c.length; i++) { if ([o[i], h[i], l[i], c[i]].every(function (x) { return x != null && isFinite(x); })) { R.t.push(t[i]); R.o.push(o[i]); R.h.push(h[i]); R.l.push(l[i]); R.c.push(c[i]); R.v.push(v[i] || 0); } }
        return R;
    }
    function agg4(R) {
        var O = { t: [], o: [], h: [], l: [], c: [], v: [] };
        for (var i = 0; i + 3 < R.c.length; i += 4) { O.t.push(R.t[i + 3]); O.o.push(R.o[i]); O.h.push(Math.max.apply(null, R.h.slice(i, i + 4))); O.l.push(Math.min.apply(null, R.l.slice(i, i + 4))); O.c.push(R.c[i + 3]); O.v.push(R.v[i] + R.v[i + 1] + R.v[i + 2] + R.v[i + 3]); }
        return O;
    }
    function viaWorker(it, rg, iv) {
        var A = api(); if (!A) return Promise.resolve(null);
        var glob = it.mk !== 'idx', sym = it.mk === 'forex' ? it.sym : (it.mk === 'kripto' ? (it.ysym || it.k + '-USD') : it.sym);
        return fetch(A + '/chart?s=' + encodeURIComponent(sym) + (glob ? '&g=1' : '') + '&range=' + rg + '&interval=' + iv, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
            if (!d || !d.ok || !d.c) return null; return clean(d.t, d.o, d.h, d.l, d.c, d.v);
        }).catch(function () { return null; });
    }
    function viaBinance(it, iv, limit) {
        return fetch('https://api.binance.com/api/v3/klines?symbol=' + encodeURIComponent(it.k) + 'USDT&interval=' + iv + '&limit=' + (limit || 300)).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (a) {
            return clean(a.map(function (x) { return x[0] / 1000; }), a.map(function (x) { return +x[1]; }), a.map(function (x) { return +x[2]; }), a.map(function (x) { return +x[3]; }), a.map(function (x) { return +x[4]; }), a.map(function (x) { return +x[5]; }));
        }).catch(function () { return null; });
    }
    /* candles(item, tf) tf: 1m 5m 15m 30m 1h 4h d */
    function candles(it, tf) {
        var w = WK[tf] || WK.d;
        var p = it.mk === 'kripto' ? viaBinance(it, BN[tf] || '1d', tf === 'd' ? 120 : 300).then(function (R) { return R || viaWorker(it, w[0], w[1]).then(function (X) { return X && tf === '4h' ? agg4(X) : X; }); })
            : viaWorker(it, w[0], w[1]).then(function (X) { return X && tf === '4h' ? agg4(X) : X; });
        return p;
    }
    function sma(a, p) { var o = []; for (var i = 0; i < a.length; i++) { if (i < p - 1) { o.push(null); continue; } var s = 0; for (var j = 0; j < p; j++) s += a[i - j]; o.push(s / p); } return o; }
    function rsi(c, p) {
        p = p || 14; if (c.length <= p) return null; var g = 0, l = 0, i, ch;
        for (i = 1; i <= p; i++) { ch = c[i] - c[i - 1]; if (ch > 0) g += ch; else l -= ch; }
        var ag = g / p, al = l / p;
        for (i = p + 1; i < c.length; i++) { ch = c[i] - c[i - 1]; ag = (ag * (p - 1) + (ch > 0 ? ch : 0)) / p; al = (al * (p - 1) + (ch < 0 ? -ch : 0)) / p; }
        return al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    }
    function unit(mk) { return mk === 'idx' ? 'Lot' : (mk === 'kripto' ? 'koin' : 'lembar'); }
    function vol(mk, v) { return mk === 'idx' ? v / 100 : v; }
    function short(n) { var a = Math.abs(n); return (n < 0 ? '-' : '') + (a >= 1e9 ? nf(a / 1e9, 2) + ' M' : a >= 1e6 ? nf(a / 1e6, 2) + ' Jt' : a >= 1e3 ? nf(a / 1e3, 1) + ' Rb' : nf(a, 0)); }

    /* ================= /akum /bandar ================= */
    var TFA = {
        '15M': { label: '15 Menit', iv: '1m', rg: '5d', win: 15 * 60 }, '30M': { label: '30 Menit', iv: '1m', rg: '5d', win: 30 * 60 },
        '1J': { label: '1 Jam', iv: '5m', rg: '5d', win: 3600 }, '4J': { label: '4 Jam', iv: '5m', rg: '5d', win: 14400 },
        '1H': { label: '1 Hari (sesi terakhir)', iv: '5m', rg: '5d', sesi: true }, '7H': { label: '7 Hari', iv: '30m', rg: '1mo', win: 7 * 86400 }, '30H': { label: '30 Hari', iv: '1d', rg: '3mo', win: 30 * 86400 }
    };
    function parseTfA(s) { s = String(s || '').toUpperCase().replace(/\s/g, ''); if (/^\d+$/.test(s)) s += 'H'; return TFA[s] ? s : (s === '' ? '1H' : null); }
    async function akumCandles(it, key) {
        var cfg = TFA[key], R;
        if (it.mk === 'kripto') {
            var bi = { '1m': '1m', '5m': '5m', '30m': '30m', '1d': '1d' }[cfg.iv], lim = { '1m': 1000, '5m': 1000, '30m': 400, '1d': 45 }[cfg.iv];
            R = await viaBinance(it, bi, lim);
        } else R = await viaWorker(it, cfg.rg, cfg.iv);
        if (!R || !R.c.length) return null;
        var last = R.t[R.t.length - 1], from;
        if (cfg.sesi) { from = it.mk === 'kripto' ? last - 86400 : (function () { var day = new Date((last + 7 * 3600) * 1000).toISOString().slice(0, 10), k = 0; while (k < R.t.length && new Date((R.t[k] + 7 * 3600) * 1000).toISOString().slice(0, 10) !== day) k++; return R.t[k] - 1; })(); }
        else from = last - cfg.win;
        var idx = []; for (var i = 0; i < R.t.length; i++) if (R.t[i] > from) idx.push(i);
        return { o: idx.map(function (i) { return R.o[i]; }), h: idx.map(function (i) { return R.h[i]; }), l: idx.map(function (i) { return R.l[i]; }), c: idx.map(function (i) { return R.c[i]; }), v: idx.map(function (i) { return R.v[i]; }), t: idx.map(function (i) { return R.t[i]; }) };
    }
    function hitungAkum(mk, H) {
        var tv = 0, vn = 0, acc = 0, dist = 0;
        for (var i = 0; i < H.c.length; i++) {
            var vl = vol(mk, H.v[i] || 0), ty = (H.h[i] + H.l[i] + H.c[i]) / 3; tv += vl; vn += ty * vl;
            if (H.c[i] > H.o[i]) acc += vl; else if (H.c[i] < H.o[i]) dist += vl; else { acc += vl / 2; dist += vl / 2; }
        }
        return { net: acc - dist, acc: acc, dist: dist, total: tv, avg: tv > 0 ? vn / tv : 0 };
    }
    async function cmdAkum(args) {
        var hint = '', toks = [];
        args.forEach(function (a) { var m = mkey(a); if (m && !toks.length) hint = m; else toks.push(a); });
        if (!toks.length) return { text: 'Bandarmologi (proxy VWAP). Format: /akum <kode> [tf]\nContoh: /akum BBCA 7H, /akum BTC 4J, /akum NVDA 30H\nTF: 15M, 30M, 1J, 4J, 1H (default), 7H, 30H (M=menit, J=jam, H=hari).\nForex tidak punya volume terpusat, jadi tidak bisa dihitung.\nAtau lihat daftar teratas per pasar:', opts: [['Top akum IHSG', '/topakum idx'], ['Top akum Global', '/topakum global'], ['Top akum Kripto', '/topakum kripto']] };
        var key = parseTfA(toks[1]); if (!key) return 'Timeframe tidak dikenal. Pilih: ' + Object.keys(TFA).join(', ') + '. Contoh: /akum BBCA 7H';
        var it = await resolve(toks[0], hint); if (!it) return 'Kode tidak valid.';
        if (it.mk === 'forex') return 'Forex tidak punya data volume terpusat, akumulasi/distribusi tidak bisa dihitung. Untuk forex coba /global forex atau /fibo EURUSD.';
        if (!api() && it.mk !== 'kripto') return 'Server data belum diatur.';
        var H = await akumCandles(it, key);
        if (!H) return 'Gagal mengambil data ' + it.k + '. Cek kode atau coba lagi.';
        if (H.c.length < 2) return 'Data ' + it.k + ' untuk TF ' + key + ' belum cukup (pasar tutup atau jarang transaksi). Coba TF lebih besar, mis. 7H.';
        var last = H.c[H.c.length - 1];
        if (it.mk === 'idx' && last <= 50) return 'Saham ' + it.k + ' masuk zona gocap (<= Rp50). Mending diskip.';
        var r = hitungAkum(it.mk, H), dom = r.total > 0 ? r.net / r.total * 100 : 0, isA = r.net > 0, u = unit(it.mk);
        return 'BANDAR ' + it.k + ' (' + key + ', ' + TFA[key].label + ', ' + H.c.length + ' candle)\nStatus: ' + (isA ? 'AKUMULASI' : 'DISTRIBUSI') + ' (dominasi ' + (dom > 0 ? '+' : '') + nf(dom, 1) + '%)\nNet Volume: ' + (r.net > 0 ? '+' : '') + nf(r.net, 0) + ' ' + u + '\nVolume candle naik: ' + nf(r.acc, 0) + ' ' + u + ' | turun: ' + nf(r.dist, 0) + ' ' + u + '\nVWAP: ' + fp(it.mk, r.avg, it.k) + ' | Last: ' + fp(it.mk, last, it.k) + (last < r.avg ? ' (di bawah rata-rata, diskon)' : ' (di atas rata-rata)') +
            '\nRange periode: ' + fp(it.mk, Math.min.apply(null, H.l), it.k) + ' - ' + fp(it.mk, Math.max.apply(null, H.h), it.k) + '\nEstimasi proxy dari arah candle × volume, BUKAN data broker asli.';
    }
    async function cmdTopAkum(args) {
        var mk = '', key = '';
        args.forEach(function (a) { var m = mkey(a); if (m) mk = m; else key = a; });
        if (!mk || mk === 'forex') return askMarket('/topakum' + (key ? ' ' + key : ''), 'Top akumulasi untuk pasar mana? (Forex tidak punya data volume)', ['idx', 'global', 'kripto']);
        key = (parseTfA(key || '7H') || '7H'); if (TFA[key].iv !== '1d' && key !== '7H') key = '7H';
        var list = await pool(mk, mk === 'kripto' ? 30 : 30);
        if (!list.length) return 'Daftar ' + MKT[mk] + ' belum bisa dimuat.';
        var res = await mapLimit(list, 6, function (it) { return akumCandles(it, key).then(function (H) { if (!H || H.c.length < 2) return null; var r = hitungAkum(mk, H); return { k: it.k, r: r, last: H.c[H.c.length - 1] }; }); });
        var ok = res.filter(function (x) { return x && x.r.net > 0; }).sort(function (a, b) { return b.r.net * b.r.avg - a.r.net * a.r.avg; }).slice(0, 10);
        if (!ok.length) return 'Belum ada ' + MKT[mk] + ' dengan akumulasi dominan pada TF ' + key + ' (dari ' + list.length + ' aset paling likuid).';
        return 'TOP AKUMULASI ' + MKT[mk] + ' (TF ' + key + ', ' + list.length + ' aset paling likuid, urut nilai net):\n' + ok.map(function (x, i) { var dom = x.r.total ? x.r.net / x.r.total * 100 : 0; return (i + 1) + '. ' + x.k + '  Net +' + short(x.r.net) + ' ' + unit(mk) + ' (dominasi ' + nf(dom, 0) + '%)\n   VWAP ' + fp(mk, x.r.avg, x.k) + ' · Last ' + fp(mk, x.last, x.k) + (x.last < x.r.avg ? ' (diskon)' : ''); }).join('\n') + '\nEstimasi proxy, bukan data broker. Cek satu aset: /akum <kode> ' + key;
    }

    /* ================= /ea /eaus ================= */
    var TFE = { d: 'Daily', '1d': 'Daily', h: '1 Jam', '1h': '1 Jam', '4h': '4 Jam', '30m': '30 Menit', '15m': '15 Menit' };
    function normTf(a) { a = String(a || 'd').toLowerCase(); if (a === 'h' || a === '60') return '1h'; if (a === '1d') return 'd'; return a; }
    async function cmdEA(args, forceGlobal) {
        var mk = forceGlobal ? 'global' : '', tf = 'd', tfGiven = false;
        args.forEach(function (a) { var m = mkey(a); if (m) mk = m; else if (TFE[String(a).toLowerCase()]) { tf = normTf(a); tfGiven = true; } });
        if (!mk) { if (tfGiven) mk = 'idx'; else return askMarket('/ea' + (tf !== 'd' ? ' ' + tf : ''), 'Screener EA (Golden Cross MA5/MA20) untuk pasar mana?'); }
        var list = await pool(mk, mk === 'idx' ? 60 : (mk === 'global' ? 60 : (mk === 'kripto' ? 40 : 31)));
        if (!list.length) return 'Daftar ' + MKT[mk] + ' belum bisa dimuat.';
        var noVol = mk === 'forex';
        var res = await mapLimit(list, 6, function (it) {
            return candles(it, tf).then(function (R) {
                if (!R || R.c.length < 25) return null;
                var c = R.c, n = c.length, cur = n - 1, prv = cur - 1, m5 = sma(c, 5), m20 = sma(c, 20);
                if (mk === 'idx' && c[cur] <= 50) return null; if (mk === 'global' && c[cur] <= 5) return null;
                if (m5[prv] == null || m20[prv] == null) return null;
                var cross = m5[prv] <= m20[prv] && m5[cur] > m20[cur];
                if (cross && (noVol || R.v[cur] > R.v[prv]) && c[cur] > R.o[cur]) return { k: it.k, c: c[cur], m5: m5[cur], m20: m20[cur], v: R.v[cur] };
                return null;
            });
        });
        var ok = res.filter(Boolean).sort(function (a, b) { return b.v - a.v; }).slice(0, 10);
        var head = 'SCREENER EA ' + MKT[mk] + ' (Golden Cross) · TF ' + (TFE[tf] || tf) + ' · scan ' + list.length + ' aset paling likuid\nKriteria: MA5 cross ke atas MA20' + (noVol ? ', candle bullish (forex tanpa data volume)' : ', volume naik, candle bullish') + '\n';
        if (!ok.length) return head + 'Tidak ada yang memenuhi kriteria saat ini. Coba TF lain (mis. /ea ' + mk + ' 1h).' + DISC;
        return head + ok.map(function (x, i) { return (i + 1) + '. ' + x.k + '  Last ' + fp(mk, x.c, x.k) + ' · MA5 ' + fp(mk, x.m5, x.k) + ' · MA20 ' + fp(mk, x.m20, x.k) + (noVol ? '' : ' · Vol ' + short(vol(mk, x.v)) + ' ' + unit(mk)); }).join('\n') + '\nGolden Cross + dorongan volume menandakan potensi awal tren naik. Konfirmasi dengan support/resist.' + DISC;
    }

    /* ================= /analisa /lk ================= */
    async function fund(it) {
        var A = api(); if (!A) return null;
        try { var r = await fetch(A + '/fund?s=' + encodeURIComponent(it.k) + (it.mk === 'idx' ? '' : '&g=1')); var d = await r.json(); return d && d.ok ? d : null; } catch (_) { return null; }
    }
    async function fundMain(args, kind, forceUS) {
        var hint = forceUS ? 'global' : '', toks = [];
        args.forEach(function (a) { var m = mkey(a); if (m && !toks.length) hint = m; else toks.push(a); });
        if (!toks.length) return { text: (kind === 'lk' ? 'Ringkasan laporan keuangan + nilai wajar' : 'Analisa ringkas + trading plan') + '. Format: /' + kind + ' <kode>\nContoh: /' + kind + ' BBCA (IHSG), /' + kind + ' AAPL (saham global).\nKripto dan forex tidak punya laporan keuangan.', opts: [['Contoh IHSG', '/' + kind + ' BBCA'], ['Contoh Global', '/' + kind + ' AAPL']] };
        var it = await resolve(toks[0], hint);
        if (!it) return 'Kode tidak valid.';
        if (it.mk === 'kripto' || it.mk === 'forex') return 'Command ini untuk saham (IHSG atau global). Untuk ' + MKT[it.mk] + ' coba /fibo ' + it.k + ' atau /global ' + (it.mk === 'kripto' ? 'kripto' : 'forex') + '.';
        var F = await fund(it), us = it.mk === 'global';
        var price = F && F.price != null ? F.price : null, chg = F ? F.chg : null, name = (F && F.name) || (it.row && it.row[11]) || it.k;
        if (price == null && it.row) { price = it.row[1]; chg = it.row[3]; }
        if (price == null && us) { var gs = await jfile('global-screener.json'), g = gs && gs.rows ? gs.rows.filter(function (x) { return x[0] === it.k; })[0] : null; if (g) { price = g[1]; chg = g[3]; name = g[10] || name; } }
        if (price == null) return 'Data ' + it.k + ' tidak ditemukan.';
        if (!us && price <= 50) return 'Saham ' + it.k + ' harganya Rp' + price + ' (<= Rp50): zona gocap/FCA, sangat berisiko. Mending cari emiten lain.';
        var cur = us ? '$' : 'Rp ', P = function (v) { return us ? '$' + nf(v, 2) : 'Rp ' + nf(Math.round(v), 0); };
        var pe = F && F.pe != null ? nf(F.pe, 2) + 'x' : 'N/A', pbv = F && F.pbv != null ? nf(F.pbv, 2) + 'x' : 'N/A', eps = F && F.eps != null ? nf(F.eps, 2) : 'N/A';
        var head = it.k + ' (' + name + ')\nHarga: ' + P(price) + (chg != null ? ' (' + (chg >= 0 ? '+' : '') + nf(chg, 2) + '%)' : '') + (F ? '' : '\n(Data valuasi live belum tersedia: Worker perlu v10 dengan route /fund.)');
        if (kind === 'analisa') {
            return 'ANALISA RINGKAS ' + (us ? 'US' : 'INDO') + ': ' + head + '\n\nValuasi:\n- PER: ' + pe + '\n- PBV: ' + pbv + '\n- EPS: ' + eps + '\n\nTrading Plan (estimasi sistem):\n- Entry: ' + P(price) + '\n- TP 1: ' + P(price * 1.05) + ' (+5%)\n- TP 2: ' + P(price * 1.10) + ' (+10%)\n- Cut Loss: ' + P(price * 0.95) + ' (-5%)\n- Average Down: ' + P(price * 0.90) + ' (-10%)\n\nTips: cek volume dan bandarmologi (/akum ' + it.k + ').' + DISC;
        }
        var fair = F && F.eps && F.eps > 0 ? F.eps * 15 : null, mos = fair ? (fair - price) / fair * 100 : null;
        var out = 'RINGKASAN LAPORAN KEUANGAN' + (us ? ' US' : '') + ': ' + head + '\nPER (TTM): ' + pe + ' · PBV: ' + pbv + ' · EPS (TTM): ' + eps + (F && F.mcap ? '\nMarket Cap: ' + (us ? '$' + nf(F.mcap / 1e9, 1) + ' M' : 'Rp ' + nf(F.mcap / 1e12, 1) + ' T') : '') +
            '\nNilai Wajar (EPS × 15): ' + (fair ? P(fair) + ' · MoS ' + nf(mos, 1) + '% · ' + (price > fair ? 'Overvalued' : 'Undervalued') : 'N/A (EPS tidak positif atau tidak tersedia)') + '\n';
        out += await fundTable(it);
        return out + '\nNilai wajar = EPS × 15 hanyalah estimasi kasar (Benjamin Graham disederhanakan), bukan target harga.' + DISC;
    }
    async function fundTable(it) {
        var rows = [], labels, get, u;
        if (it.mk === 'idx') {
            var d = await jfile('funda-idx.json'), t = d && d.tickers ? d.tickers[it.k] : null; if (!t) return '\n(Data laporan keuangan tahunan emiten ini belum ada di situs.)';
            var n = (t.net || t.rev || []).length, yrs = []; for (var i = 0; i < n; i++) yrs.push(i === n - 1 ? (t.latestMonths ? (t.latestMonths === 12 ? 'FY-' : t.latestMonths + 'bln-') + String(t.latestPeriod || '2026').slice(0, 4) : 'Q-2026') : String(2020 + i));
            labels = yrs; u = 'Rp triliun'; get = function (key) { return (t[key] || []).map(function (v) { return t.source === 'bei' && v === 0 ? null : v; }); };
            var cols = Math.min(5, n), s0 = n - cols, L = labels.slice(s0), line = function (nm, arr, f) { if (!arr || !arr.length || arr.every(function (x) { return x == null; })) return; rows.push(nm + ': ' + arr.slice(s0).map(function (v) { return v == null ? '-' : f(v); }).join(' | ')); };
            rows.push('Kolom: ' + L.join(' | ') + ' (Rp triliun, Q = kuartal terbaru' + (t.source === 'bei' ? '; angka periode terakhir kumulatif sejak awal tahun' + (t.stale ? ' (laporan lama, emiten belum lapor lagi)' : '') + '; sumber BEI' + (t.cfSource ? ', arus kas dari Yahoo' : ', tanpa arus kas dan dividen') + '' : '') + ')');
            line('Pendapatan', get('rev'), function (v) { return nf(v, Math.abs(v) < 1 ? 3 : 1); }); line('Laba Bersih', get('net'), function (v) { return nf(v, Math.abs(v) < 1 ? 3 : 1); }); line('Total Aset', get('asset'), function (v) { return nf(v, Math.abs(v) < 1 ? 3 : 0); }); line('Ekuitas', get('eq'), function (v) { return nf(v, Math.abs(v) < 1 ? 3 : 0); }); line('Arus Kas Bebas', get('fcf'), function (v) { return nf(v, 1); });
            var roe = get('net').map(function (v, i) { var e = get('eq')[i]; return v != null && e ? v / e * 100 : null; }); line('ROE tahunan', roe.map(function (v, i) { return i === n - 1 ? null : v; }), function (v) { return nf(v, 1) + '%'; });
            var der = get('asset').map(function (a, i) { var e = get('eq')[i]; return a != null && e ? (a - e) / e : null; }); line('DER (Liabilitas/Ekuitas)', der, function (v) { return nf(v, 2) + 'x'; });
            return '\nLaporan Keuangan:\n' + rows.join('\n');
        }
        var ch = it.k.charAt(0); if (!/[A-Z]/.test(ch)) return '';
        var gd = await jfile('global-funda/' + ch + '.json'), gt = gd && gd.t ? gd.t[it.k] : null; if (!gt) return '\n(Data laporan keuangan tahunan emiten ini belum ada di situs.)';
        var yrsG = (gd.meta && gd.meta.years) || [2021, 2022, 2023, 2024, 2025, 2026], m = yrsG.length, c2 = Math.min(5, m), s1 = m - c2;
        var lines = ['Kolom: ' + yrsG.slice(s1).map(function (y, i) { return i === c2 - 1 && s1 + i === m - 1 ? 'TTM' : y; }).join(' | ') + ' (USD miliar)'];
        function ln(nm, arr, f) { if (!arr || arr.every(function (x) { return x == null; })) return; lines.push(nm + ': ' + arr.slice(s1).map(function (v) { return v == null ? '-' : f(v); }).join(' | ')); }
        ln('Pendapatan', gt.rev, function (v) { return nf(v, 1); }); ln('Laba Bersih', gt.ni, function (v) { return nf(v, 1); }); ln('Total Aset', gt.asset, function (v) { return nf(v, 0); }); ln('Ekuitas', gt.eq, function (v) { return nf(v, 0); }); ln('Arus Kas Bebas', gt.fcf, function (v) { return nf(v, 1); }); ln('EPS (USD)', gt.eps, function (v) { return nf(v, 2); });
        var roeG = (gt.ni || []).map(function (v, i) { var e = (gt.eq || [])[i]; return v != null && e ? v / e * 100 : null; }); ln('ROE', roeG, function (v) { return nf(v, 1) + '%'; });
        return '\nLaporan Keuangan:\n' + lines.join('\n');
    }

    /* ================= /fibo ================= */
    async function cmdFibo(args, forceUS) {
        var hint = forceUS ? 'global' : '', toks = [], tf = 'd', nums = [];
        args.forEach(function (a) { var m = mkey(a); var al = String(a).toLowerCase(); if (m && !toks.length) hint = m; else if (/^(1m|5m|15m|30m|1h|4h|d|h)$/.test(al) && toks.length) tf = normTf(al); else if (/^\d+(\.\d+)?$/.test(a) && toks.length) nums.push(parseFloat(a)); else toks.push(a); });
        if (!toks.length) return { text: 'Fibonacci Retracement otomatis (high-low 3 bulan). Format: /fibo <kode> [tf] [low high]\nContoh: /fibo BBCA, /fibo BTC 4h, /fibo EURUSD, /fibo NVDA, /fibo BBCA 8000 9500 (manual).\nPilih pasar:', opts: [['IHSG: BBCA', '/fibo BBCA'], ['Global: NVDA', '/fibo NVDA'], ['Kripto: BTC', '/fibo BTC'], ['Forex: EURUSD', '/fibo EURUSD']] };
        var it = await resolve(toks[0], hint); if (!it) return 'Kode tidak valid.';
        var R = await candles(it, tf), low, high, mode;
        if (nums.length >= 2) { low = Math.min(nums[0], nums[1]); high = Math.max(nums[0], nums[1]); mode = 'Manual input'; }
        else { if (!R || R.c.length < 5) return 'Data ' + it.k + ' belum bisa diambil. Cek kode atau coba lagi.'; low = Math.min.apply(null, R.l); high = Math.max.apply(null, R.h); mode = 'Otomatis (' + (tf === 'd' ? '3 bulan harian' : 'candle ' + tf) + ')'; }
        var price = R && R.c.length ? R.c[R.c.length - 1] : (it.row ? it.row[1] : null); if (price == null) return 'Harga ' + it.k + ' tidak tersedia.';
        if (it.mk === 'idx' && price <= 50) return 'Saham ' + it.k + ' gocap (<= Rp50): Fibo tidak valid. Skip.';
        if (!(high > low)) return 'Rentang harga tidak valid (high harus lebih besar dari low).';
        var diff = high - low, L = function (r) { return high - diff * r; }, f = function (v) { return fp(it.mk, v, it.k); };
        var zona = price <= L(0.5) && price >= L(0.618) ? 'ZONA EMAS: harga di Golden Pocket (50% - 61,8%), area entry buy paling ideal pantulan teknikal.' : price > L(0.382) ? 'ZONA TINGGI: harga di area atas. Lebih aman tunggu retest ke 50% atau 61,8%.' : price < L(0.618) ? 'ZONA BREAKDOWN: harga di bawah area emas. Pantau stop loss atau support di 78,6%.' : 'ZONA KONSOLIDASI: pantau reaksi volume di dekat support terdekat.';
        var tv = { idx: 'IDX:' + it.k, global: it.k, kripto: 'BINANCE:' + it.k + 'USDT', forex: 'FX:' + it.k.replace('=X', '') }[it.mk];
        return 'FIBONACCI RETRACEMENT ' + MKT[it.mk].toUpperCase() + ': ' + it.k + '\nMetode: ' + mode + ' · TF ' + (TFE[tf] || tf) + '\nHarga saat ini: ' + f(price) + '\n\n[0%] Peak (High): ' + f(high) + '\n[23,6%] Support 1: ' + f(L(0.236)) + '\n[38,2%] Support 2: ' + f(L(0.382)) + '\n[50%] Pivot: ' + f(L(0.5)) + '\n[61,8%] Golden Ratio: ' + f(L(0.618)) + '\n[78,6%] Deep Support: ' + f(L(0.786)) + '\n[100%] Base (Low): ' + f(low) + '\n\nArea buy terbaik (Golden Zone): ' + f(L(0.618)) + ' - ' + f(L(0.5)) + '\nBatas pertahanan akhir (CL): jebol ' + f(low) + '\n\n' + zona + '\nChart: [Buka di TradingView](https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(tv) + ')' + DISC;
    }

    /* ================= /global (SMC) — port calculateSmartGlobalSignal ================= */
    function smc(it, entry, H, tf) {
        var n = H.c.length; if (n < 20) return { signal: 'ERROR' };
        var closes = H.c, per = Math.min(20, Math.floor(n / 2)), s20 = sma(closes, per).slice(-1)[0] || entry, s50 = sma(closes, Math.min(50, n)).slice(-1)[0] || entry, rs = rsi(closes, Math.min(14, n - 1)) || 50;
        var lastVol = H.v[n - 1] || 0, rec = H.v.slice(-11, -1), avgV = rec.length ? rec.reduce(function (a, b) { return a + b; }, 0) / rec.length : lastVol, volOk = lastVol >= avgV * 0.9 || it.mk === 'forex';
        var ph = [], pl = [], i;
        for (i = 2; i < n - 2; i++) { if (H.h[i] > Math.max(H.h[i - 1], H.h[i - 2], H.h[i + 1], H.h[i + 2])) ph.push(H.h[i]); if (H.l[i] < Math.min(H.l[i - 1], H.l[i - 2], H.l[i + 1], H.l[i + 2])) pl.push(H.l[i]); }
        var lastPH = ph.length ? ph[ph.length - 1] : entry * 1.01, lastPL = pl.length ? pl[pl.length - 1] : entry * 0.99, lc = closes[n - 1];
        var bull = lc > lastPH, bear = lc < lastPL, fvg = '', hasBF = false, hasSF = false;
        for (i = n - 1; i >= n - 5 && i >= 2; i--) {
            if (H.l[i] > H.h[i - 2] && H.c[i - 1] > H.o[i - 1]) { hasBF = true; fvg = '(FVG: ' + nf(H.h[i - 2], 4) + ' - ' + nf(H.l[i], 4) + ')'; break; }
            if (H.h[i] < H.l[i - 2] && H.c[i - 1] < H.o[i - 1]) { hasSF = true; fvg = '(FVG: ' + nf(H.h[i], 4) + ' - ' + nf(H.l[i - 2], 4) + ')'; break; }
        }
        var rc = H.h.slice(-10).map(function (h, j) { return h - H.l.slice(-10)[j]; }), avgR = rc.reduce(function (a, b) { return a + b; }, 0) / rc.length;
        var up = s20 > s50, dn = s20 < s50, signal = 'WAIT', reason = 'Menunggu momentum breakout penutupan candle searah tren.';
        if (bull && up && volOk && rs < 75 && rs > 35) { signal = 'BUY'; reason = 'Valid BoS Close, Tren Bullish' + (it.mk === 'forex' ? '' : ' & Volume Sehat') + ' ' + (hasBF ? fvg : '') + '!'; }
        else if (bear && dn && volOk && rs > 25 && rs < 65) { signal = 'SELL'; reason = 'Valid BoS Close, Tren Bearish' + (it.mk === 'forex' ? '' : ' & Volume Sehat') + ' ' + (hasSF ? fvg : '') + '!'; }
        var tipe, info, slD, tpD, k = it.k;
        if (it.mk === 'kripto') { tipe = 'SCALPING/SWING KRIPTO'; if (avgR > entry * 0.001) { slD = avgR * 1.5; tpD = avgR * 3; info = 'Dynamic Volatilitas TF (SL ' + nf(slD / entry * 100, 2) + '% / TP ' + nf(tpD / entry * 100, 2) + '%)'; } else { slD = entry * 0.05; tpD = entry * 0.15; info = 'Volatilitas Statis (SL 5% / TP 15%)'; } }
        else if (/^XAU/.test(k) || it.sym === 'GC=F') { tipe = 'SCALPING GOLD'; slD = 3; tpD = 9; info = 'Volatilitas Tenang (SL 30 Pips / TP 90 Pips)'; }
        else if (/^XAG/.test(k) || it.sym === 'SI=F') { tipe = 'SCALPING SILVER'; slD = 0.3; tpD = 0.9; info = 'Volatilitas silver (SL 30 Pips / TP 90 Pips)'; }
        else if (/JPY/.test(k)) { tipe = 'SCALPING FOREX'; slD = 0.30; tpD = 0.90; info = 'Setup Forex JPY (SL 30 Pips / TP 90 Pips)'; }
        else { tipe = 'SCALPING FOREX'; slD = 0.0030; tpD = 0.0090; info = 'Setup Forex Standard (SL 30 Pips / TP 90 Pips)'; }
        var sl = 0, tp = 0;
        if (signal === 'BUY') { sl = entry - slD; tp = entry + tpD; if (lastPL > sl && lastPL < entry) sl = lastPL * 0.999; }
        else if (signal === 'SELL') { sl = entry + slD; tp = entry - tpD; if (lastPH < sl && lastPH > entry) sl = lastPH * 1.001; }
        return { signal: signal, sl: sl, tp: tp, tipe: tipe, info: info, reason: reason, rsi: rs };
    }
    async function cmdGlobal(args) {
        var mk = '', tf = '15m', tick = '';
        args.forEach(function (a) { var m = mkey(a), al = String(a).toLowerCase(); if (m === 'kripto' || m === 'forex') mk = m; else if (/^(1m|5m|15m|30m|1h|4h|d|h|60m)$/.test(al)) tf = normTf(al === '60m' ? '1h' : al); else tick = a; });
        if (!mk && !tick) return askMarket('/global', 'Radar sinyal SMC (BoS + tren SMA20/50 + RSI) untuk pasar mana? TF bisa ditambah, mis. /global kripto 1h (pilihan: 1m 5m 15m 30m 1h 4h d; default 15m).', ['kripto', 'forex']);
        var items;
        if (tick) { var it = await resolve(tick, mk || ''); if (!it || it.mk === 'idx' || (it.mk === 'global' && !mk)) { var xu = String(tick).toUpperCase(); if (/^(XAU|GOLD|EMAS)$/.test(xu)) it = { mk: 'forex', k: 'XAUUSD', sym: 'GC=F' }; else if (/^(XAG|SILVER)$/.test(xu)) it = { mk: 'forex', k: 'XAGUSD', sym: 'SI=F' }; else return 'Kode "' + tick + '" tidak dikenali di kripto/forex. Contoh: /global BTC 1h, /global EURUSD, /global XAU.'; } items = [it]; }
        else items = await pool(mk, mk === 'kripto' ? 30 : 31);
        if (!items.length) return 'Daftar aset belum bisa dimuat.';
        var showAll = !!tick;
        var res = await mapLimit(items, 6, function (it) { return candles(it, tf).then(function (H) { if (!H || H.c.length < 20) return null; var E = H.c[H.c.length - 1]; var a = smc(it, E, H, tf); a.it = it; a.entry = E; return a; }); });
        var ok = res.filter(function (a) { return a && a.signal !== 'ERROR' && (showAll || a.signal !== 'WAIT'); }).slice(0, showAll ? 3 : 5);
        var head = 'RADAR SCALPING & SWING ' + (tick ? '' : (mk === 'kripto' ? 'KRIPTO' : 'FOREX & GOLD')) + ' · TF ' + (TFE[tf] || tf).toUpperCase() + ' (live)\n\n';
        if (!ok.length) return head + (showAll ? 'Gagal menarik data untuk ' + tick.toUpperCase() + '.' : 'Sistem SMC belum mendeteksi setup scalping ideal saat ini (semua Wait & See). Coba TF lain.');
        return head + ok.map(function (a) {
            var k = a.it.k, d = function (v) { return a.it.mk === 'kripto' && a.entry < 1 ? nf(v, 6) : nf(v, a.it.mk === 'forex' && !/JPY|XAU|XAG|GC/.test(k) ? 5 : 3); };
            return a.tipe + ' | ' + k.replace('=X', '') + '\nSinyal: ' + a.signal + (a.signal === 'BUY' ? ' (naik)' : a.signal === 'SELL' ? ' (turun)' : ' (tunggu)') + '\nAlasan: ' + a.reason + '\nMarket: ' + a.info + '\nRSI14: ' + nf(a.rsi, 0) + '\nEntry Area: ' + d(a.entry) + '\nStop Loss: ' + (a.signal === 'WAIT' ? '-' : d(a.sl)) + '\nTake Profit: ' + (a.signal === 'WAIT' ? '-' : d(a.tp));
        }).join('\n-----------------------------\n') + '\n\nSL sangat ketat. Wajib disiplin lot size. Edukasi, bukan ajakan beli/jual.';
    }


    /* ---------- reksa dana, kamus istilah, return tertinggi ---------- */
    var RD = {
        rdpu: { cls: 'Pasar Uang', nama: 'Reksa Dana Pasar Uang (RDPU)', def: 'Isinya instrumen jangka pendek (deposito, surat utang di bawah 1 tahun). Naik-turunnya paling kecil, cocok buat dana darurat atau parkir dana sementara. Pencairan umumnya 1-2 hari bursa. Return kira-kira mengikuti bunga deposito, tidak dijamin.' },
        rdpt: { cls: 'Reksa Dana Pendapatan Tetap', nama: 'Reksa Dana Pendapatan Tetap (RDPT)', def: 'Minimal 80% di obligasi/surat utang. Risiko menengah: nilainya bisa turun kalau suku bunga naik atau penerbit obligasi bermasalah. Cocok untuk horizon minimal 1-3 tahun.' },
        rds: { cls: 'Reksa Dana Saham', nama: 'Reksa Dana Saham (RDS)', def: 'Minimal 80% di saham. Potensi return tertinggi tapi naik-turunnya besar, cocok untuk horizon 5 tahun lebih.' },
        rdc: { cls: 'Reksa Dana Campuran', nama: 'Reksa Dana Campuran (RDC)', def: 'Campuran saham, obligasi, dan pasar uang tanpa satu jenis yang mendominasi. Risiko di antara RDPT dan RDS.' },
        rdi: { cls: 'Reksa Dana Indeks', nama: 'Reksa Dana Indeks (RDI)', def: 'Mengikuti indeks tertentu (mis. LQ45, SRI-KEHATI), minimal 80% sesuai bobot indeks. Biaya biasanya lebih murah karena tidak memilih saham aktif.' }
    };
    function rdKeys(args) {
        var s = ' ' + [].concat(args || []).join(' ').toLowerCase() + ' ', o = [];
        if (/pasar uang|\brdpu\b|\bpu\b|money market/.test(s)) o.push('rdpu');
        if (/pendapatan tetap|\brdpt\b|obligasi|fixed income/.test(s)) o.push('rdpt');
        if (/\brds\b|reksa ?dana saham|\bsaham\b/.test(s)) o.push('rds');
        if (/campuran|\brdc\b|berimbang|balanced/.test(s)) o.push('rdc');
        if (/indeks|\brdi\b|index/.test(s)) o.push('rdi');
        return o;
    }
    async function cmdRd(args) {
        var ks = rdKeys(args);
        if (!ks.length) return { text: 'Reksa dana yang ada di database Ewoks:\n- RDPU (Pasar Uang): paling aman, jangka pendek\n- RDPT (Pendapatan Tetap): obligasi, risiko menengah\n- RDC (Campuran): saham + obligasi\n- RDS (Saham): potensi tinggi, risiko tinggi\n- RDI (Indeks): mengikuti indeks\nPilih jenis yang mau dilihat:', opts: [['RDPU', '/rd rdpu'], ['RDPT', '/rd rdpt'], ['RDC', '/rd rdc'], ['RDS', '/rd rds'], ['RDI', '/rd rdi']] };
        var d = await jfile('pasar-global.json'), ins = d && d.instruments ? d.instruments : [], out = [];
        ks.slice(0, 3).forEach(function (k) {
            var R = RD[k], list = ins.filter(function (x) { return x.assetClass === R.cls && (!x.country || x.country === 'Indonesia') && x.cagrBasis === 'return1y' && isFinite(x.cagr); }).sort(function (a, b) { return b.cagr - a.cagr; }).slice(0, ks.length > 1 ? 3 : 5);
            var s = R.nama.toUpperCase() + '\n' + R.def;
            if (list.length) { s += '\n\nDi database kami (return 1 tahun, urut tertinggi):\n' + list.map(function (x, i) { return (i + 1) + '. ' + x.name + ' (' + x.ticker + ') · ' + (x.cagr > 0 ? '+' : '') + nf(x.cagr, 2) + '% · risiko ' + x.risk + (x.aum ? ' · AUM ' + x.aum : ''); }).join('\n') + '\n' + (list[0].metric || 'Return 1 tahun'); }
            else s += '\n\nBelum ada data kinerja untuk jenis ini di database.';
            out.push(s);
        });
        return { text: out.join('\n\n') + '\n\nReturn masa lalu tidak menjamin hasil ke depan. Cek prospektus dan biaya (expense ratio) sebelum membeli. Edukasi, bukan saran investasi.', opts: ks.length === 1 ? [['Bandingkan jenis lain', '/rd']] : [] };
    }
    var GLOS = [
        [['rdpu', 'reksa dana pasar uang'], 'RDPU: reksa dana pasar uang. Isinya instrumen jangka pendek; risiko paling rendah, return mirip deposito.'],
        [['rdpt', 'reksa dana pendapatan tetap'], 'RDPT: reksa dana pendapatan tetap. Minimal 80% di obligasi; risiko menengah, sensitif ke suku bunga.'],
        [['rds', 'reksa dana saham'], 'RDS: reksa dana saham. Minimal 80% di saham; potensi tinggi, naik-turun besar, cocok jangka panjang.'],
        [['rdc', 'reksa dana campuran'], 'RDC: reksa dana campuran. Gabungan saham, obligasi, dan pasar uang.'],
        [['rdi', 'reksa dana indeks'], 'RDI: reksa dana indeks. Mengikuti indeks tertentu, biaya biasanya lebih murah.'],
        [['reksa dana', 'reksadana'], 'Reksa dana: wadah patungan dana investor yang dikelola manajer investasi ke saham, obligasi, atau pasar uang. Ketik /rd untuk jenis-jenisnya.'],
        [['nab'], 'NAB: nilai aktiva bersih per unit reksa dana. Harga unit yang kamu beli/jual, dihitung tiap hari bursa.'],
        [['etf'], 'ETF: reksa dana indeks yang diperdagangkan di bursa seperti saham, bisa dibeli/jual kapan saja jam bursa.'],
        [['sbn'], 'SBN: surat berharga negara (ORI, SBR, sukuk ritel, dll). Diterbitkan pemerintah, risiko gagal bayar sangat kecil.'],
        [['ori'], 'ORI: obligasi negara ritel dengan kupon tetap. Bisa dijual lagi di pasar sekunder sebelum jatuh tempo.'],
        [['sbr', 'savings bond'], 'SBR: savings bond ritel, kupon mengambang dengan batas bawah. Tidak bisa diperdagangkan di pasar sekunder.'],
        [['sukuk'], 'Sukuk: surat berharga syariah, imbalannya berupa bagi hasil/imbal hasil dari aset yang mendasarinya.'],
        [['obligasi'], 'Obligasi: surat utang. Kamu meminjamkan uang ke penerbit (pemerintah/perusahaan) dan menerima kupon berkala plus pokok saat jatuh tempo.'],
        [['deposito'], 'Deposito: simpanan berjangka di bank dengan bunga tetap, dijamin LPS sampai batas tertentu.'],
        [['dividen'], 'Dividen: bagian laba perusahaan yang dibagikan ke pemegang saham.'],
        [['per', 'price earning ratio'], 'PER: harga saham dibagi laba per saham. Makin rendah relatif ke sektornya, makin murah, tapi cek penyebabnya.'],
        [['pbv'], 'PBV: harga dibagi nilai buku per saham. Di bawah 1 artinya diperdagangkan di bawah nilai bukunya.'],
        [['eps'], 'EPS: laba bersih per lembar saham.'],
        [['roe'], 'ROE: laba bersih dibagi ekuitas. Menunjukkan seberapa efisien modal pemegang saham dipakai.'],
        [['der'], 'DER: total utang dibagi ekuitas. Makin tinggi makin banyak dibiayai utang.'],
        [['market cap', 'kapitalisasi pasar', 'kapitalisasi'], 'Kapitalisasi pasar: harga saham dikali jumlah saham beredar. Ukuran besar-kecilnya perusahaan.'],
        [['ipo'], 'IPO: penawaran umum perdana, saat perusahaan pertama kali menjual sahamnya ke publik.'],
        [['rights issue', 'hmetd'], 'Rights issue: penawaran saham baru ke pemegang saham lama lebih dulu. Kalau tidak ikut, porsi kepemilikanmu terencerkan.'],
        [['stock split', 'split'], 'Stock split: memecah 1 lembar jadi beberapa lembar. Harga per lembar turun, nilai total kepemilikan tetap.'],
        [['ara', 'arb', 'auto reject'], 'ARA/ARB: batas kenaikan/penurunan harga harian di bursa. Persentasenya mengikuti aturan BEI terkini.'],
        [['lot'], 'Lot: satuan jual-beli saham di BEI, 1 lot = 100 lembar.'],
        [['bid', 'offer'], 'Bid: harga beli tertinggi yang antre. Offer: harga jual terendah yang antre.'],
        [['support'], 'Support: area harga di mana penurunan sering tertahan karena pembeli masuk.'],
        [['resist', 'resistance', 'resisten'], 'Resistance: area harga di mana kenaikan sering tertahan karena penjual muncul.'],
        [['breakout'], 'Breakout: harga menembus support/resist, sering disertai volume besar.'],
        [['bow', 'buy on weakness'], 'BoW (Buy on Weakness): beli saat harga turun mendekati support di tren naik, bukan mengejar saat sudah naik.'],
        [['sl', 'stop loss'], 'Stop loss (SL): batas harga jual otomatis untuk membatasi kerugian bila salah arah.'],
        [['tp', 'take profit'], 'Take profit (TP): target harga untuk mengunci keuntungan.'],
        [['akumulasi'], 'Akumulasi: indikasi pelaku besar mengumpulkan barang pelan-pelan. Di Ewoks dibaca dari pola harga dan volume, lihat /akum KODE.'],
        [['distribusi'], 'Distribusi: kebalikan akumulasi, indikasi pelaku besar melepas barang ke pasar.'],
        [['golden cross'], 'Golden cross: rata-rata bergerak jangka pendek memotong ke atas jangka panjang, sinyal awal tren naik. Lihat /ea.'],
        [['fibonacci', 'fibo'], 'Fibonacci retracement: level koreksi (38,2%, 50%, 61,8%) dari satu ayunan harga untuk mencari area support/resist. Lihat /fibo KODE.'],
        [['scalping', 'scalp'], 'Scalping: trading sangat singkat (menit sampai jam) mengejar selisih kecil. Risiko dan biaya transaksi tinggi.'],
        [['swing'], 'Swing: menahan posisi beberapa hari sampai minggu untuk menangkap satu gelombang harga.'],
        [['leverage'], 'Leverage: memakai dana pinjaman/margin sehingga untung dan rugi membesar. Bisa rugi lebih cepat dari modal.'],
        [['margin call'], 'Margin call: peringatan broker bahwa dana jaminan kurang karena posisi rugi; posisi bisa ditutup paksa.'],
        [['dca', 'dollar cost averaging'], 'DCA: membeli rutin dengan nominal sama berkala, tanpa menebak waktu masuk. Meratakan harga beli.'],
        [['diversifikasi'], 'Diversifikasi: menyebar dana ke beberapa aset agar satu kejadian buruk tidak menghabiskan semuanya.'],
        [['inflasi'], 'Inflasi: kenaikan harga barang secara umum, menggerus daya beli uang yang diam.'],
        [['bi rate', 'suku bunga acuan'], 'BI Rate: suku bunga acuan Bank Indonesia. Naik biasanya menekan harga obligasi dan saham tertentu.'],
        [['likuiditas', 'likuid'], 'Likuiditas: seberapa mudah aset dijual tanpa menggeser harga. Saham sepi transaksi lebih sulit dijual.'],
        [['volume'], 'Volume: jumlah lembar/lot yang diperdagangkan. Pergerakan harga dengan volume besar lebih dipercaya.']
    ];
    function cmdIstilah(args) {
        var q = ' ' + [].concat(args || []).join(' ').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ', hits = [];
        GLOS.forEach(function (g) {
            var best = -1;
            g[0].forEach(function (a) { var i = q.indexOf(' ' + a + ' '); if (i > -1 && (best < 0 || i < best)) best = i; });
            if (best > -1) hits.push([best, g]);
        });
        if (!hits.length) return null;
        // buang entri umum bila yang spesifik sudah ada (mis. "reksa dana" saat "rdpu" disebut)
        var gen = hits.filter(function (h) { return h[1][0][0] === 'reksa dana'; }).length && hits.length > 1;
        hits = hits.filter(function (h) { return !(gen && h[1][0][0] === 'reksa dana'); }).sort(function (a, b) { return a[0] - b[0]; }).slice(0, 4);
        return hits.map(function (h) { return h[1][1]; }).join('\n\n') + '\n\nMau lihat datanya? Coba /rd untuk reksa dana atau /help untuk semua command.';
    }
    async function cmdTop52(args) {
        var mk = mkey([].concat(args || [])[0]) || 'idx', rows, lo, hi, nm = MKT[mk] || 'IHSG', cur = mk === 'idx' ? 'Rp ' : '$';
        if (mk === 'idx') { var d = await jfile('idx-screener.json'); if (!d || !d.rows) return 'Data IHSG belum bisa dimuat. Coba lagi.'; rows = d.rows.filter(function (r) { return r[1] > 50 && r[4] > 0 && r[1] * (r[9] || 0) > 1e9; }).map(function (r) { return { k: r[0], p: r[1], lo: r[4], hi: r[5], n: r[11] }; }); }
        else if (mk === 'global') { var g = await jfile('global-screener.json'); if (!g || !g.rows) return 'Data saham global belum bisa dimuat. Coba lagi.'; rows = g.rows.filter(function (r) { return r[1] > 3 && r[5] > 0 && r[1] * (r[7] || 0) > 5e6; }).map(function (r) { return { k: r[0], p: r[1], lo: r[5], hi: r[6], n: r[10] }; }); }
        else return { text: 'Return tertinggi yang bisa kuhitung baru untuk IHSG dan Saham Global. Pilih:', opts: [['IHSG', '/topreturn idx'], ['Saham Global', '/topreturn global']] };
        rows.forEach(function (x) { x.g = (x.p / x.lo - 1) * 100; });
        rows.sort(function (a, b) { return b.g - a.g; });
        var top = rows.slice(0, 10), idn = function (s) { return mk === 'idx' ? s.replace(/,/g, '.') : s; };
        return idn('Naik paling tinggi dari titik terendah 52 minggu, ' + nm + ' (hanya saham yang cukup likuid):\n' + top.map(function (x, i) { return (i + 1) + '. ' + x.k + '  ' + cur + nf(x.p, x.p < 10 ? 2 : 0) + ' · +' + nf(x.g, 0) + '% dari low ' + cur + nf(x.lo, x.lo < 10 ? 2 : 0) + ' (high ' + cur + nf(x.hi, x.hi < 10 ? 2 : 0) + ')'; }).join('\n') + '\n\nCatatan jujur: data harga yang kusimpan cuma 52 minggu, jadi return 5 tahun belum bisa dihitung. Ini juga bukan return beli-tahan (dihitung dari titik terendah), dan saham yang sudah naik tinggi bisa saja sudah mahal.' + DISC);
    }
    async function cmdTopReturn(args) {
        var a = [].concat(args || []).join(' ').toLowerCase(), mk = mkey([].concat(args || [])[0]) || 'idx', ym = a.match(/(?:^|\s)(1|3|5)(?:\s|$|tahun|thn)/), yrs = ym ? parseInt(ym[1], 10) : 0;
        if (mk !== 'idx' || /52/.test(a) || (!yrs && !/tahun|thn/.test(a))) { if (mk === 'idx' && !/52/.test(a)) yrs = 1; else return cmdTop52(args); }
        if (!yrs) yrs = 1;
        var ret = await jfile('idx-ret.json'), scr = await jfile('idx-screener.json'), st = await jfile('idx-status.json'), col = yrs === 1 ? 0 : yrs === 3 ? 1 : 2;
        if (!ret || !ret.rows || !scr || !scr.rows) { var r52 = await cmdTop52(['idx']); return 'Data return ' + yrs + ' tahun belum tersedia (job penghitungnya belum dijalankan), jadi ini versi 52 minggu:\n\n' + (typeof r52 === 'string' ? r52 : r52.text); }
        var items = st && st.items ? st.items : {}, px = {}; scr.rows.forEach(function (r) { px[r[0]] = r; });
        var list = Object.keys(ret.rows).filter(function (k) { var v = ret.rows[k][col], r = px[k]; return v != null && r && r[1] > 50 && r[1] * (r[9] || 0) > 1e9 && !(items[k] || []).some(function (f) { return f[0] === 'DELIST' || f[0] === 'SUSPEN'; }); }).map(function (k) { return { k: k, g: ret.rows[k][col], p: px[k][1], n: px[k][11] }; }).sort(function (x, y) { return y.g - x.g; }).slice(0, 10);
        var opts = [1, 3, 5].filter(function (y) { return y !== yrs; }).map(function (y) { return ['Return ' + y + ' tahun', '/topreturn idx ' + y]; }).concat([['52 minggu', '/topreturn idx 52']]);
        if (!list.length) return { text: 'Belum ada saham yang punya riwayat cukup untuk ' + yrs + ' tahun.', opts: opts };
        return { text: ('Return tertinggi ' + yrs + ' tahun terakhir, saham IHSG yang masih aktif dan cukup likuid (data per ' + ret.asOf + '):\n' + list.map(function (x, i) { return (i + 1) + '. ' + x.k + (x.n ? ' (' + x.n + ')' : '') + '  +' + nf(x.g, 0).replace(/,/g, '.') + '% · harga sekarang Rp ' + nf(x.p, 0).replace(/,/g, '.'); }).join('\n') + '\n\nCatatan: dihitung dari harga penyesuaian bulanan Yahoo (memasukkan split dan dividen), jadi bisa sedikit beda dari aplikasi sekuritas. Saham yang sudah naik tinggi bisa saja sudah mahal, dan angka ini tidak menjamin hasil ke depan.' + DISC), opts: opts };
    }
    window.EwoksChatCmds = {
        run: function (name, args) {
            args = args || [];
            switch (name) {
                case 'akum': case 'bandar': return cmdAkum(args);
                case 'topakum': return cmdTopAkum(args);
                case 'ea': return cmdEA(args, false);
                case 'eaus': return cmdEA(args, true);
                case 'lk': return fundMain(args, 'lk', false);
                case 'lkus': return fundMain(args, 'lk', true);
                case 'analisa': return fundMain(args, 'analisa', false);
                case 'analisaus': return fundMain(args, 'analisa', true);
                case 'fibo': return cmdFibo(args, false);
                case 'fibous': return cmdFibo(args, true);
                case 'global': case 'scalpglobal': return cmdGlobal(args);
                case 'globalcrypto': return cmdGlobal(['kripto'].concat(args));
                case 'globalforex': return cmdGlobal(['forex'].concat(args));
                case 'rd': case 'reksadana': return cmdRd(args);
                case 'istilah': return cmdIstilah(args);
                case 'topreturn': return cmdTopReturn(args);
            }
            return null;
        }
    };
})();
