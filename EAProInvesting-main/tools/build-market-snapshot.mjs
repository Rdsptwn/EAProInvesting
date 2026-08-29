/**
 * Snapshot IHSG + harga emiten IDX (Yahoo Finance) untuk beranda & peta konglo.
 * Jalankan: node tools/build-market-snapshot.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'assets/js/pages/page-konglo-data-funda.js');
const outPath = path.join(root, 'assets/data/market-snapshot.json');

const UA = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'application/json',
};

const src = fs.readFileSync(srcPath, 'utf8');
const tickers = [...new Set([...src.matchAll(/ticker:\s*"([A-Z0-9]+)"/g)].map((m) => m[1]))].sort();

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function roundTick(price) {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return null;
    if (p < 200) return Math.round(p);
    if (p < 500) return Math.round(p / 2) * 2;
    if (p < 2000) return Math.round(p / 5) * 5;
    if (p < 5000) return Math.round(p / 10) * 10;
    return Math.round(p / 25) * 25;
}

async function fetchChart(symbol, range = '3mo') {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`${symbol} ${res.status}`);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error(`${symbol} empty`);
    return result;
}

function quoteFromChart(result) {
    const meta = result.meta || {};
    const closes = (result.indicators?.quote?.[0]?.close || []).filter((v) => Number.isFinite(v) && v > 0);
    const price = Number(meta.regularMarketPrice);
    const prev = Number(meta.chartPreviousClose ?? meta.previousClose);
    const last = Number.isFinite(price) && price > 0 ? price : closes[closes.length - 1];
    const prevClose = Number.isFinite(prev) && prev > 0 ? prev : closes[closes.length - 2];
    const changePct =
        Number.isFinite(last) && Number.isFinite(prevClose) && prevClose > 0
            ? +(((last - prevClose) / prevClose) * 100).toFixed(2)
            : null;
    const win20 = closes.slice(-20);
    const win50 = closes.slice(-50);
    const low20 = win20.length ? Math.min(...win20) : null;
    const high20 = win20.length ? Math.max(...win20) : null;
    const sma50 = win50.length ? win50.reduce((a, b) => a + b, 0) / win50.length : null;
    return {
        price: Number.isFinite(last) ? +last.toFixed(2) : null,
        prevClose: Number.isFinite(prevClose) ? +prevClose.toFixed(2) : null,
        changePct,
        high52: Number(meta.fiftyTwoWeekHigh) || null,
        low52: Number(meta.fiftyTwoWeekLow) || null,
        support: roundTick(low20),
        resistance: roundTick(high20),
        avg: roundTick(sma50),
        currency: meta.currency || 'IDR',
    };
}

async function fetchOneIdx(ticker) {
    const result = await fetchChart(`${ticker}.JK`, '6mo');
    return quoteFromChart(result);
}

const quotes = {};
let ihsg = null;
let usdIdr = null;
let id10y = null;

try {
    const r = await fetchChart('^JKSE', '3mo');
    ihsg = quoteFromChart(r);
} catch (e) {
    console.warn('IHSG', e.message);
    try {
        const r = await fetchChart('COMPOSITE.JK', '3mo');
        ihsg = quoteFromChart(r);
    } catch (e2) {
        console.warn('COMPOSITE.JK', e2.message);
    }
}

try {
    const r = await fetchChart('USDIDR=X', '5d');
    usdIdr = quoteFromChart(r);
} catch (e) {
    console.warn('USDIDR', e.message);
}

try {
    const r = await fetchChart('ID10Y.F', '5d');
    id10y = quoteFromChart(r);
} catch (_) {
    try {
        const r = await fetchChart('^ID10Y', '5d');
        id10y = quoteFromChart(r);
    } catch (e) {
        console.warn('ID10Y', e.message);
    }
}

for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    try {
        quotes[t] = await fetchOneIdx(t);
        process.stdout.write(`ok ${t} ${quotes[t].price}\n`);
    } catch (e) {
        console.warn(`skip ${t}`, e.message);
    }
    await sleep(120);
}

const snapshot = {
    meta: {
        source: 'Yahoo Finance',
        built: new Date().toISOString(),
        tz: 'WIB',
        tickerCount: Object.keys(quotes).length,
    },
    ihsg,
    usdIdr,
    id10y,
    quotes,
};

fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
console.log(`Wrote ${outPath} (${snapshot.meta.tickerCount} quotes)`);
