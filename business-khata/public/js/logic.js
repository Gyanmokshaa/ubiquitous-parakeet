// বিশুদ্ধ লজিক: ব্রাউজার ও Node টেস্ট দুই জায়গাতেই চলে। কোনো DOM বা নেটওয়ার্ক নেই।

export const TRIAL_DAYS = 15;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const TZ = 'Asia/Kolkata';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBnDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

// বাংলা অঙ্ক টাইপ করলেও যেন সংখ্যা হিসেবে পড়া যায়
export function fromBnDigits(value) {
  return String(value ?? '').replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

export function parseNumber(value) {
  const s = fromBnDigits(value).replace(/[,\s₹]/g, '').trim();
  if (s === '') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// ভারতীয় পদ্ধতিতে কমা: ১২,৩৪,৫৬৭
export function formatNumber(n) {
  const num = Number(n) || 0;
  const neg = num < 0;
  const abs = Math.abs(num);
  const rounded = Math.round(abs * 100) / 100;
  let [intPart, frac] = rounded.toFixed(2).split('.');
  frac = frac.replace(/0+$/, '');
  let out;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    out = rest + ',' + last3;
  } else {
    out = intPart;
  }
  if (frac) out += '.' + frac;
  return toBnDigits((neg ? '-' : '') + out);
}

export function formatMoney(n) {
  const num = Number(n) || 0;
  return (num < 0 ? '-₹' : '₹') + formatNumber(Math.abs(num));
}

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

// ভারতের সময় অনুযায়ী YYYY-MM-DD
export function istDateKey(date) {
  const d = new Date(date);
  const ist = new Date(d.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

export function formatDateBn(value) {
  if (!value) return '';
  const key = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : istDateKey(value);
  const [y, m, d] = key.split('-').map(Number);
  return toBnDigits(d) + ' ' + BN_MONTHS[m - 1] + ' ' + toBnDigits(y);
}

// মেয়াদের অবস্থা: trial (ফ্রি চলছে), active (অ্যাক্টিভেট), locked (বন্ধ)
export function accessStatus(profile, now = new Date()) {
  if (!profile) return { state: 'locked', daysLeft: 0, endsAt: null, inTrial: false };
  const t = new Date(now).getTime();
  const trialEnd = new Date(profile.trial_ends_at).getTime();
  const inTrial = t < trialEnd;
  if (profile.activated) {
    const until = profile.activated_until ? new Date(profile.activated_until).getTime() : null;
    if (until === null || t < until) {
      return {
        state: 'active',
        daysLeft: until === null ? Infinity : Math.ceil((until - t) / DAY_MS),
        endsAt: until === null ? null : new Date(until),
        inTrial,
      };
    }
  }
  if (inTrial) {
    return { state: 'trial', daysLeft: Math.ceil((trialEnd - t) / DAY_MS), endsAt: new Date(trialEnd), inTrial };
  }
  return { state: 'locked', daysLeft: 0, endsAt: new Date(trialEnd), inTrial: false };
}

export function validityMessage(status) {
  if (status.state === 'trial') {
    return {
      tone: status.daysLeft <= 3 ? 'warn' : 'info',
      title: `ফ্রি মেয়াদ: আর ${toBnDigits(status.daysLeft)} দিন বাকি`,
      detail: `শেষ হবে ${formatDateBn(status.endsAt)}। এরপর অ্যাক্টিভেশন লাগবে, আপনার তথ্য নিরাপদ থাকবে।`,
    };
  }
  if (status.state === 'active') {
    return {
      tone: 'ok',
      title: 'অ্যাকাউন্ট সক্রিয়',
      detail: status.endsAt ? `মেয়াদ ${formatDateBn(status.endsAt)} পর্যন্ত` : 'মেয়াদ সীমাহীন',
    };
  }
  return {
    tone: 'danger',
    title: 'মেয়াদ শেষ হয়েছে',
    detail: 'অ্যাক্টিভেশনের পর আপনার সব তথ্য আবার দেখা যাবে।',
  };
}

// ভারতীয় মোবাইল নম্বর: WhatsApp এর জন্য দেশের কোড সহ শুধু অঙ্ক
export function normalizePhone(phone) {
  let d = fromBnDigits(phone).replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d;
}

export function isValidPhone(phone) {
  const d = normalizePhone(phone);
  return d.length >= 11 && d.length <= 15;
}

export function telLink(phone) {
  const d = normalizePhone(phone);
  return d ? 'tel:+' + d : '';
}

export function whatsappLink(phone, text = '') {
  const d = normalizePhone(phone);
  if (!d) return '';
  return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : '');
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export function emiRemaining(emi) {
  const left = Math.max(0, (Number(emi.total_installments) || 0) - (Number(emi.paid_installments) || 0));
  return { installments: left, amount: left * (Number(emi.emi_amount) || 0) };
}

export function addMonths(dateKey, months) {
  if (!dateKey) return null;
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function saleDue(sale) {
  return Math.max(0, (Number(sale.amount) || 0) - (Number(sale.paid) || 0));
}

export function clientDue(clientId, sales) {
  return sales.filter((s) => s.client_id === clientId).reduce((sum, s) => sum + saleDue(s), 0);
}

export function isLowStock(item) {
  return Number(item.low_alert) > 0 && Number(item.quantity) <= Number(item.low_alert);
}

export function summarize({ sales = [], expenses = [], emis = [], stock = [] }, now = new Date()) {
  const today = istDateKey(now);
  const month = today.slice(0, 7);
  const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
  const monthSales = sales.filter((s) => String(s.sale_date).startsWith(month));
  const monthExp = expenses.filter((e) => String(e.expense_date).startsWith(month));
  const activeEmis = emis.filter((e) => emiRemaining(e).installments > 0);
  const payEmis = activeEmis.filter((e) => e.direction !== 'receive');
  const recvEmis = activeEmis.filter((e) => e.direction === 'receive');
  const dueSoon = activeEmis.filter((e) => {
    if (!e.next_due_date) return false;
    const diff = (new Date(e.next_due_date + 'T00:00:00Z') - new Date(today + 'T00:00:00Z')) / DAY_MS;
    return diff <= 7;
  });
  return {
    todaySales: sum(sales.filter((s) => s.sale_date === today), (s) => s.amount),
    monthSales: sum(monthSales, (s) => s.amount),
    monthExpenses: sum(monthExp, (e) => e.amount),
    monthProfit: sum(monthSales, (s) => s.amount) - sum(monthExp, (e) => e.amount),
    totalDue: sum(sales, saleDue),
    emiPayable: sum(payEmis, (e) => emiRemaining(e).amount),
    emiReceivable: sum(recvEmis, (e) => emiRemaining(e).amount),
    emiDueSoon: dueSoon.length,
    lowStock: stock.filter(isLowStock).length,
    stockValue: sum(stock, (i) => Math.max(0, Number(i.quantity) || 0) * (Number(i.buy_price) || 0)),
  };
}

export function matchesSearch(obj, query, fields) {
  const q = fromBnDigits(query).trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => fromBnDigits(obj[f] ?? '').toLowerCase().includes(q));
}

// সাইনআপ ফর্ম যাচাই: ভুল থাকলে বাংলা বার্তা, না থাকলে null
export function validateSignup({ email, password, business_name }) {
  if (!business_name || !business_name.trim()) return 'ব্যবসার নাম লিখুন';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'সঠিক ইমেইল লিখুন';
  if (!password || password.length < 6) return 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে';
  return null;
}

// Supabase এর ইংরেজি এরর বাংলায়
export function friendlyError(err) {
  const msg = String(err?.message || err || '');
  if (/invalid login credentials/i.test(msg)) return 'ইমেইল বা পাসওয়ার্ড ভুল';
  if (/already registered|already exists/i.test(msg)) return 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে, লগইন করুন';
  if (/email not confirmed/i.test(msg)) return 'আগে ইমেইলে পাঠানো লিংকে ক্লিক করে যাচাই করুন';
  if (/row-level security|permission denied|42501/i.test(msg)) return 'অনুমতি নেই। মেয়াদ শেষ হয়ে থাকলে অ্যাক্টিভেশন দরকার';
  if (/failed to fetch|network/i.test(msg)) return 'ইন্টারনেট সংযোগ দেখুন';
  if (/rate limit/i.test(msg)) return 'অনেকবার চেষ্টা হয়েছে, একটু পরে আবার চেষ্টা করুন';
  return msg ? 'সমস্যা হয়েছে: ' + msg : 'সমস্যা হয়েছে, আবার চেষ্টা করুন';
}
