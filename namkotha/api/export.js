import { list, get } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

// Opens with the browser's own password box. The password is ADMIN_KEY, which the owner sets in Vercel.
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const csv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function readAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    cursor = page.hasMore ? page.cursor : undefined;
    for (const b of page.blobs) {
      const r = await get(b.pathname, { access: 'private', useCache: false });
      if (r?.stream) out.push(JSON.parse(await new Response(r.stream).text()));
    }
  } while (cursor);
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export default async function handler(req, res) {
  const key = process.env.ADMIN_KEY;
  if (!key) return res.status(404).end();
  const pass = Buffer.from((req.headers.authorization || '').replace(/^Basic /, ''), 'base64').toString().split(':').slice(1).join(':');
  if (!same(pass, key)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Namkotha"');
    return res.status(401).end('Password needed');
  }
  const regs = await readAll('registrations/');
  const unknown = await readAll('unknown/');
  const missing = new Set([...regs.filter(r => !r.known).map(r => r.cardName), ...unknown.map(u => u.cardName)]);
  const rows = [['Time', 'Name', 'WhatsApp', 'Has business', 'Business name', 'Name looked up', 'Name found', 'Consent'].map(csv).join(',')];
  for (const r of regs) rows.push([r.at, r.name, r.phone, r.hasBusiness ? 'Yes' : 'No', r.businessName, r.cardName, r.known ? 'Yes' : 'No', r.consent ? 'Yes' : 'No'].map(csv).join(','));
  rows.push('', csv('Names to add to the list'));
  for (const n of missing) rows.push(csv(n));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="namkotha-registrations.csv"');
  res.setHeader('Cache-Control', 'no-store');
  return res.send('﻿' + rows.join('\r\n'));
}
