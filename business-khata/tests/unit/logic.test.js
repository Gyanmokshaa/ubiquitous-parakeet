import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../public/js/logic.js';

const DAY = L.DAY_MS;

test('বাংলা অঙ্ক রূপান্তর', () => {
  assert.equal(L.toBnDigits(2026), '২০২৬');
  assert.equal(L.fromBnDigits('১২৩'), '123');
  assert.equal(L.parseNumber('১,২৫০.৫'), 1250.5);
  assert.equal(L.parseNumber('₹ 500'), 500);
  assert.equal(L.parseNumber(''), 0);
  assert.ok(Number.isNaN(L.parseNumber('abc')));
});

test('ভারতীয় কমা ও টাকা', () => {
  assert.equal(L.formatNumber(1234567), '১২,৩৪,৫৬৭');
  assert.equal(L.formatNumber(999), '৯৯৯');
  assert.equal(L.formatNumber(1000), '১,০০০');
  assert.equal(L.formatNumber(12.5), '১২.৫');
  assert.equal(L.formatNumber(-2500), '-২,৫০০');
  assert.equal(L.formatMoney(100000), '₹১,০০,০০০');
});

test('তারিখ বাংলায়, ভারতের সময়ে', () => {
  assert.equal(L.formatDateBn('2026-11-20'), '২০ নভেম্বর ২০২৬');
  // UTC তে ৪ নভেম্বর রাত ২০:০০ = IST এ ৫ নভেম্বর
  assert.equal(L.istDateKey('2026-11-04T20:00:00Z'), '2026-11-05');
  assert.equal(L.formatDateBn(''), '');
});

test('সাইনআপের দিন থেকেই ১৫ দিন দেখায়', () => {
  const created = new Date('2026-11-05T06:00:00Z');
  const p = { trial_ends_at: new Date(created.getTime() + 15 * DAY).toISOString(), activated: false };
  const s0 = L.accessStatus(p, created);
  assert.equal(s0.state, 'trial');
  assert.equal(s0.daysLeft, 15);
  assert.match(L.validityMessage(s0).title, /১৫ দিন বাকি/);
  assert.equal(L.validityMessage(s0).tone, 'info');
  const s14 = L.accessStatus(p, new Date(created.getTime() + 14 * DAY + 1000));
  assert.equal(s14.daysLeft, 1);
  assert.equal(L.validityMessage(s14).tone, 'warn');
  const s15 = L.accessStatus(p, new Date(created.getTime() + 15 * DAY));
  assert.equal(s15.state, 'locked');
  assert.equal(L.validityMessage(s15).tone, 'danger');
});

test('অ্যাক্টিভেশন: সীমাহীন, নির্দিষ্ট দিন, মেয়াদোত্তীর্ণ', () => {
  const t = new Date('2026-12-30T00:00:00Z');
  const base = { trial_ends_at: '2026-11-20T00:00:00Z' };
  assert.equal(L.accessStatus({ ...base, activated: true, activated_until: null }, t).state, 'active');
  assert.equal(L.accessStatus({ ...base, activated: true, activated_until: null }, t).daysLeft, Infinity);
  const a = L.accessStatus({ ...base, activated: true, activated_until: '2027-01-29T00:00:00Z' }, t);
  assert.equal(a.state, 'active');
  assert.equal(a.daysLeft, 30);
  assert.equal(L.accessStatus({ ...base, activated: true, activated_until: '2026-12-01T00:00:00Z' }, t).state, 'locked');
  assert.equal(L.accessStatus(null).state, 'locked');
  assert.equal(L.validityMessage(a).tone, 'ok');
});

test('ফোন নম্বর, কল ও WhatsApp লিংক', () => {
  assert.equal(L.normalizePhone('98765 43210'), '919876543210');
  assert.equal(L.normalizePhone('+91-98765-43210'), '919876543210');
  assert.equal(L.normalizePhone('09876543210'), '919876543210');
  assert.equal(L.normalizePhone('০০৯১৯৮৭৬৫৪৩২১০'), '919876543210');
  assert.equal(L.normalizePhone('৯৮৭৬৫৪৩২১০'), '919876543210');
  assert.equal(L.normalizePhone(''), '');
  assert.equal(L.telLink('9876543210'), 'tel:+919876543210');
  assert.equal(L.whatsappLink('9876543210'), 'https://wa.me/919876543210');
  assert.equal(L.whatsappLink('9876543210', 'বাকি ₹৫০০'), 'https://wa.me/919876543210?text=' + encodeURIComponent('বাকি ₹৫০০'));
  assert.equal(L.whatsappLink(''), '');
  assert.ok(L.isValidPhone('9876543210'));
  assert.ok(!L.isValidPhone('12345'));
});

test('HTML এস্কেপ (XSS থেকে সুরক্ষা)', () => {
  assert.equal(L.escapeHtml('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
  assert.equal(L.escapeHtml(null), '');
});

test('কিস্তি ও তারিখ', () => {
  assert.deepEqual(L.emiRemaining({ total_installments: 12, paid_installments: 4, emi_amount: 1500 }), { installments: 8, amount: 12000 });
  assert.deepEqual(L.emiRemaining({ total_installments: 3, paid_installments: 5, emi_amount: 100 }), { installments: 0, amount: 0 });
  assert.equal(L.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(L.addMonths('2026-11-05', 2), '2027-01-05');
  assert.equal(L.addMonths(null, 1), null);
});

test('হিসাবের সারাংশ', () => {
  const now = new Date('2026-11-05T06:00:00Z');
  const s = L.summarize({
    sales: [
      { sale_date: '2026-11-05', amount: 500, paid: 300, client_id: 'c1' },
      { sale_date: '2026-11-01', amount: 1000, paid: 1000 },
      { sale_date: '2026-10-30', amount: 700, paid: 0, client_id: 'c1' },
    ],
    expenses: [{ expense_date: '2026-11-02', amount: 400 }, { expense_date: '2026-10-02', amount: 9999 }],
    emis: [
      { direction: 'pay', emi_amount: 1000, total_installments: 10, paid_installments: 7, next_due_date: '2026-11-08' },
      { direction: 'receive', emi_amount: 200, total_installments: 5, paid_installments: 0, next_due_date: '2026-12-30' },
      { direction: 'pay', emi_amount: 999, total_installments: 2, paid_installments: 2 },
    ],
    stock: [
      { quantity: 2, low_alert: 5, buy_price: 10 },
      { quantity: 50, low_alert: 5, buy_price: 20 },
      { quantity: 0, low_alert: 0, buy_price: 30 },
    ],
  }, now);
  assert.equal(s.todaySales, 500);
  assert.equal(s.monthSales, 1500);
  assert.equal(s.monthExpenses, 400);
  assert.equal(s.monthProfit, 1100);
  assert.equal(s.totalDue, 900);
  assert.equal(s.emiPayable, 3000);
  assert.equal(s.emiReceivable, 1000);
  assert.equal(s.emiDueSoon, 1);
  assert.equal(s.lowStock, 1);
  assert.equal(s.stockValue, 1020);
  assert.equal(L.clientDue('c1', [{ client_id: 'c1', amount: 500, paid: 300 }, { client_id: 'c1', amount: 700, paid: 0 }]), 900);
});

test('খোঁজা ও সাইনআপ যাচাই', () => {
  assert.ok(L.matchesSearch({ name: 'সুমন', phone: '9876543210' }, '৯৮৭৬', ['name', 'phone']));
  assert.ok(L.matchesSearch({ name: 'Ram' }, 'ra', ['name']));
  assert.ok(!L.matchesSearch({ name: 'সুমন' }, 'রহিম', ['name']));
  assert.ok(L.matchesSearch({ name: 'x' }, '', ['name']));
  assert.equal(L.validateSignup({ business_name: '', email: 'a@b.in', password: '123456' }), 'ব্যবসার নাম লিখুন');
  assert.equal(L.validateSignup({ business_name: 'দোকান', email: 'bad', password: '123456' }), 'সঠিক ইমেইল লিখুন');
  assert.match(L.validateSignup({ business_name: 'দোকান', email: 'a@b.in', password: '123' }), /৬ অক্ষর/);
  assert.equal(L.validateSignup({ business_name: 'দোকান', email: 'a@b.in', password: '123456' }), null);
});

test('এরর বাংলায়', () => {
  assert.equal(L.friendlyError(new Error('Invalid login credentials')), 'ইমেইল বা পাসওয়ার্ড ভুল');
  assert.match(L.friendlyError({ message: 'new row violates row-level security policy' }), /অ্যাক্টিভেশন/);
  assert.match(L.friendlyError(new Error('User already registered')), /আগেই/);
});
