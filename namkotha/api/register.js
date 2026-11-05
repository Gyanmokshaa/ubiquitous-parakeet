import { put } from '@vercel/blob';

const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const b = req.body || {};
  const at = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    if (b.unknownOnly) {
      const cardName = clean(b.cardName, 40);
      if (!cardName) return res.status(400).json({ ok: false });
      await put(`unknown/${id}.json`, JSON.stringify({ at, cardName }), { access: 'private', contentType: 'application/json', addRandomSuffix: false });
      return res.json({ ok: true });
    }
    const phone = String(b.phone ?? '').replace(/\D/g, '');
    const name = clean(b.name, 60);
    if (!/^[6-9]\d{9}$/.test(phone) || !name || b.consent !== true) return res.status(400).json({ ok: false });
    const rec = { at, name, phone, hasBusiness: !!b.hasBusiness, businessName: clean(b.businessName, 80), cardName: clean(b.cardName, 40), known: !!b.known, consent: true };
    await put(`registrations/${id}.json`, JSON.stringify(rec), { access: 'private', contentType: 'application/json', addRandomSuffix: false });
    return res.json({ ok: true });
  } catch (e) {
    console.error('register failed', e?.message);
    return res.status(500).json({ ok: false });
  }
}
