import { chromium } from 'playwright';
const PAGES = [
  'https://www.idx.id/en/',
  'https://www.idx.id/en/market-data/trading-summary/stock-summary/',
  'https://www.idx.id/en/market-data/market-summary/',
  'https://www.idx.id/en/market-data/trading-summary/',
];
const b = await chromium.launch();
for (const url of PAGES) {
  console.log('\n=== PAGE', url);
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', locale: 'en-US' });
  const pg = await ctx.newPage();
  pg.on('response', async (r) => {
    const u = r.url();
    if (/\/primary\//.test(u) && !/home\/content/.test(u)) { let t = ''; try { t = (await r.text()).slice(0, 500).replace(/\s+/g, ' '); } catch {} console.log('RESP', r.status(), u.replace('https://www.idx.id', ''), '\n    ', t); }
  });
  try {
    const x = await pg.goto(url, { waitUntil: 'networkidle', timeout: 45000 }); console.log('status', x?.status());
    await pg.waitForTimeout(5000);
    console.log('TEXT:', (await pg.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 700));
  } catch (e) { console.log('ERR', e.message); }
  await ctx.close();
}
await b.close();
