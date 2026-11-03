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
    res.setHeader('WWW-Authenticate', 'Basic realm="GM Business Card"');
    return res.status(401).end('Password needed');
  }
  const recs = await readAll('business/');
  const rows = [['Time', 'Business name', 'Phone', 'Facebook', 'Instagram', 'Product type', 'Colour', 'Consent'].map(csv).join(',')];
  for (const r of recs) rows.push([r.at, r.businessName, r.phone, r.facebook, r.instagram, r.productType, r.color, r.consent ? 'Yes' : 'No'].map(csv).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="gm-business-cards.csv"');
  res.setHeader('Cache-Control', 'no-store');
  return res.send('﻿' + rows.join('\r\n'));
}
