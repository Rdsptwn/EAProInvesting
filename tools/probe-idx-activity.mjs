/** PROBE sementara #2: coba varian parameter API statistik BEI dari dalam konteks halaman (cookie sama). */
import { chromium } from 'playwright';
const PAGE = 'https://www.idx.id/en/market-data/statistical-reports/digital-statistic/monthly/equity-trading-by-market/daily-stock-trading-by-type-of-market';
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', locale: 'en-US' });
const pg = await ctx.newPage();
pg.on('request', (r) => { if (/GetApiData/.test(r.url())) console.log('REQ', r.method(), r.url(), JSON.stringify(r.headers()).slice(0, 400)); });
await pg.goto(PAGE, { waitUntil: 'networkidle', timeout: 60000 });
await pg.waitForTimeout(4000);
console.log('INPUTS:', await pg.evaluate(() => [...document.querySelectorAll('input,button,select')].map((e) => e.outerHTML.slice(0, 200)).join('\n')));
const variants = [
  'query=undefined', 'query=', 'query=2026-11-10', 'query=20261110', 'query=10/11/2026', 'query=11/10/2026',
  'query=%7B%22date%22%3A%222026-11-10%22%7D', 'query=2026-11-10&query2=2026-11-10',
];
for (const v of variants) {
  const u = `/primary/DigitalStatistic/GetApiData?urlName=LINK_DAILY_TRADING_MARKET_REGNONREG&${v}&isPrint=False&cumulative=false`;
  const r = await pg.evaluate(async (u) => { try { const x = await fetch(u, { headers: { Accept: 'application/json' } }); return x.status + ' ' + (await x.text()).slice(0, 500).replace(/\s+/g, ' '); } catch (e) { return 'ERR ' + e.message; } }, u);
  console.log('VAR', v, '=>', r.slice(0, 520));
}
// coba klik tombol Apply
try { await pg.getByText('Apply', { exact: false }).first().click({ timeout: 5000 }); await pg.waitForTimeout(5000); console.log('TABLE AFTER APPLY:', await pg.evaluate(() => [...document.querySelectorAll('table')].map((t) => t.innerText.replace(/\t/g, ' | ')).join('\n----\n')).then((s) => s.slice(0, 1500))); } catch (e) { console.log('apply err', e.message); }
await b.close();
