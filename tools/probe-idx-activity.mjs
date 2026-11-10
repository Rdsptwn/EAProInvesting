import { chromium } from 'playwright';
const PAGE = 'https://www.idx.id/en/market-data/statistical-reports/digital-statistic/monthly/equity-trading-by-market/daily-stock-trading-by-type-of-market';
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', locale: 'en-US' });
const pg = await ctx.newPage();
pg.on('request', (r) => { if (/GetApiData/.test(r.url())) console.log('REQ', r.url()); });
await pg.goto(PAGE, { waitUntil: 'networkidle', timeout: 60000 }); await pg.waitForTimeout(3000);
// UI: pilih bulan lewat date picker
try {
  await pg.click('input.mx-input'); await pg.waitForTimeout(800);
  console.log('MONTH CELLS:', await pg.evaluate(() => [...document.querySelectorAll('.mx-table-month td')].map((c) => c.outerHTML.slice(0, 140)).join('\n')));
  await pg.locator('.mx-table-month td', { hasText: 'Oct' }).first().click(); await pg.waitForTimeout(800);
  console.log('INPUT VALUE', await pg.inputValue('input.mx-input'));
  await pg.getByText('Apply').first().click(); await pg.waitForTimeout(5000);
  console.log('TABLE', (await pg.evaluate(() => document.querySelectorAll('table')[0]?.innerText || '')).slice(0, 600));
  // November (bulan berjalan)
  await pg.click('input.mx-input'); await pg.waitForTimeout(800);
  await pg.locator('.mx-table-month td', { hasText: 'Nov' }).first().click(); await pg.waitForTimeout(800);
  console.log('INPUT VALUE NOV', await pg.inputValue('input.mx-input'));
  await pg.getByText('Apply').first().click(); await pg.waitForTimeout(5000);
  console.log('TABLE NOV', (await pg.evaluate(() => document.querySelectorAll('table')[0]?.innerText || '')).slice(0, 900));
} catch (e) { console.log('ui err', e.message); }
await b.close();
