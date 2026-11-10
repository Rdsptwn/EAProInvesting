import { chromium } from 'playwright';
const PAGE = 'https://www.idx.id/en/market-data/statistical-reports/digital-statistic/monthly/equity-trading-by-market/daily-stock-trading-by-type-of-market';
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', locale: 'en-US' });
const pg = await ctx.newPage();
pg.on('request', (r) => { if (/GetApiData/.test(r.url())) console.log('REQ', r.url()); });
await pg.goto(PAGE, { waitUntil: 'networkidle', timeout: 60000 }); await pg.waitForTimeout(3000);
for (const v of ['2026-11', '202611', '11-2026', '2026/11', '2026-11-01', '11/2026', 'Nov 2026', 'November 2026', '2026-11-30', '112026']) {
  const u = `/primary/DigitalStatistic/GetApiData?urlName=LINK_DAILY_TRADING_MARKET_REGNONREG&query=${encodeURIComponent(v)}&isPrint=False&cumulative=false`;
  const r = await pg.evaluate(async (u) => { try { const x = await fetch(u); const t = await x.text(); const d = [...t.matchAll(/"date":"([0-9-]+)"/g)].map((m) => m[1]); return x.status + ' n=' + d.length + ' first=' + d[0] + ' last=' + d[d.length - 1] + (x.ok ? '' : ''); } catch (e) { return 'ERR ' + e.message; } }, u);
  console.log('VAR', v, '=>', r);
}
// UI: pilih bulan lewat date picker
try {
  await pg.click('input.mx-input', { timeout: 5000 }); await pg.waitForTimeout(800);
  console.log('PICKER:', await pg.evaluate(() => (document.querySelector('.mx-datepicker-popup')||{}).innerText));
  const cells = await pg.$$('.mx-table-month td'); console.log('month cells', cells.length);
  if (cells.length) { await cells[10].click(); await pg.waitForTimeout(500); }
  console.log('INPUT VALUE', await pg.inputValue('input.mx-input'));
  await pg.getByText('Apply').first().click(); await pg.waitForTimeout(4000);
} catch (e) { console.log('ui err', e.message); }
await b.close();
