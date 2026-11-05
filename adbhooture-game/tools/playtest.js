#!/usr/bin/env node
/*
 * অদ্ভুতুড়ে: ফোন-মাপে আসল ব্রাউজারে এলোমেলো খেলা।
 * প্রতিটা রাউন্ডে নতুন রাত শুরু করে, এলোমেলো পছন্দ বেছে সমাপ্তি পর্যন্ত যায়,
 * কনসোল-ত্রুটি আর আড়াআড়ি স্ক্রল খোঁজে, স্ক্রিনশট রাখে।
 * চালাও:  node adbhooture-game/tools/playtest.js [রাউন্ড] [স্ক্রিনশট-ফোল্ডার]
 */
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RUNS = +process.argv[2] || 6;
const OUT = process.argv[3] || path.join(require('os').tmpdir(), 'adbhooture-shots');
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push(m.text()); });
  await page.goto(url + '?reset=1');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'title.png') });

  const endings = new Set();
  let failures = 0;
  for (let r = 0; r < RUNS; r++) {
    await page.goto(url);
    await page.click('#btn-new');
    let steps = 0;
    while (steps++ < 80) {
      await page.waitForTimeout(150);
      // finish reveal
      await page.click('#passage', { force: true }).catch(() => {});
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (overflow) { errs.push('horizontal overflow at step ' + steps); }
      if (await page.locator('#scr-ending.active').count()) break;
      const btns = page.locator('#choices button:visible');
      const n = await btns.count();
      if (!n) { await page.waitForTimeout(600); if (!(await btns.count())) { errs.push('no choices visible at step ' + steps + ' node ' + (await page.evaluate(() => window.GAME && GAME.state && GAME.state.node))); failures++; break; } continue; }
      if (r === 0 && steps <= 4) await page.screenshot({ path: path.join(OUT, `run0-step${steps}.png`) });
      await btns.nth(Math.floor(Math.random() * n)).click();
    }
    await page.waitForTimeout(600);
    const title = await page.locator('#end-title').textContent().catch(() => '');
    endings.add(title);
    await page.screenshot({ path: path.join(OUT, `end-${r}.png`), fullPage: false });
    console.log(`রাউন্ড ${r + 1}: ${steps} ধাপ, সমাপ্তি: ${title}`);
  }
  await browser.close();
  server.close();
  console.log('আলাদা সমাপ্তি:', endings.size);
  if (errs.length || failures) { console.log('ত্রুটি:\n  ' + [...new Set(errs)].join('\n  ')); process.exit(1); }
  console.log('✓ কোনো ত্রুটি নেই, আড়াআড়ি স্ক্রল নেই। স্ক্রিনশট:', OUT);
})().catch(e => { console.error(e); process.exit(1); });
