// ফোনের মাপে এন্ড-টু-এন্ড টেস্ট (Playwright + ডেমো ব্যাকএন্ড)।
// চালান: npm run test:e2e   (Playwright ও Chromium আগে থেকে ইনস্টল থাকতে হবে)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../serve.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('@playwright/test')); }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, '..', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const PHONES = [
  { name: 'phone-360', width: 360, height: 740 },
  { name: 'phone-390', width: 390, height: 844 },
];
const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse('2026-11-05T06:00:00Z'); // ১১:৩০ IST, ৫ নভেম্বর ২০২৬

let passed = 0;
const failures = [];
async function step(name, fn) {
  try { await fn(); passed++; console.log('  ✓ ' + name); } catch (e) { failures.push(name); console.log('  ✗ ' + name + '\n    ' + e.message); }
}

async function noHorizontalScroll(page, where) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(over <= 0, `${where}: পাশে স্ক্রল হচ্ছে (${over}px)`);
}

async function setNow(page, ms) {
  await page.addInitScript((t) => { window.__KHATA_NOW__ = t; }, ms);
}

async function fill(page, label, value) {
  const scope = (await page.locator('.sheet').count()) ? page.locator('.sheet') : page;
  await scope.getByLabel(label, { exact: false }).first().fill(String(value));
}

async function submitSheet(page) {
  await page.locator('.sheet button[type=submit]').click();
  try {
    await page.locator('.sheet-backdrop').waitFor({ state: 'detached' });
  } catch (e) {
    const msg = await page.locator('.sheet .error-msg').innerText().catch(() => '');
    await page.locator('.sheet [data-cancel]').click().catch(() => {});
    throw new Error('ফর্ম জমা হয়নি: ' + msg);
  }
}

async function runPhone(browser, server, phone) {
  console.log(`\n${phone.name} (${phone.width}x${phone.height})`);
  const base = `http://127.0.0.1:${server.address().port}`;
  const ctx = await browser.newContext({
    viewport: { width: phone.width, height: phone.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'bn-IN',
  });
  ctx.setDefaultTimeout(8000);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setNow(page, T0);
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${phone.name}-${n}.png`), fullPage: false });

  await step('লগইন পাতা বাংলায় খোলে', async () => {
    await page.goto(base + '/');
    await page.getByRole('heading', { name: 'ব্যবসার খাতা' }).waitFor();
    await noHorizontalScroll(page, 'লগইন');
    await shot('01-login');
  });

  await step('সাইনআপ করলে প্রথম দিন থেকেই ১৫ দিন দেখায়', async () => {
    await page.getByRole('tab', { name: 'নতুন অ্যাকাউন্ট' }).click();
    await fill(page, 'ব্যবসার নাম', 'মা কালী ভাণ্ডার');
    await fill(page, 'আপনার নাম', 'সুচন্দ্রা');
    await fill(page, 'মোবাইল নম্বর', '9876543210');
    await fill(page, 'ইমেইল', 'shop1@test.in');
    await fill(page, 'পাসওয়ার্ড', 'secret123');
    await page.getByRole('button', { name: 'অ্যাকাউন্ট খুলুন' }).click();
    const banner = page.locator('#validity');
    await banner.waitFor();
    const text = await banner.innerText();
    assert.match(text, /ফ্রি মেয়াদ: আর ১৫ দিন বাকি/);
    assert.match(text, /২০ নভেম্বর ২০২৬/);
    await noHorizontalScroll(page, 'হোম');
    await shot('02-home-empty');
  });

  await step('স্টকে জিনিস যোগ', async () => {
    await page.locator('.bottom-nav').getByRole('button', { name: /স্টক/ }).click();
    await page.getByRole('button', { name: /নতুন জিনিস/ }).click();
    await fill(page, 'জিনিসের নাম', 'চাল');
    await fill(page, 'একক', 'কেজি');
    await fill(page, 'কতগুলো আছে', '50');
    await fill(page, 'কেনা দাম', '40');
    await fill(page, 'বিক্রির দাম', '60');
    await fill(page, 'কত হলে সতর্ক', '10');
    await submitSheet(page);
    await page.locator('.item', { hasText: 'চাল' }).waitFor();
    assert.match(await page.locator('.item', { hasText: 'চাল' }).innerText(), /৫০ কেজি/);
    await noHorizontalScroll(page, 'স্টক');
  });

  await step('খদ্দের যোগ, পাশে কল ও WhatsApp বোতাম', async () => {
    await page.locator('.bottom-nav').getByRole('button', { name: /খদ্দের/ }).click();
    await page.getByRole('button', { name: /নতুন খদ্দের/ }).click();
    await fill(page, 'নাম', 'রহিম শেখ');
    await fill(page, 'মোবাইল নম্বর', '৯৮৩০০ ১২৩৪৫');
    await fill(page, 'ঠিকানা', 'বড়বাজার, কলকাতা');
    await submitSheet(page);
    const card = page.locator('.item', { hasText: 'রহিম শেখ' });
    await card.waitFor();
    const call = card.locator('[data-contact=call]');
    const wa = card.locator('[data-contact=wa]');
    assert.equal(await call.getAttribute('href'), 'tel:+919830012345');
    assert.match(await wa.getAttribute('href'), /^https:\/\/wa\.me\/919830012345\?text=/);
    // বোতামগুলো নামের পাশে একই সারিতে
    const nameBox = await card.locator('.item-title').boundingBox();
    const waBox = await wa.boundingBox();
    assert.ok(Math.abs(nameBox.y - waBox.y) < 40, 'WhatsApp বোতাম নামের পাশে নেই');
    assert.ok(waBox.x + waBox.width <= phone.width, 'বোতাম স্ক্রিনের বাইরে');
    assert.ok(waBox.height >= 44, 'বোতাম ছোট, আঙুলে চাপা কঠিন');
    // ফোন নম্বর ছাড়া খদ্দের: বোতাম নেই
    await page.getByRole('button', { name: /নতুন খদ্দের/ }).click();
    await fill(page, 'নাম', 'নম্বরহীন');
    await submitSheet(page);
    assert.equal(await page.locator('.item', { hasText: 'নম্বরহীন' }).locator('[data-contact]').count(), 0);
    await noHorizontalScroll(page, 'খদ্দের');
    await shot('03-clients');
  });

  await step('বিক্রি: স্টক কমে, বাকি দেখায়', async () => {
    await page.locator('.bottom-nav').getByRole('button', { name: /বিক্রি/ }).click();
    await page.locator('.fab').click();
    await page.getByLabel('স্টকের জিনিস').selectOption({ label: 'চাল (৫০ কেজি আছে)' });
    await fill(page, 'পরিমাণ', '5');
    assert.equal(await page.getByLabel('মোট দাম').inputValue(), '300');
    await fill(page, 'কত টাকা পেয়েছেন', '200');
    await page.getByLabel('খদ্দের').selectOption({ label: 'রহিম শেখ' });
    await submitSheet(page);
    const card = page.locator('.item', { hasText: 'চাল' }).first();
    assert.match(await card.innerText(), /বাকি ₹১০০/);
    await page.locator('.bottom-nav').getByRole('button', { name: /স্টক/ }).click();
    assert.match(await page.locator('.item', { hasText: 'চাল' }).innerText(), /৪৫ কেজি/);
    await page.locator('.bottom-nav').getByRole('button', { name: /খদ্দের/ }).click();
    assert.match(await page.locator('.item', { hasText: 'রহিম শেখ' }).innerText(), /বাকি ₹১০০/);
  });

  await step('খরচ যোগ', async () => {
    await page.locator('.bottom-nav').getByRole('button', { name: /খরচ/ }).click();
    await page.locator('.fab').click();
    await page.getByLabel('খরচের ধরন').selectOption('ভাড়া');
    await fill(page, 'টাকা', '1500');
    await fill(page, 'বিবরণ', 'দোকান ভাড়া');
    await submitSheet(page);
    assert.match(await page.locator('.item', { hasText: 'ভাড়া' }).innerText(), /₹১,৫০০/);
    await noHorizontalScroll(page, 'খরচ');
  });

  await step('বাকি কিস্তি (EMI) যোগ ও শোধ', async () => {
    await page.locator('.bottom-nav').getByRole('button', { name: /কিস্তি/ }).click();
    await page.locator('.fab').click();
    await fill(page, 'কার সঙ্গে', 'স্টেট ব্যাংক লোন');
    await fill(page, 'প্রতি কিস্তির টাকা', '2000');
    await fill(page, 'মোট কিস্তি সংখ্যা', '12');
    await fill(page, 'এর মধ্যে শোধ হয়েছে', '3');
    await page.getByLabel('পরের কিস্তির তারিখ').fill('2026-11-10');
    await submitSheet(page);
    const card = page.locator('.item', { hasText: 'স্টেট ব্যাংক লোন' });
    assert.match(await card.innerText(), /বাকি ৯টি = ₹১৮,০০০/);
    await card.getByRole('button', { name: 'একটি কিস্তি শোধ' }).click();
    await page.waitForFunction(() => /বাকি ৮টি/.test(document.body.innerText));
    assert.match(await page.locator('.item', { hasText: 'স্টেট ব্যাংক লোন' }).innerText(), /১০ ডিসেম্বর ২০২৬/);
    await noHorizontalScroll(page, 'কিস্তি');
    await shot('04-emi');
  });

  await step('হোমে হিসাবের সারাংশ', async () => {
    await page.locator('.bottom-nav').getByRole('button', { name: /হোম/ }).click();
    const t = await page.locator('#stats').innerText();
    assert.match(t, /আজকের বিক্রি\s*₹৩০০/);
    assert.match(t, /এই মাসের খরচ\s*₹১,৫০০/);
    assert.match(t, /এই মাসের লাভ\s*-₹১,২০০/);
    assert.match(t, /কিস্তি দিতে বাকি\s*₹১৬,০০০/);
    await noHorizontalScroll(page, 'হোম');
    await shot('05-home');
  });

  await step('ফ্রি মেয়াদে মতামত পাঠানো যায়', async () => {
    await page.locator('#menuBtn').click();
    await page.getByRole('button', { name: /মতামত দিন/ }).click();
    await fill(page, 'মতামত', 'খুব কাজের অ্যাপ। রিপোর্ট PDF চাই।');
    await submitSheet(page);
    await page.locator('#toast.show').waitFor();
    assert.match(await page.locator('#toast').innerText(), /ধন্যবাদ/);
  });

  await step('XSS: খদ্দেরের নামে HTML চলে না', async () => {
    await page.locator('.bottom-nav').getByRole('button', { name: /খদ্দের/ }).click();
    await page.getByRole('button', { name: /নতুন খদ্দের/ }).click();
    await fill(page, 'নাম', '<img src=x onerror="window.__pwned=1">');
    await submitSheet(page);
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
  });

  // ---- দ্বিতীয় ইউজার: আলাদা ডেটা ----
  await step('অন্য ইউজার প্রথম ইউজারের ডেটা দেখে না', async () => {
    await page.locator('#menuBtn').click();
    await page.getByRole('button', { name: 'লগআউট' }).click();
    await page.getByRole('tab', { name: 'নতুন অ্যাকাউন্ট' }).click();
    await fill(page, 'ব্যবসার নাম', 'দ্বিতীয় দোকান');
    await fill(page, 'ইমেইল', 'shop2@test.in');
    await fill(page, 'পাসওয়ার্ড', 'secret123');
    await page.getByRole('button', { name: 'অ্যাকাউন্ট খুলুন' }).click();
    await page.locator('#validity').waitFor();
    await page.locator('.bottom-nav').getByRole('button', { name: /খদ্দের/ }).click();
    assert.equal(await page.locator('.item').count(), 0);
    await page.locator('.bottom-nav').getByRole('button', { name: /স্টক/ }).click();
    assert.equal(await page.locator('.item').count(), 0);
    await page.locator('#menuBtn').click();
    await page.getByRole('button', { name: 'লগআউট' }).click();
  });

  // ---- ১৬ দিন পরে: লক ----
  const page2 = await ctx.newPage();
  page2.on('pageerror', (e) => errors.push(e.message));
  await setNow(page2, T0 + 16 * DAY);
  await step('১৫ দিন পর অ্যাপ লক, ডেটা নিরাপদ বার্তা', async () => {
    await page2.goto(base + '/');
    await fill(page2, 'ইমেইল', 'shop1@test.in');
    await fill(page2, 'পাসওয়ার্ড', 'secret123');
    await page2.getByRole('button', { name: 'লগইন করুন' }).click();
    await page2.locator('[data-screen=locked]').waitFor();
    const t = await page2.locator('[data-screen=locked]').innerText();
    assert.match(t, /মেয়াদ শেষ/);
    assert.match(t, /নিরাপদে রাখা আছে/);
    assert.equal(await page2.locator('.bottom-nav').count(), 0);
    assert.match(await page2.getByRole('link', { name: /WhatsApp এ অ্যাক্টিভেশন/ }).getAttribute('href'), /wa\.me\/919800000000/);
    await noHorizontalScroll(page2, 'লক');
    await page2.screenshot({ path: path.join(SHOTS, `${phone.name}-06-locked.png`) });
  });

  // ---- অ্যাডমিন ----
  const admin = await ctx.newPage();
  admin.on('pageerror', (e) => errors.push(e.message));
  await setNow(admin, T0 + 16 * DAY);
  await step('অ্যাডমিন প্যানেলে ইউজার ও মতামত দেখা ও অ্যাক্টিভেট', async () => {
    await admin.goto(base + '/');
    await admin.getByRole('tab', { name: 'নতুন অ্যাকাউন্ট' }).click();
    await fill(admin, 'ব্যবসার নাম', 'অ্যাডমিন');
    await fill(admin, 'ইমেইল', 'admin@test.in');
    await fill(admin, 'পাসওয়ার্ড', 'secret123');
    await admin.getByRole('button', { name: 'অ্যাকাউন্ট খুলুন' }).click();
    await admin.locator('#validity').waitFor();
    await admin.goto(base + '/admin');
    await admin.getByRole('heading', { name: 'অ্যাডমিন প্যানেল' }).waitFor();
    const card = admin.locator('.item', { hasText: 'shop1@test.in' });
    assert.match(await card.innerText(), /লক/);
    await noHorizontalScroll(admin, 'অ্যাডমিন');
    await admin.screenshot({ path: path.join(SHOTS, `${phone.name}-07-admin.png`) });
    await admin.getByRole('tab', { name: /মতামত/ }).click();
    assert.match(await admin.locator('main').innerText(), /রিপোর্ট PDF চাই/);
    await admin.getByRole('tab', { name: 'ইউজার' }).click();
    await admin.locator('.item', { hasText: 'shop1@test.in' }).getByRole('button', { name: 'অ্যাক্টিভেট' }).click();
    await admin.getByLabel('কত দিনের জন্য').selectOption('365');
    await submitSheet(admin);
    await admin.waitForFunction(() => /সক্রিয় \(/.test(document.querySelector('[data-user="shop1@test.in"]').innerText));
  });

  await step('সাধারণ ইউজার অ্যাডমিন প্যানেলে ঢুকতে পারে না', async () => {
    const p = await ctx.newPage();
    await setNow(p, T0);
    await p.goto(base + '/admin');
    await fill(p, 'ইমেইল', 'shop2@test.in');
    await fill(p, 'পাসওয়ার্ড', 'secret123');
    await p.getByRole('button', { name: 'লগইন' }).click();
    await p.getByText('অ্যাডমিন অনুমতি নেই').waitFor();
    await p.close();
  });

  await step('অ্যাক্টিভেশনের পর পুরনো সব ডেটা ফিরে আসে', async () => {
    await page2.getByRole('button', { name: 'অ্যাক্টিভেট হয়েছে কিনা দেখুন' }).click();
    await page2.locator('#validity').waitFor();
    assert.match(await page2.locator('#validity').innerText(), /অ্যাকাউন্ট সক্রিয়/);
    await page2.locator('.bottom-nav').getByRole('button', { name: /খদ্দের/ }).click();
    await page2.locator('.item', { hasText: 'রহিম শেখ' }).waitFor();
    await page2.locator('.bottom-nav').getByRole('button', { name: /স্টক/ }).click();
    assert.match(await page2.locator('.item', { hasText: 'চাল' }).innerText(), /৪৫ কেজি/);
    // অ্যাক্টিভেট অবস্থায় (ফ্রি মেয়াদ শেষ) মতামতের অপশন নেই
    await page2.locator('#menuBtn').click();
    assert.equal(await page2.getByRole('button', { name: /মতামত দিন/ }).count(), 0);
    await page2.getByRole('button', { name: 'বন্ধ করুন' }).click();
    await page2.screenshot({ path: path.join(SHOTS, `${phone.name}-08-reactivated.png`) });
  });

  await step('পাতায় কোনো জাভাস্ক্রিপ্ট এরর নেই', async () => {
    assert.deepEqual(errors, []);
  });
  await ctx.close();
}

const server = await startServer(0);
const browser = await chromium.launch();
try {
  for (const phone of PHONES) await runPhone(browser, server, phone);
} finally {
  await browser.close();
  server.close();
}
console.log(`\nমোট: ${passed} পাস, ${failures.length} ফেল`);
if (failures.length) process.exit(1);
