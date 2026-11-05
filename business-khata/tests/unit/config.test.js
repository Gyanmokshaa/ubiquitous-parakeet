import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/config.js';

test('/api/config শুধু পাবলিক তথ্য দেয়', () => {
  process.env.SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-should-never-leak';
  let body; let code; const headers = {};
  const res = {
    setHeader: (k, v) => { headers[k] = v; },
    status(c) { code = c; return this; },
    json(b) { body = b; },
  };
  handler({}, res);
  assert.equal(code, 200);
  assert.equal(body.url, 'https://x.supabase.co');
  assert.equal(body.anonKey, 'anon');
  assert.ok(!JSON.stringify(body).includes('secret'));
  assert.equal(headers['Cache-Control'], 'no-store');
});
