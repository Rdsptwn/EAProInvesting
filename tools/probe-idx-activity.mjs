/**
 * PROBE sementara: buka halaman statistik BEI di browser headless dan cetak semua respons JSON + isi tabel,
 * supaya parser build-market-activity.mjs bisa dibuat sesuai bentuk data sebenarnya. Jalankan di GitHub Actions.
 */
import { chromium } from 'playwright';
const PAGES = [
  'https://www.idx.id/en/market-data/statistical-reports/digital-statistic/monthly/equity-trading-by-market/daily-stock-trading-by-type-of-market',
  'https://www.idx.co.id/en/market-data/statistical-reports/digital-statistic/monthly/equity-trading-by-market/daily-stock-trading-by-type-of-market',
  'https://www.idx.co.id/en/market-data/trading-summary/stock-summary',
];
const b = await chromium.launch();
for (const url of PAGES) {
  console.log('\n=== PAGE', url);
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', locale: 'en-US' });
  const pg = await ctx.newPage();
  pg.on('response', async (r) => {
    const u = r.url(); const ct = r.headers()['content-type'] || '';
    if (/idx\.(co\.)?id|idx/.test(new URL(u).host) && (ct.includes('json') || /api|primary|GetStock|Summary/i.test(u))) {
      let body = ''; try { body = (await r.text()).slice(0, 700); } catch {}
      console.log('RESP', r.status(), u, '\n   ', body.replace(/\s+/g, ' '));
    }
  });
  try {
    const resp = await pg.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('status', resp?.status());
    await pg.waitForTimeout(6000);
    const txt = await pg.evaluate(() => [...document.querySelectorAll('table')].map((t) => t.innerText.replace(/\t/g, ' | ')).join('\n----\n'));
    console.log('TABLES:\n', txt.slice(0, 3000));
    console.log('TITLE:', await pg.title());
  } catch (e) { console.log('ERR', e.message); }
  await ctx.close();
}
await b.close();
