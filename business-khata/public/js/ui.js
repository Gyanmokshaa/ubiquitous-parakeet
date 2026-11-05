// ছোট UI সহায়ক: টোস্ট, ফর্ম শিট, নিশ্চিতকরণ
import { escapeHtml, parseNumber } from './logic.js';

export const $ = (sel, root = document) => root.querySelector(sel);

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function fieldHtml(f, value) {
  const id = 'f_' + f.name;
  const req = f.required ? 'required' : '';
  const v = value ?? f.default ?? '';
  let input;
  if (f.type === 'select') {
    input = `<select id="${id}" name="${f.name}" ${req}>${f.options.map((o) =>
      `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="${id}" name="${f.name}" ${req} maxlength="${f.max || 2000}">${escapeHtml(v)}</textarea>`;
  } else {
    const type = f.type === 'number' ? 'text' : (f.type || 'text');
    const mode = f.type === 'number' ? 'inputmode="decimal"' : f.type === 'tel' ? 'inputmode="tel"' : '';
    input = `<input id="${id}" name="${f.name}" type="${type}" ${mode} ${req} value="${escapeHtml(v)}"
      ${f.placeholder ? `placeholder="${escapeHtml(f.placeholder)}"` : ''} autocomplete="${f.autocomplete || 'off'}">`;
  }
  return `<div class="field"><label for="${id}">${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>${input}${
    f.hint ? `<div class="hint">${escapeHtml(f.hint)}</div>` : ''}</div>`;
}

export function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.name];
    if (!el) continue;
    let v = el.value;
    if (f.required && String(v).trim() === '') throw new Error(`"${f.label}" লিখুন`);
    if (f.type === 'number') {
      v = parseNumber(v);
      if (Number.isNaN(v)) throw new Error(`"${f.label}" এ সঠিক সংখ্যা লিখুন`);
      if (f.min !== undefined && v < f.min) throw new Error(`"${f.label}" ${f.min} এর কম হতে পারে না`);
      if (f.integer) v = Math.round(v);
    } else {
      v = v.trim();
      if (f.type === 'date' && v === '') v = null;
      if (f.type === 'select' && f.nullable && v === '') v = null;
    }
    if (f.required && (v === '' || v === null)) throw new Error(`"${f.label}" লিখুন`);
    out[f.name] = v;
  }
  return out;
}

// ফর্ম শিট খোলে; onSubmit সফল হলে বন্ধ হয়
export function openForm({ title, fields, values = {}, submitLabel = 'সেভ করুন', onSubmit, extraHtml = '' }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `
    <form class="sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}" novalidate>
      <h3>${escapeHtml(title)}</h3>
      ${extraHtml}
      ${fields.map((f) => fieldHtml(f, values[f.name])).join('')}
      <div class="error-msg" role="alert"></div>
      <div class="sheet-actions">
        <button type="button" class="btn" data-cancel>বাতিল</button>
        <button type="submit" class="btn primary">${escapeHtml(submitLabel)}</button>
      </div>
    </form>`;
  document.body.appendChild(backdrop);
  const form = backdrop.querySelector('form');
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  form.querySelector('[data-cancel]').addEventListener('click', close);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = form.querySelector('.error-msg');
    const btn = form.querySelector('[type=submit]');
    err.textContent = '';
    try {
      const data = readForm(form, fields);
      btn.disabled = true;
      await onSubmit(data);
      close();
    } catch (ex) {
      err.textContent = ex.friendly || ex.message;
      btn.disabled = false;
    }
  });
  setTimeout(() => form.querySelector('input,select,textarea')?.focus(), 50);
  return { form, close };
}

export function confirmBox(message, okLabel = 'হ্যাঁ, মুছুন') {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML = `<div class="sheet" role="alertdialog" aria-modal="true">
      <h3>${escapeHtml(message)}</h3>
      <div class="sheet-actions">
        <button class="btn" data-no>না</button>
        <button class="btn primary" data-yes>${escapeHtml(okLabel)}</button>
      </div></div>`;
    document.body.appendChild(backdrop);
    const done = (v) => { backdrop.remove(); resolve(v); };
    backdrop.querySelector('[data-no]').onclick = () => done(false);
    backdrop.querySelector('[data-yes]').onclick = () => done(true);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) done(false); });
  });
}
