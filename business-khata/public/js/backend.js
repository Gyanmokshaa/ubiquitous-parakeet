// ডেটা লেয়ার: আসল Supabase, অথবা টেস্ট/ডেমোর জন্য ব্রাউজারের ভেতরের ডেমো ব্যাকএন্ড।
// দুটোর ইন্টারফেস এক, তাই অ্যাপের বাকি কোড একই থাকে।
import { TRIAL_DAYS, DAY_MS, accessStatus } from './logic.js';

export const TABLES = ['stock_items', 'clients', 'sales', 'expenses', 'emis'];

const ORDER = {
  stock_items: ['name', true],
  clients: ['name', true],
  sales: ['sale_date', false],
  expenses: ['expense_date', false],
  emis: ['next_due_date', true],
};

export async function loadConfig() {
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') return { demo: true };
  try {
    const res = await fetch('/api/config', { cache: 'no-store' });
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.demo) return cfg;
      if (cfg.url && cfg.anonKey) return cfg;
    }
  } catch (_) { /* নিচে window কনফিগ দেখি */ }
  if (window.KHATA_CONFIG?.url && window.KHATA_CONFIG?.anonKey) return window.KHATA_CONFIG;
  return null;
}

export async function createBackend(cfg) {
  if (cfg.demo) return new DemoBackend();
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/vendor/supabase.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('supabase লাইব্রেরি লোড হয়নি'));
      document.head.appendChild(s);
    });
  }
  return new SupabaseBackend(window.supabase.createClient(cfg.url, cfg.anonKey), cfg);
}

class SupabaseBackend {
  constructor(client, cfg) {
    this.sb = client;
    this.cfg = cfg;
    this.kind = 'supabase';
  }
  async _(promise) {
    const { data, error } = await promise;
    if (error) throw error;
    return data;
  }
  async currentUser() {
    const { data } = await this.sb.auth.getSession();
    return data.session?.user ?? null;
  }
  async signUp({ email, password, business_name, owner_name, phone }) {
    const data = await this._(this.sb.auth.signUp({
      email, password,
      options: { data: { business_name, owner_name, phone }, emailRedirectTo: location.origin + '/' },
    }));
    return { user: data.user, needsConfirm: !data.session };
  }
  async signIn({ email, password }) {
    const data = await this._(this.sb.auth.signInWithPassword({ email, password }));
    return data.user;
  }
  async signOut() { await this.sb.auth.signOut(); }
  async resetPassword(email) {
    await this._(this.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' }));
  }
  async getProfile() {
    const user = await this.currentUser();
    if (!user) return null;
    return this._(this.sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
  }
  async updateProfile(patch) {
    const user = await this.currentUser();
    const { business_name, owner_name, phone } = patch;
    await this._(this.sb.from('profiles').update({ business_name, owner_name, phone }).eq('id', user.id));
  }
  async list(table) {
    const [col, asc] = ORDER[table];
    return this._(this.sb.from(table).select('*').order(col, { ascending: asc, nullsFirst: false })
      .order('created_at', { ascending: false }));
  }
  async insert(table, row) { return this._(this.sb.from(table).insert(row).select().single()); }
  async update(table, id, patch) { return this._(this.sb.from(table).update(patch).eq('id', id).select().single()); }
  async remove(table, id) { await this._(this.sb.from(table).delete().eq('id', id)); }
  async submitFeedback(message) { await this._(this.sb.from('feedback').insert({ message })); }
  async myFeedback() {
    return this._(this.sb.from('feedback').select('*').order('created_at', { ascending: false }));
  }
  async isAdmin() { return Boolean(await this._(this.sb.rpc('is_admin'))); }
  async adminListUsers() { return this._(this.sb.rpc('admin_list_users')); }
  async adminListFeedback() { return this._(this.sb.rpc('admin_list_feedback')); }
  async adminActivate(id, days) { await this._(this.sb.rpc('admin_activate', { target: id, days })); }
  async adminDeactivate(id) { await this._(this.sb.rpc('admin_deactivate', { target: id })); }
}

// ---------------------------------------------------------------------
// ডেমো ব্যাকএন্ড: localStorage এ রাখে, Supabase এর নিয়মগুলো নকল করে।
// শুধু ?demo=1 অথবা টেস্টে ব্যবহৃত হয়। ইমেইল admin@ দিয়ে শুরু হলে অ্যাডমিন।
// ---------------------------------------------------------------------
const DEMO_KEY = 'khata_demo_db_v1';

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class DemoBackend {
  constructor() {
    this.kind = 'demo';
    this.db = this._load();
  }
  _load() {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* খালি দিয়ে শুরু */ }
    return { users: [], session: null, profiles: [], feedback: [], ...Object.fromEntries(TABLES.map((t) => [t, []])) };
  }
  _save() {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(this.db)); } catch (_) { /* ignore */ }
  }
  _now() { return window.__KHATA_NOW__ ? new Date(window.__KHATA_NOW__) : new Date(); }
  _uid() { return this.db.session; }
  _profile(id = this._uid()) { return this.db.profiles.find((p) => p.id === id) || null; }
  _requireAccess() {
    const p = this._profile();
    if (!p || accessStatus(p, this._now()).state === 'locked') {
      throw new Error('new row violates row-level security policy');
    }
  }
  _requireAdmin() {
    const u = this.db.users.find((x) => x.id === this._uid());
    if (!u || !u.email.startsWith('admin@')) throw new Error('not_admin 42501');
  }
  async currentUser() {
    const u = this.db.users.find((x) => x.id === this._uid());
    return u ? { id: u.id, email: u.email } : null;
  }
  async signUp({ email, password, business_name = '', owner_name = '', phone = '' }) {
    email = email.trim().toLowerCase();
    if (this.db.users.some((u) => u.email === email)) throw new Error('User already registered');
    const id = uuid();
    const now = this._now();
    this.db.users.push({ id, email, password });
    this.db.profiles.push({
      id, email, business_name, owner_name, phone,
      created_at: now.toISOString(),
      trial_ends_at: new Date(now.getTime() + TRIAL_DAYS * DAY_MS).toISOString(),
      activated: false, activated_at: null, activated_until: null,
    });
    this.db.session = id;
    this._save();
    return { user: { id, email }, needsConfirm: false };
  }
  async signIn({ email, password }) {
    const u = this.db.users.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new Error('Invalid login credentials');
    this.db.session = u.id;
    this._save();
    return { id: u.id, email: u.email };
  }
  async signOut() { this.db.session = null; this._save(); }
  async resetPassword() { /* ডেমোতে কিছু হয় না */ }
  async getProfile() { const p = this._profile(); return p ? { ...p } : null; }
  async updateProfile({ business_name, owner_name, phone }) {
    Object.assign(this._profile(), { business_name, owner_name, phone });
    this._save();
  }
  async list(table) {
    const p = this._profile();
    if (!p || accessStatus(p, this._now()).state === 'locked') return [];
    const [col, asc] = ORDER[table];
    const rows = this.db[table].filter((r) => r.user_id === p.id).map((r) => ({ ...r }));
    rows.sort((a, b) => {
      const x = a[col] ?? '￿';
      const y = b[col] ?? '￿';
      const c = String(x).localeCompare(String(y), 'bn');
      return (asc ? c : -c) || String(b.created_at).localeCompare(String(a.created_at));
    });
    return rows;
  }
  async insert(table, row) {
    this._requireAccess();
    const rec = { id: uuid(), user_id: this._uid(), created_at: this._now().toISOString(), ...row };
    this.db[table].push(rec);
    if (table === 'sales' && rec.stock_id && Number(rec.quantity) > 0) {
      const item = this.db.stock_items.find((s) => s.id === rec.stock_id && s.user_id === rec.user_id);
      if (item) item.quantity = Number(item.quantity) - Number(rec.quantity);
    }
    this._save();
    return { ...rec };
  }
  async update(table, id, patch) {
    this._requireAccess();
    const rec = this.db[table].find((r) => r.id === id && r.user_id === this._uid());
    if (!rec) throw new Error('row-level security');
    Object.assign(rec, patch);
    this._save();
    return { ...rec };
  }
  async remove(table, id) {
    this._requireAccess();
    const idx = this.db[table].findIndex((r) => r.id === id && r.user_id === this._uid());
    if (idx < 0) return;
    const [rec] = this.db[table].splice(idx, 1);
    if (table === 'sales' && rec.stock_id && Number(rec.quantity) > 0) {
      const item = this.db.stock_items.find((s) => s.id === rec.stock_id);
      if (item) item.quantity = Number(item.quantity) + Number(rec.quantity);
    }
    if (table === 'clients') {
      for (const t of ['sales', 'emis']) this.db[t].forEach((r) => { if (r.client_id === id) r.client_id = null; });
    }
    if (table === 'stock_items') this.db.sales.forEach((r) => { if (r.stock_id === id) r.stock_id = null; });
    this._save();
  }
  async submitFeedback(message) {
    const p = this._profile();
    if (!p || !accessStatus(p, this._now()).inTrial) throw new Error('row-level security');
    this.db.feedback.push({ id: uuid(), user_id: p.id, message, created_at: this._now().toISOString() });
    this._save();
  }
  async myFeedback() {
    return this.db.feedback.filter((f) => f.user_id === this._uid()).reverse();
  }
  async isAdmin() {
    const u = this.db.users.find((x) => x.id === this._uid());
    return Boolean(u && u.email.startsWith('admin@'));
  }
  async adminListUsers() {
    this._requireAdmin();
    const now = this._now();
    return this.db.profiles.map((p) => ({
      ...p,
      has_access: accessStatus(p, now).state !== 'locked',
      feedback_count: this.db.feedback.filter((f) => f.user_id === p.id).length,
    })).reverse();
  }
  async adminListFeedback() {
    this._requireAdmin();
    return this.db.feedback.map((f) => {
      const p = this._profile(f.user_id) || {};
      return { ...f, email: p.email, business_name: p.business_name };
    }).reverse();
  }
  async adminActivate(id, days) {
    this._requireAdmin();
    const p = this._profile(id);
    if (!p) throw new Error('user_not_found');
    const now = this._now();
    p.activated = true;
    p.activated_at = now.toISOString();
    p.activated_until = days ? new Date(now.getTime() + days * DAY_MS).toISOString() : null;
    this._save();
  }
  async adminDeactivate(id) {
    this._requireAdmin();
    const p = this._profile(id);
    if (p) { p.activated = false; p.activated_until = null; this._save(); }
  }
}
