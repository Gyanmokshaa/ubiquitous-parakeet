// অ্যাডমিন প্যানেল: সব ইউজার, মতামত, অ্যাকাউন্ট অ্যাক্টিভেশন
import {
  accessStatus, escapeHtml, formatDateBn, toBnDigits, telLink, whatsappLink, normalizePhone,
  matchesSearch, friendlyError,
} from './logic.js';
import { loadConfig, createBackend } from './backend.js';
import { $, toast, openForm, confirmBox } from './ui.js';

const app = document.getElementById('app');
const st = { be: null, cfg: null, users: [], feedback: [], tab: 'users', filter: 'all', q: '' };
const now = () => (window.__KHATA_NOW__ ? new Date(window.__KHATA_NOW__) : new Date());

async function boot() {
  try {
    st.cfg = await loadConfig();
    if (!st.cfg) {
      app.innerHTML = '<div class="auth"><div class="card">সেটআপ বাকি: SUPABASE_URL ও SUPABASE_ANON_KEY দিন।</div></div>';
      return;
    }
    st.be = await createBackend(st.cfg);
    if (!(await st.be.currentUser())) return renderLogin();
    await enter();
  } catch (ex) {
    app.innerHTML = `<div class="auth"><div class="card">${escapeHtml(friendlyError(ex))}</div></div>`;
  }
}

function renderLogin(msg = '') {
  app.innerHTML = `<div class="auth">
    <div class="brand-mark"><div class="logo" aria-hidden="true">অ</div><h1>অ্যাডমিন প্যানেল</h1><p>ব্যবসার খাতা</p></div>
    <form class="card" id="f" novalidate>
      <div class="field"><label for="email">ইমেইল</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="password">পাসওয়ার্ড</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
      <div class="error-msg" role="alert">${escapeHtml(msg)}</div>
      <button class="btn primary block" type="submit">লগইন</button>
    </form></div>`;
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    try {
      await st.be.signIn({ email: d.email.trim(), password: d.password });
      await enter();
    } catch (ex) {
      e.target.querySelector('.error-msg').textContent = friendlyError(ex);
    }
  };
}

async function enter() {
  if (!(await st.be.isAdmin())) {
    await st.be.signOut();
    return renderLogin('এই অ্যাকাউন্টের অ্যাডমিন অনুমতি নেই। SETUP.md এর ধাপ দেখুন।');
  }
  await reload();
}

async function reload() {
  [st.users, st.feedback] = await Promise.all([st.be.adminListUsers(), st.be.adminListFeedback()]);
  render();
}

function userStatus(u) {
  const s = accessStatus(u, now());
  if (s.state === 'active') return { cls: 'ok', text: s.endsAt ? `সক্রিয় (${formatDateBn(s.endsAt)} পর্যন্ত)` : 'সক্রিয় (সীমাহীন)', key: 'active' };
  if (s.state === 'trial') return { cls: s.daysLeft <= 3 ? 'warn' : '', text: `ফ্রি মেয়াদ: ${toBnDigits(s.daysLeft)} দিন বাকি`, key: 'trial' };
  return { cls: 'danger', text: 'লক (মেয়াদ শেষ)', key: 'locked' };
}

function userCard(u) {
  const s = userStatus(u);
  const phone = normalizePhone(u.phone);
  return `<div class="item" data-user="${escapeHtml(u.email)}">
    <div class="item-top"><div style="min-width:0">
      <div class="item-title">${escapeHtml(u.business_name || '(নাম নেই)')}</div>
      <div class="meta">${escapeHtml(u.owner_name || '')} ${escapeHtml(u.email || '')}</div></div>
      ${phone ? `<div class="contact-btns"><a class="btn call" href="${escapeHtml(telLink(u.phone))}" aria-label="কল">📞</a>
        <a class="btn wa" href="${escapeHtml(whatsappLink(u.phone))}" target="_blank" rel="noopener">WA</a></div>` : ''}</div>
    <div><span class="badge ${s.cls}" data-status="${s.key}">${s.text}</span>
      ${u.feedback_count ? ` <span class="badge">মতামত ${toBnDigits(u.feedback_count)}</span>` : ''}</div>
    <div class="meta">সাইনআপ: ${formatDateBn(u.created_at)} · ফ্রি মেয়াদ শেষ: ${formatDateBn(u.trial_ends_at)}${u.phone ? ' · ফোন: ' + escapeHtml(u.phone) : ''}</div>
    <div class="row-actions">
      <button class="btn small primary" data-act="activate" data-id="${u.id}">অ্যাক্টিভেট</button>
      ${u.activated ? `<button class="btn small danger" data-act="deactivate" data-id="${u.id}">ডিঅ্যাক্টিভেট</button>` : ''}
    </div></div>`;
}

function feedbackCard(f) {
  return `<div class="item"><div class="item-top"><div class="item-title">${escapeHtml(f.business_name || f.email || '')}</div>
    <div class="meta">${formatDateBn(f.created_at)}</div></div>
    <div class="meta">${escapeHtml(f.email || '')}</div>
    <div style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(f.message)}</div></div>`;
}

function render() {
  const counts = { all: st.users.length, trial: 0, active: 0, locked: 0 };
  st.users.forEach((u) => { counts[userStatus(u).key]++; });
  const users = st.users
    .filter((u) => st.filter === 'all' || userStatus(u).key === st.filter)
    .filter((u) => matchesSearch(u, st.q, ['email', 'business_name', 'owner_name', 'phone']));
  const fl = (k, label) => `<button class="btn small" data-filter="${k}" aria-pressed="${st.filter === k}">${label} (${toBnDigits(counts[k])})</button>`;
  app.innerHTML = `<div class="shell" style="padding-bottom:24px">
    <header class="topbar"><h1>অ্যাডমিন প্যানেল</h1>
      <button class="icon-btn" id="refresh" aria-label="রিফ্রেশ">↻</button>
      <button class="icon-btn" id="logout">লগআউট</button></header>
    <main>
      <div class="stats">
        <div class="stat"><div class="label">মোট ইউজার</div><div class="value">${toBnDigits(counts.all)}</div></div>
        <div class="stat"><div class="label">ফ্রি মেয়াদে</div><div class="value">${toBnDigits(counts.trial)}</div></div>
        <div class="stat good"><div class="label">সক্রিয়</div><div class="value">${toBnDigits(counts.active)}</div></div>
        <div class="stat bad"><div class="label">লক</div><div class="value">${toBnDigits(counts.locked)}</div></div>
      </div>
      <div class="tabs" role="tablist" style="margin-top:14px">
        <button role="tab" data-tab="users" aria-selected="${st.tab === 'users'}">ইউজার</button>
        <button role="tab" data-tab="feedback" aria-selected="${st.tab === 'feedback'}">মতামত (${toBnDigits(st.feedback.length)})</button>
      </div>
      ${st.tab === 'users' ? `
        <div class="filter-row">${fl('all', 'সব')}${fl('trial', 'ফ্রি')}${fl('locked', 'লক')}${fl('active', 'সক্রিয়')}</div>
        <input class="search" type="search" id="q" placeholder="ইমেইল, নাম বা ফোন দিয়ে খুঁজুন" aria-label="খুঁজুন" value="${escapeHtml(st.q)}">
        ${users.length ? `<div class="list">${users.map(userCard).join('')}</div>` : '<div class="empty">কোনো ইউজার নেই</div>'}`
      : (st.feedback.length ? `<div class="list">${st.feedback.map(feedbackCard).join('')}</div>` : '<div class="empty">এখনও কোনো মতামত আসেনি</div>')}
    </main></div>`;
  $('#refresh').onclick = () => reload().then(() => toast('আপডেট হয়েছে')).catch((e) => toast(friendlyError(e)));
  $('#logout').onclick = async () => { await st.be.signOut(); renderLogin(); };
  app.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { st.tab = b.dataset.tab; render(); }; });
  app.querySelectorAll('[data-filter]').forEach((b) => { b.onclick = () => { st.filter = b.dataset.filter; render(); }; });
  const q = $('#q');
  if (q) q.addEventListener('input', () => { st.q = q.value; const p = q.selectionStart; render(); const n = $('#q'); n.focus(); n.setSelectionRange(p, p); });
  app.querySelectorAll('[data-act=activate]').forEach((b) => { b.onclick = () => activate(b.dataset.id); });
  app.querySelectorAll('[data-act=deactivate]').forEach((b) => {
    b.onclick = async () => {
      if (!(await confirmBox('এই অ্যাকাউন্ট ডিঅ্যাক্টিভেট করবেন? ফ্রি মেয়াদ শেষ হলে লক হয়ে যাবে।', 'হ্যাঁ'))) return;
      try { await st.be.adminDeactivate(b.dataset.id); await reload(); toast('ডিঅ্যাক্টিভেট হয়েছে'); } catch (ex) { toast(friendlyError(ex)); }
    };
  });
}

function activate(id) {
  const u = st.users.find((x) => x.id === id);
  openForm({
    title: `অ্যাক্টিভেট: ${u.business_name || u.email}`,
    submitLabel: 'অ্যাক্টিভেট করুন',
    fields: [{
      name: 'plan', label: 'কত দিনের জন্য', type: 'select', default: '30',
      options: [
        { value: '30', label: '১ মাস (৩০ দিন)' }, { value: '90', label: '৩ মাস (৯০ দিন)' },
        { value: '180', label: '৬ মাস (১৮০ দিন)' }, { value: '365', label: '১ বছর (৩৬৫ দিন)' },
        { value: 'life', label: 'সীমাহীন' },
      ],
    }],
    onSubmit: async (d) => {
      const days = d.plan === 'life' ? null : Number(d.plan);
      try { await st.be.adminActivate(id, days); } catch (ex) { ex.friendly = friendlyError(ex); throw ex; }
      await reload();
      toast('অ্যাকাউন্ট সক্রিয় হয়েছে');
    },
  });
}

boot();
