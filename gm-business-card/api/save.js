import { put } from '@vercel/blob';

const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const COLORS = ['blue', 'green', 'maroon', 'purple', 'black', 'orange'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const b = req.body || {};
  let phone = String(b.phone ?? '').replace(/\D/g, '');
  if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
  const businessName = clean(b.businessName, 60);
  const productType = clean(b.productType, 60);
  const facebook = clean(b.facebook, 120);
  const instagram = clean(b.instagram, 60);
  const color = COLORS.includes(b.color) ? b.color : '';
  if (!/^[6-9]\d{9}$/.test(phone) || !businessName || !productType || !facebook || !instagram || !color || b.consent !== true) {
    return res.status(400).json({ ok: false });
  }
  const at = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const rec = { at, businessName, phone, facebook, instagram, productType, color, consent: true };
  try {
    await put(`business/${id}.json`, JSON.stringify(rec), { access: 'private', contentType: 'application/json', addRandomSuffix: false });
    return res.json({ ok: true });
  } catch (e) {
    console.error('save failed', e?.message);
    return res.status(500).json({ ok: false });
  }
}
