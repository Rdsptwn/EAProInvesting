import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', locale: 'en-US' });
const pg = await ctx.newPage();
await pg.goto('https://www.idx.id/en/market-data/trading-summary/stock-summary/', { waitUntil: 'networkidle', timeout: 45000 }); await pg.waitForTimeout(4000);
const C = [
  '/primary/TradingSummary/GetStockSummary?length=9999&start=0&date=20261110',
  '/primary/TradingSummary/GetStockSummary?length=9999&start=0',
  '/primary/TradingSummary/GetIndexSummary?length=9999&start=0&date=20261110',
  '/primary/TradingSummary/GetIndexSummary?length=9999&start=0',
  '/primary/DigitalStatistic/GetApiData?urlName=LINK_STOCK_SUMMARY&query=&isPrint=False&cumulative=false',
  '/primary/Home/GetMarketSummary',
  '/primary/Home/GetIndexList?indexCode=COMPOSITE',
  '/primary/TradingSummary/GetMarketSummary',
  '/primary/StockData/GetTradingSummary',
];
for (const u of C) {
  const r = await pg.evaluate(async (u) => { try { const x = await fetch(u, { headers: { Accept: 'application/json' } }); return x.status + ' ' + (await x.text()).slice(0, 450).replace(/\s+/g, ' '); } catch (e) { return 'ERR ' + e.message; } }, u);
  console.log('CAND', u, '=>', r.slice(0, 480));
}
await b.close();
