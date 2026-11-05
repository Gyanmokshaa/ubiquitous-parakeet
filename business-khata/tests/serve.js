// লোকাল ডেভ/টেস্ট সার্ভার: public/ ফোল্ডার পরিবেশন করে, /api/config সামলায়।
// SUPABASE_URL ও SUPABASE_ANON_KEY না থাকলে ডেমো মোডে চলে।
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

export function startServer(port = Number(process.env.PORT) || 5173) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/config') {
      const cfg = process.env.SUPABASE_URL
        ? { url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY, adminWhatsapp: process.env.ADMIN_WHATSAPP || '' }
        : { demo: true, adminWhatsapp: process.env.ADMIN_WHATSAPP || '9800000000' };
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify(cfg));
    }
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    if (!path.extname(p)) p += '.html';
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await startServer();
  console.log(`চলছে: http://127.0.0.1:${s.address().port}  (অ্যাডমিন: /admin)`);
}
