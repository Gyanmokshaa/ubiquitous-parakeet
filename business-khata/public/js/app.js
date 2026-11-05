// ব্যবসার খাতা: মূল অ্যাপ
import {
  accessStatus, validityMessage, formatMoney, formatNumber, formatDateBn, toBnDigits,
  escapeHtml, whatsappLink, telLink, normalizePhone, isValidPhone, summarize, emiRemaining,
  clientDue, saleDue, isLowStock, istDateKey, addMonths, matchesSearch, validateSignup, friendlyError,
} from './logic.js';
import { loadConfig, createBackend, TABLES } from './backend.js';
import { $, toast, openForm, confirmBox } from './ui.js';

const app = document.getElementById('app');
const state = {
  be: null, cfg: null, user: null, profile: null, tab: 'home', search: {},
  data: Object.fromEntries(TABLES.map((t) => [t, []])),
};
const now = () => (window.__KHATA_NOW__ ? new Date(window.__KHATA_NOW__) : new Date());
const today = () => istDateKey(now());

const TABS = [
  { id: 'home', label: 'হোম', ico: '🏠' },
  { id: 'stock_items', label: 'স্টক', ico: '📦' },
  { id: 'clients', label: 'খদ্দের', ico: '👥' },
  { id: 'sales', label: 'বিক্রি', ico: '🧾' },
  { id: 'expenses', label: 'খরচ', ico: '💸' },
  { id: 'emis', label: 'কিস্তি', ico: '📅' },
];

function fail(ex) {
  toast(friendlyError(ex));
  console.error(ex);
}

// ------------------------------------------------------------------ শুরু
async function boot() {
  try {
    state.cfg = await loadConfig();
    if (!state.cfg) return renderSetupMissing();
    state.be = await createBackend(state.cfg);
    state.user = await state.be.currentUser();
    if (!state.user) return renderAuth();
    await afterLogin();
  } catch (ex) {
    console.error(ex);
    app.innerHTML = `<div class="center-screen"><div class="card">${escapeHtml(friendlyError(ex))}
      <p><button class="btn primary" onclick="location.reload()">আবার চেষ্টা করুন</button></p></div></div>`;
  }
}

function renderSetupMissing() {
  app.innerHTML = `<div class="auth"><div class="card">
    <h2>সেটআপ বাকি আছে</h2>
    <p>Vercel এর Environment Variables এ <b>SUPABASE_URL</b> ও <b>SUPABASE_ANON_KEY</b> দিন, তারপর আবার ডিপ্লয় করুন।
    বিস্তারিত দেখুন SETUP.md ফাইলে।</p>
    <p><a class="btn" href="/?demo=1">ডেমো দেখুন</a></p></div></div>`;
}

async function afterLogin() {
  state.profile = await state.be.getProfile();
  if (!state.profile) {
    // ট্রিগার প্রোফাইল বানাতে এক মুহূর্ত লাগতে পারে
    await new Promise((r) => setTimeout(r, 800));
    state.profile = await state.be.getProfile();
  }
  const st = accessStatus(state.profile, now());
  if (st.state === 'locked') return renderLocked();
  await reloadData();
  renderMain();
}

async function reloadData() {
  const lists = await Promise.all(TABLES.map((t) => state.be.list(t)));
  TABLES.forEach((t, i) => { state.data[t] = lists[i] || []; });
}

// ------------------------------------------------------------------ লগইন / সাইনআপ
function renderAuth(mode = 'login', message = '') {
  const isSignup = mode === 'signup';
  app.innerHTML = `
  <div class="auth">
    <div class="brand-mark"><div class="logo" aria-hidden="true">খ</div>
      <h1>ব্যবসার খাতা</h1><p>স্টক, খদ্দের, বিক্রি, খরচ, কিস্তি: সব এক জায়গায়</p></div>
    ${state.cfg.demo ? '<p class="validity warn"><span>ডেমো মোড: তথ্য শুধু এই ফোনে থাকবে</span></p>' : ''}
    <div class="card">
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected="${!isSignup}" data-mode="login">লগইন</button>
        <button role="tab" aria-selected="${isSignup}" data-mode="signup">নতুন অ্যাকাউন্ট</button>
      </div>
      <form id="authForm" novalidate>
        ${isSignup ? `
        <div class="field"><label for="business_name">ব্যবসার নাম *</label><input id="business_name" name="business_name" required autocomplete="organization"></div>
        <div class="field"><label for="owner_name">আপনার নাম</label><input id="owner_name" name="owner_name" autocomplete="name"></div>
        <div class="field"><label for="phone">মোবাইল নম্বর</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel"></div>` : ''}
        <div class="field"><label for="email">ইমেইল *</label><input id="email" name="email" type="email" inputmode="email" required autocomplete="email"></div>
        <div class="field"><label for="password">পাসওয়ার্ড *</label><input id="password" name="password" type="password" required minlength="6" autocomplete="${isSignup ? 'new-password' : 'current-password'}"></div>
        <div class="error-msg" role="alert">${escapeHtml(message)}</div>
        <button class="btn primary block" type="submit">${isSignup ? 'অ্যাকাউন্ট খুলুন' : 'লগইন করুন'}</button>
      </form>
      ${isSignup ? '<p class="trial-note">সাইনআপের দিন থেকে ১৫ দিন বিনামূল্যে ব্যবহার করুন।</p>'
        : '<p class="trial-note"><button class="linkish" id="forgot">পাসওয়ার্ড ভুলে গেছেন?</button></p>'}
    </div>
  </div>`;
  app.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => renderAuth(b.dataset.mode); });
  $('#forgot')?.addEventListener('click', async () => {
    const email = $('#email').value.trim();
    if (!email) return ($('.error-msg').textContent = 'আগে ইমেইল লিখুন, তারপর এখানে চাপুন');
    try { await state.be.resetPassword(email); toast('পাসওয়ার্ড বদলের লিংক ইমেইলে পাঠানো হয়েছে'); } catch (ex) { fail(ex); }
  });
  $('#authForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const errEl = f.querySelector('.error-msg');
    const btn = f.querySelector('[type=submit]');
    const vals = Object.fromEntries(new FormData(f).entries());
    errEl.textContent = '';
    if (isSignup) {
      const v = validateSignup(vals);
      if (v) return (errEl.textContent = v);
      if (vals.phone && !isValidPhone(vals.phone)) return (errEl.textContent = 'সঠিক মোবাইল নম্বর লিখুন');
    } else if (!vals.email || !vals.password) {
      return (errEl.textContent = 'ইমেইল ও পাসওয়ার্ড লিখুন');
    }
    btn.disabled = true;
    try {
      if (isSignup) {
        const r = await state.be.signUp({ ...vals, email: vals.email.trim() });
        if (r.needsConfirm) {
          return renderAuth('login', 'অ্যাকাউন্ট তৈরি হয়েছে। ইমেইলে পাঠানো লিংকে ক্লিক করে যাচাই করুন, তারপর লগইন করুন।');
        }
      } else {
        await state.be.signIn({ email: vals.email.trim(), password: vals.password });
      }
      state.user = await state.be.currentUser();
      await afterLogin();
    } catch (ex) {
      errEl.textContent = friendlyError(ex);
      btn.disabled = false;
    }
  };
}

// ------------------------------------------------------------------ লক স্ক্রিন
function renderLocked() {
  const p = state.profile || {};
  const adminWa = state.cfg.adminWhatsapp;
  const msg = `নমস্কার, আমার "ব্যবসার খাতা" অ্যাকাউন্ট (${p.email || ''}) অ্যাক্টিভেট করতে চাই।`;
  app.innerHTML = `
  <div class="locked" data-screen="locked">
    <div class="lock-icon" aria-hidden="true">🔒</div>
    <h2>আপনার ${p.activated ? 'অ্যাক্টিভেশনের' : '১৫ দিনের ফ্রি'} মেয়াদ শেষ হয়েছে</h2>
    <p>চিন্তা করবেন না, আপনার সব তথ্য (স্টক, খদ্দের, বিক্রি, খরচ, কিস্তি) নিরাপদে রাখা আছে।
       অ্যাকাউন্ট অ্যাক্টিভেট হলেই সব আবার দেখতে পাবেন।</p>
    <div class="card meta">অ্যাকাউন্ট: ${escapeHtml(p.email || '')}<br>
      ফ্রি মেয়াদ শেষ: ${escapeHtml(formatDateBn(p.trial_ends_at))}</div>
    <div class="stack">
      ${adminWa ? `<a class="btn wa block" href="${escapeHtml(whatsappLink(adminWa, msg))}" target="_blank" rel="noopener">WhatsApp এ অ্যাক্টিভেশন চাই</a>` : ''}
      <button class="btn primary block" id="recheck">অ্যাক্টিভেট হয়েছে কিনা দেখুন</button>
      <button class="btn block" id="logout">লগআউট</button>
    </div>
  </div>`;
  $('#recheck').onclick = async () => {
    state.profile = await state.be.getProfile();
    if (accessStatus(state.profile, now()).state === 'locked') return toast('এখনও অ্যাক্টিভেট হয়নি');
    toast('অ্যাকাউন্ট চালু হয়েছে!');
    await reloadData();
    renderMain();
  };
  $('#logout').onclick = logout;
}

async function logout() {
  await state.be.signOut();
  state.user = null;
  state.profile = null;
  renderAuth();
}

// ------------------------------------------------------------------ মূল স্ক্রিন
function renderMain() {
  const st = accessStatus(state.profile, now());
  if (st.state === 'locked') return renderLocked();
  const vm = validityMessage(st);
  const title = state.profile.business_name || 'ব্যবসার খাতা';
  app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <h1>${escapeHtml(title)}</h1>
      <button class="icon-btn" id="menuBtn" aria-label="আরও অপশন">☰ আরও</button>
    </header>
    <div class="validity ${vm.tone}" id="validity" data-state="${st.state}">
      <i class="dot" aria-hidden="true"></i>
      <div><strong>${escapeHtml(vm.title)}</strong><span>${escapeHtml(vm.detail)}</span></div>
    </div>
    <main id="view"></main>
  </div>
  <nav class="bottom-nav" aria-label="প্রধান মেনু">
    ${TABS.map((t) => `<button data-tab="${t.id}" ${state.tab === t.id ? 'aria-current="page"' : ''}>
      <span class="ico" aria-hidden="true">${t.ico}</span>${t.label}</button>`).join('')}
  </nav>`;
  app.querySelectorAll('[data-tab]').forEach((b) => {
    b.onclick = () => { state.tab = b.dataset.tab; renderMain(); window.scrollTo(0, 0); };
  });
  $('#menuBtn').onclick = openMenu;
  renderView();
}

function renderView() {
  const view = $('#view');
  const fn = { home: viewHome, stock_items: viewStock, clients: viewClients, sales: viewSales, expenses: viewExpenses, emis: viewEmis }[state.tab];
  view.innerHTML = fn();
  bindView(view);
}

function listOrEmpty(items, render, emptyText) {
  return items.length ? `<div class="list">${items.map(render).join('')}</div>` : `<div class="empty">${emptyText}</div>`;
}

function searchBox(tab, placeholder) {
  return `<input class="search" type="search" data-search="${tab}" placeholder="${placeholder}" aria-label="${placeholder}"
    value="${escapeHtml(state.search[tab] || '')}">`;
}

function fab(label, action) {
  return `<button class="fab" data-action="${action}">＋ ${label}</button>`;
}

const clientName = (id) => state.data.clients.find((c) => c.id === id)?.name || '';
const stockName = (id) => state.data.stock_items.find((s) => s.id === id)?.name || '';

// ---------- হোম ----------
function viewHome() {
  const s = summarize({
    sales: state.data.sales, expenses: state.data.expenses, emis: state.data.emis, stock: state.data.stock_items,
  }, now());
  const stat = (label, value, cls = '') => `<div class="stat ${cls}"><div class="label">${label}</div><div class="value">${value}</div></div>`;
  const recent = state.data.sales.slice(0, 5);
  return `
    <div class="section-head"><h2>আজকের হিসাব</h2><span class="meta">${formatDateBn(today())}</span></div>
    <div class="stats" id="stats">
      ${stat('আজকের বিক্রি', formatMoney(s.todaySales))}
      ${stat('এই মাসের বিক্রি', formatMoney(s.monthSales))}
      ${stat('এই মাসের খরচ', formatMoney(s.monthExpenses))}
      ${stat('এই মাসের লাভ', formatMoney(s.monthProfit), s.monthProfit >= 0 ? 'good' : 'bad')}
      ${stat('খদ্দেরদের কাছে বাকি', formatMoney(s.totalDue))}
      ${stat('স্টকের মূল্য (কেনা দামে)', formatMoney(s.stockValue))}
      ${stat('কিস্তি দিতে বাকি', formatMoney(s.emiPayable), s.emiPayable ? 'bad' : '')}
      ${stat('কিস্তি পেতে বাকি', formatMoney(s.emiReceivable))}
    </div>
    ${s.lowStock ? `<p class="validity warn"><span><b>${toBnDigits(s.lowStock)}টি</b> জিনিসের স্টক কম আছে। স্টক ট্যাবে দেখুন।</span></p>` : ''}
    ${s.emiDueSoon ? `<p class="validity warn"><span><b>${toBnDigits(s.emiDueSoon)}টি</b> কিস্তির তারিখ ৭ দিনের মধ্যে বা পেরিয়ে গেছে।</span></p>` : ''}
    <div class="section-head"><h2>সাম্প্রতিক বিক্রি</h2><button class="btn small" data-goto="sales">সব দেখুন</button></div>
    ${listOrEmpty(recent, saleCard, 'এখনও কোনো বিক্রি লেখা হয়নি। নিচের "বিক্রি" ট্যাবে গিয়ে যোগ করুন।')}
    ${fab('বিক্রি', 'add-sale')}`;
}

// ---------- স্টক ----------
function stockCard(i) {
  const low = isLowStock(i);
  return `<div class="item" data-id="${i.id}">
    <div class="item-top"><div class="item-title">${escapeHtml(i.name)}</div>
      <div class="item-amount">${formatNumber(i.quantity)} ${escapeHtml(i.unit)}</div></div>
    <div class="meta">কেনা ${formatMoney(i.buy_price)} · বিক্রি ${formatMoney(i.sell_price)}
      ${low ? ' <span class="badge warn">স্টক কম</span>' : ''}${Number(i.quantity) <= 0 ? ' <span class="badge danger">শেষ</span>' : ''}</div>
    <div class="row-actions">
      <button class="btn small" data-action="stock-add-qty" data-id="${i.id}">＋ মাল এসেছে</button>
      <button class="btn small" data-action="edit-stock" data-id="${i.id}">বদলান</button>
      <button class="btn small danger" data-action="del" data-table="stock_items" data-id="${i.id}">মুছুন</button>
    </div></div>`;
}
function viewStock() {
  const items = state.data.stock_items.filter((i) => matchesSearch(i, state.search.stock_items, ['name']));
  return `<div class="section-head"><h2>স্টক</h2><span class="meta">${toBnDigits(state.data.stock_items.length)}টি জিনিস</span></div>
    ${searchBox('stock_items', 'জিনিস খুঁজুন')}
    ${listOrEmpty(items, stockCard, 'কোনো জিনিস নেই। "＋ নতুন জিনিস" চাপুন।')}
    ${fab('নতুন জিনিস', 'add-stock')}`;
}
const stockFields = [
  { name: 'name', label: 'জিনিসের নাম', required: true },
  { name: 'unit', label: 'একক (পিস, কেজি, লিটার...)', default: 'পিস' },
  { name: 'quantity', label: 'কতগুলো আছে', type: 'number', default: 0 },
  { name: 'buy_price', label: 'কেনা দাম (প্রতি একক)', type: 'number', min: 0, default: 0 },
  { name: 'sell_price', label: 'বিক্রির দাম (প্রতি একক)', type: 'number', min: 0, default: 0 },
  { name: 'low_alert', label: 'কত হলে সতর্ক করব', type: 'number', min: 0, default: 0, hint: '০ দিলে সতর্কতা বন্ধ' },
];

// ---------- খদ্দের ----------
function clientCard(c) {
  const due = clientDue(c.id, state.data.sales);
  const phoneOk = Boolean(normalizePhone(c.phone));
  const waText = due > 0
    ? `নমস্কার ${c.name}, ${state.profile.business_name || ''} থেকে বলছি। আপনার বাকি ${formatMoney(due)}।`
    : `নমস্কার ${c.name}, ${state.profile.business_name || ''} থেকে বলছি।`;
  return `<div class="item" data-id="${c.id}">
    <div class="item-top">
      <div style="min-width:0"><div class="item-title">${escapeHtml(c.name)}</div>
        <div class="meta">${c.phone ? escapeHtml(c.phone) : 'ফোন নম্বর নেই'}</div></div>
      ${phoneOk ? `<div class="contact-btns">
        <a class="btn call" href="${escapeHtml(telLink(c.phone))}" aria-label="${escapeHtml(c.name)} কে কল করুন" data-contact="call">📞 কল</a>
        <a class="btn wa" href="${escapeHtml(whatsappLink(c.phone, waText))}" target="_blank" rel="noopener"
           aria-label="${escapeHtml(c.name)} কে WhatsApp করুন" data-contact="wa">WhatsApp</a></div>` : ''}
    </div>
    ${c.address ? `<div class="meta">ঠিকানা: ${escapeHtml(c.address)}</div>` : ''}
    ${c.notes ? `<div class="meta">নোট: ${escapeHtml(c.notes)}</div>` : ''}
    ${due > 0 ? `<div><span class="badge danger">বাকি ${formatMoney(due)}</span></div>` : ''}
    <div class="row-actions">
      <button class="btn small" data-action="edit-client" data-id="${c.id}">বদলান</button>
      <button class="btn small danger" data-action="del" data-table="clients" data-id="${c.id}">মুছুন</button>
    </div></div>`;
}
function viewClients() {
  const items = state.data.clients.filter((c) => matchesSearch(c, state.search.clients, ['name', 'phone', 'address']));
  return `<div class="section-head"><h2>খদ্দের</h2><span class="meta">${toBnDigits(state.data.clients.length)} জন</span></div>
    ${searchBox('clients', 'নাম বা নম্বর দিয়ে খুঁজুন')}
    ${listOrEmpty(items, clientCard, 'কোনো খদ্দের নেই। "＋ নতুন খদ্দের" চাপুন।')}
    ${fab('নতুন খদ্দের', 'add-client')}`;
}
const clientFields = [
  { name: 'name', label: 'নাম', required: true },
  { name: 'phone', label: 'মোবাইল নম্বর', type: 'tel', hint: '১০ অঙ্কের নম্বর দিলেই হবে, +৯১ লাগবে না' },
  { name: 'address', label: 'ঠিকানা' },
  { name: 'notes', label: 'নোট', type: 'textarea' },
];

// ---------- বিক্রি ----------
function saleCard(s) {
  const due = saleDue(s);
  const who = clientName(s.client_id);
  const what = s.description || stockName(s.stock_id) || 'বিক্রি';
  return `<div class="item" data-id="${s.id}">
    <div class="item-top"><div class="item-title">${escapeHtml(what)}</div><div class="item-amount">${formatMoney(s.amount)}</div></div>
    <div class="meta">${formatDateBn(s.sale_date)}${who ? ' · ' + escapeHtml(who) : ''}${Number(s.quantity) > 0 ? ' · পরিমাণ ' + formatNumber(s.quantity) : ''}</div>
    <div>${due > 0 ? `<span class="badge danger">বাকি ${formatMoney(due)}</span>` : '<span class="badge ok">পুরো টাকা পাওয়া গেছে</span>'}</div>
    <div class="row-actions">
      ${due > 0 ? `<button class="btn small" data-action="sale-paid" data-id="${s.id}">বাকি আদায় হয়েছে</button>` : ''}
      <button class="btn small danger" data-action="del" data-table="sales" data-id="${s.id}">মুছুন</button>
    </div></div>`;
}
function viewSales() {
  const items = state.data.sales.filter((s) => matchesSearch(
    { ...s, client: clientName(s.client_id), item: stockName(s.stock_id) }, state.search.sales, ['description', 'client', 'item'],
  ));
  const s = summarize({ sales: state.data.sales }, now());
  return `<div class="section-head"><h2>বিক্রি</h2><span class="meta">এই মাসে ${formatMoney(s.monthSales)}</span></div>
    ${searchBox('sales', 'বিক্রি খুঁজুন')}
    ${listOrEmpty(items, saleCard, 'কোনো বিক্রি নেই। "＋ বিক্রি" চাপুন।')}
    ${fab('বিক্রি', 'add-sale')}`;
}
function saleFields() {
  return [
    { name: 'sale_date', label: 'তারিখ', type: 'date', default: today(), required: true },
    { name: 'stock_id', label: 'স্টকের জিনিস (থাকলে)', type: 'select', nullable: true,
      options: [{ value: '', label: 'স্টক থেকে নয়' }, ...state.data.stock_items.map((i) => ({ value: i.id, label: `${i.name} (${formatNumber(i.quantity)} ${i.unit} আছে)` }))] },
    { name: 'quantity', label: 'পরিমাণ', type: 'number', min: 0, default: 1, hint: 'স্টকের জিনিস বাছলে স্টক থেকে এতগুলো কমবে' },
    { name: 'description', label: 'বিবরণ', placeholder: 'যেমন: চাল ৫ কেজি' },
    { name: 'amount', label: 'মোট দাম (₹)', type: 'number', min: 0, required: true },
    { name: 'paid', label: 'কত টাকা পেয়েছেন (₹)', type: 'number', min: 0, hint: 'খালি রাখলে পুরো টাকা পাওয়া ধরা হবে' },
    { name: 'client_id', label: 'খদ্দের', type: 'select', nullable: true,
      options: [{ value: '', label: 'খুচরো খদ্দের' }, ...state.data.clients.map((c) => ({ value: c.id, label: c.name }))] },
  ];
}

// ---------- খরচ ----------
const EXP_CATS = ['মাল কেনা', 'ভাড়া', 'বিদ্যুৎ', 'কর্মচারী বেতন', 'যাতায়াত', 'মোবাইল/ইন্টারনেট', 'মেরামত', 'অন্যান্য'];
function expenseCard(e) {
  return `<div class="item" data-id="${e.id}">
    <div class="item-top"><div class="item-title">${escapeHtml(e.category)}</div><div class="item-amount">${formatMoney(e.amount)}</div></div>
    <div class="meta">${formatDateBn(e.expense_date)}${e.description ? ' · ' + escapeHtml(e.description) : ''}</div>
    <div class="row-actions"><button class="btn small danger" data-action="del" data-table="expenses" data-id="${e.id}">মুছুন</button></div></div>`;
}
function viewExpenses() {
  const items = state.data.expenses.filter((e) => matchesSearch(e, state.search.expenses, ['category', 'description']));
  const s = summarize({ expenses: state.data.expenses }, now());
  return `<div class="section-head"><h2>খরচ</h2><span class="meta">এই মাসে ${formatMoney(s.monthExpenses)}</span></div>
    ${searchBox('expenses', 'খরচ খুঁজুন')}
    ${listOrEmpty(items, expenseCard, 'কোনো খরচ লেখা নেই। "＋ খরচ" চাপুন।')}
    ${fab('খরচ', 'add-expense')}`;
}
const expenseFields = [
  { name: 'expense_date', label: 'তারিখ', type: 'date', required: true },
  { name: 'category', label: 'খরচের ধরন', type: 'select', options: EXP_CATS.map((c) => ({ value: c, label: c })) },
  { name: 'amount', label: 'টাকা (₹)', type: 'number', min: 0, required: true },
  { name: 'description', label: 'বিবরণ' },
];

// ---------- কিস্তি (EMI) ----------
function emiCard(e) {
  const r = emiRemaining(e);
  const pct = Math.round((Number(e.paid_installments) / Number(e.total_installments)) * 100) || 0;
  const done = r.installments === 0;
  const overdue = !done && e.next_due_date && e.next_due_date < today();
  const who = e.party_name + (e.client_id && clientName(e.client_id) && clientName(e.client_id) !== e.party_name ? ` (${clientName(e.client_id)})` : '');
  return `<div class="item" data-id="${e.id}">
    <div class="item-top"><div class="item-title">${escapeHtml(who)}</div>
      <div class="item-amount">${formatMoney(e.emi_amount)}/কিস্তি</div></div>
    <div><span class="badge ${e.direction === 'receive' ? 'ok' : 'warn'}">${e.direction === 'receive' ? 'আমি পাব' : 'আমি দেব'}</span>
      ${done ? ' <span class="badge ok">সব কিস্তি শেষ</span>' : overdue ? ' <span class="badge danger">তারিখ পেরিয়ে গেছে</span>' : ''}</div>
    <div class="meta">${toBnDigits(e.paid_installments)}/${toBnDigits(e.total_installments)} কিস্তি শোধ · বাকি ${toBnDigits(r.installments)}টি = ${formatMoney(r.amount)}
      ${!done && e.next_due_date ? `<br>পরের কিস্তি: ${formatDateBn(e.next_due_date)}` : ''}${e.notes ? `<br>নোট: ${escapeHtml(e.notes)}` : ''}</div>
    <div class="progress" aria-hidden="true"><div style="width:${pct}%"></div></div>
    <div class="row-actions">
      ${done ? '' : `<button class="btn small" data-action="emi-paid" data-id="${e.id}">একটি কিস্তি শোধ</button>`}
      <button class="btn small" data-action="edit-emi" data-id="${e.id}">বদলান</button>
      <button class="btn small danger" data-action="del" data-table="emis" data-id="${e.id}">মুছুন</button>
    </div></div>`;
}
function viewEmis() {
  const items = state.data.emis.filter((e) => matchesSearch(e, state.search.emis, ['party_name', 'notes']));
  const pending = items.filter((e) => emiRemaining(e).installments > 0);
  const finished = items.filter((e) => emiRemaining(e).installments === 0);
  const s = summarize({ emis: state.data.emis }, now());
  return `<div class="section-head"><h2>বাকি কিস্তি (EMI)</h2></div>
    <div class="stats" style="margin-bottom:12px">
      <div class="stat bad"><div class="label">দিতে বাকি</div><div class="value">${formatMoney(s.emiPayable)}</div></div>
      <div class="stat good"><div class="label">পেতে বাকি</div><div class="value">${formatMoney(s.emiReceivable)}</div></div>
    </div>
    ${searchBox('emis', 'কিস্তি খুঁজুন')}
    ${listOrEmpty(pending, emiCard, 'কোনো বাকি কিস্তি নেই।')}
    ${finished.length ? `<div class="section-head"><h2>শেষ হওয়া কিস্তি</h2></div><div class="list">${finished.map(emiCard).join('')}</div>` : ''}
    ${fab('কিস্তি', 'add-emi')}`;
}
function emiFields() {
  return [
    { name: 'direction', label: 'ধরন', type: 'select', options: [{ value: 'pay', label: 'আমি দেব (লোন/ধার)' }, { value: 'receive', label: 'আমি পাব (খদ্দেরের কিস্তি)' }] },
    { name: 'party_name', label: 'কার সঙ্গে (ব্যাংক/ব্যক্তি)', required: true },
    { name: 'client_id', label: 'খদ্দের (থাকলে)', type: 'select', nullable: true,
      options: [{ value: '', label: 'কেউ নয়' }, ...state.data.clients.map((c) => ({ value: c.id, label: c.name }))] },
    { name: 'emi_amount', label: 'প্রতি কিস্তির টাকা (₹)', type: 'number', min: 0, required: true },
    { name: 'total_installments', label: 'মোট কিস্তি সংখ্যা', type: 'number', min: 1, integer: true, required: true },
    { name: 'paid_installments', label: 'এর মধ্যে শোধ হয়েছে', type: 'number', min: 0, integer: true, default: 0 },
    { name: 'next_due_date', label: 'পরের কিস্তির তারিখ', type: 'date' },
    { name: 'notes', label: 'নোট' },
  ];
}

// ------------------------------------------------------------------ কাজ
async function mutate(fn, okMsg) {
  try {
    await fn();
  } catch (ex) {
    // মেয়াদ শেষ হয়ে গিয়ে থাকলে লক স্ক্রিন দেখাই
    state.profile = await state.be.getProfile().catch(() => state.profile);
    if (accessStatus(state.profile, now()).state === 'locked') { renderLocked(); return; }
    ex.friendly = friendlyError(ex);
    throw ex;
  }
  await reloadData();
  renderView();
  if (okMsg) toast(okMsg);
}

const find = (table, id) => state.data[table].find((r) => r.id === id);

const actions = {
  'add-stock': () => openForm({ title: 'নতুন জিনিস', fields: stockFields,
    onSubmit: (d) => mutate(() => state.be.insert('stock_items', d), 'স্টকে যোগ হয়েছে') }),
  'edit-stock': (id) => openForm({ title: 'জিনিস বদলান', fields: stockFields, values: find('stock_items', id),
    onSubmit: (d) => mutate(() => state.be.update('stock_items', id, d), 'সেভ হয়েছে') }),
  'stock-add-qty': (id) => {
    const item = find('stock_items', id);
    openForm({ title: `${item.name}: কতগুলো এল?`, submitLabel: 'যোগ করুন',
      fields: [{ name: 'qty', label: `পরিমাণ (${item.unit})`, type: 'number', min: 0, required: true }],
      onSubmit: (d) => mutate(() => state.be.update('stock_items', id, { quantity: Number(item.quantity) + d.qty }), 'স্টক বেড়েছে') });
  },
  'add-client': () => openForm({ title: 'নতুন খদ্দের', fields: clientFields,
    onSubmit: (d) => {
      if (d.phone && !isValidPhone(d.phone)) throw new Error('সঠিক মোবাইল নম্বর লিখুন');
      return mutate(() => state.be.insert('clients', d), 'খদ্দের যোগ হয়েছে');
    } }),
  'edit-client': (id) => openForm({ title: 'খদ্দের বদলান', fields: clientFields, values: find('clients', id),
    onSubmit: (d) => {
      if (d.phone && !isValidPhone(d.phone)) throw new Error('সঠিক মোবাইল নম্বর লিখুন');
      return mutate(() => state.be.update('clients', id, d), 'সেভ হয়েছে');
    } }),
  'add-sale': () => {
    const fields = saleFields();
    const { form } = openForm({ title: 'নতুন বিক্রি', fields,
      onSubmit: (d) => {
        if (!d.stock_id) d.stock_id = null;
        if (!d.client_id) d.client_id = null;
        if (form.elements.paid.value.trim() === '') d.paid = d.amount;
        if (d.paid > d.amount) throw new Error('পাওয়া টাকা মোট দামের বেশি হতে পারে না');
        if (!d.stock_id && !d.description) d.description = 'বিক্রি';
        return mutate(() => state.be.insert('sales', d), 'বিক্রি লেখা হয়েছে');
      } });
    // স্টকের জিনিস বাছলে দাম নিজে থেকে বসে
    const fill = () => {
      const item = find('stock_items', form.elements.stock_id.value);
      if (!item) return;
      const q = Number(String(form.elements.quantity.value).replace(/[০-৯]/g, (c) => '০১২৩৪৫৬৭৮৯'.indexOf(c))) || 0;
      form.elements.amount.value = Math.round(q * Number(item.sell_price) * 100) / 100;
    };
    form.elements.stock_id.addEventListener('change', fill);
    form.elements.quantity.addEventListener('input', fill);
  },
  'sale-paid': (id) => mutate(() => state.be.update('sales', id, { paid: find('sales', id).amount }), 'বাকি আদায় লেখা হয়েছে'),
  'add-expense': () => openForm({ title: 'নতুন খরচ', fields: expenseFields, values: { expense_date: today() },
    onSubmit: (d) => mutate(() => state.be.insert('expenses', d), 'খরচ লেখা হয়েছে') }),
  'add-emi': () => openForm({ title: 'নতুন কিস্তি', fields: emiFields(),
    onSubmit: (d) => {
      if (d.paid_installments > d.total_installments) throw new Error('শোধ হওয়া কিস্তি মোট কিস্তির বেশি হতে পারে না');
      if (!d.client_id) d.client_id = null;
      return mutate(() => state.be.insert('emis', d), 'কিস্তি যোগ হয়েছে');
    } }),
  'edit-emi': (id) => openForm({ title: 'কিস্তি বদলান', fields: emiFields(), values: find('emis', id),
    onSubmit: (d) => {
      if (d.paid_installments > d.total_installments) throw new Error('শোধ হওয়া কিস্তি মোট কিস্তির বেশি হতে পারে না');
      if (!d.client_id) d.client_id = null;
      return mutate(() => state.be.update('emis', id, d), 'সেভ হয়েছে');
    } }),
  'emi-paid': (id) => {
    const e = find('emis', id);
    const paid = Number(e.paid_installments) + 1;
    const patch = { paid_installments: paid };
    if (e.next_due_date) patch.next_due_date = addMonths(e.next_due_date, 1);
    return mutate(() => state.be.update('emis', id, patch), paid >= e.total_installments ? 'সব কিস্তি শেষ!' : 'কিস্তি শোধ লেখা হয়েছে');
  },
  del: async (id, btn) => {
    if (!(await confirmBox('এটি মুছে ফেলবেন?'))) return;
    await mutate(() => state.be.remove(btn.dataset.table, id), 'মুছে ফেলা হয়েছে');
  },
};

function bindView(view) {
  view.querySelectorAll('[data-action]').forEach((b) => {
    b.addEventListener('click', async () => {
      try { await actions[b.dataset.action](b.dataset.id, b); } catch (ex) { fail(ex); }
    });
  });
  view.querySelectorAll('[data-goto]').forEach((b) => {
    b.onclick = () => { state.tab = b.dataset.goto; renderMain(); };
  });
  const s = view.querySelector('[data-search]');
  if (s) {
    s.addEventListener('input', () => {
      state.search[s.dataset.search] = s.value;
      const pos = s.selectionStart;
      renderView();
      const again = $('#view [data-search]');
      again.focus();
      again.setSelectionRange(pos, pos);
    });
  }
}

// ------------------------------------------------------------------ মেনু: প্রোফাইল, মতামত, লগআউট
function openMenu() {
  const st = accessStatus(state.profile, now());
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="মেনু">
    <h3>${escapeHtml(state.profile.business_name || 'মেনু')}</h3>
    <p class="meta">${escapeHtml(state.profile.email || state.user?.email || '')}</p>
    <div class="list">
      ${st.inTrial ? '<button class="btn block" data-m="feedback">💬 মতামত দিন</button>' : ''}
      <button class="btn block" data-m="profile">✏️ ব্যবসার তথ্য বদলান</button>
      <button class="btn block danger" data-m="logout">লগআউট</button>
      <button class="btn block" data-m="close">বন্ধ করুন</button>
    </div></div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelectorAll('[data-m]').forEach((b) => {
    b.onclick = () => { close(); menuActions[b.dataset.m]?.(); };
  });
}

const menuActions = {
  feedback: async () => {
    let past = [];
    try { past = await state.be.myFeedback(); } catch (_) { /* না পেলেও চলবে */ }
    const pastHtml = past.length ? `<p class="meta">আপনি আগে ${toBnDigits(past.length)}টি মতামত দিয়েছেন। ধন্যবাদ!</p>` : '';
    openForm({
      title: 'আপনার মতামত দিন', submitLabel: 'পাঠান', extraHtml: `<p class="meta">ফ্রি মেয়াদে অ্যাপ কেমন লাগছে, কী যোগ করলে ভালো হয়, লিখে জানান।</p>${pastHtml}`,
      fields: [{ name: 'message', label: 'মতামত', type: 'textarea', required: true, max: 2000 }],
      onSubmit: async (d) => {
        try { await state.be.submitFeedback(d.message); } catch (ex) { ex.friendly = friendlyError(ex); throw ex; }
        toast('ধন্যবাদ! আপনার মতামত পাঠানো হয়েছে');
      },
    });
  },
  profile: () => openForm({
    title: 'ব্যবসার তথ্য', values: state.profile,
    fields: [
      { name: 'business_name', label: 'ব্যবসার নাম', required: true },
      { name: 'owner_name', label: 'আপনার নাম' },
      { name: 'phone', label: 'মোবাইল নম্বর', type: 'tel' },
    ],
    onSubmit: async (d) => {
      try { await state.be.updateProfile(d); } catch (ex) { ex.friendly = friendlyError(ex); throw ex; }
      state.profile = await state.be.getProfile();
      renderMain();
      toast('সেভ হয়েছে');
    },
  }),
  logout,
};

// মেয়াদ চলাকালীন অ্যাপ খোলা থাকলেও প্রতি ১০ মিনিটে মেয়াদ যাচাই
setInterval(async () => {
  if (!state.profile || !state.be) return;
  try {
    state.profile = await state.be.getProfile();
    if (accessStatus(state.profile, now()).state === 'locked' && !$('[data-screen=locked]')) renderLocked();
  } catch (_) { /* পরের বার */ }
}, 10 * 60 * 1000);

boot();
