// Local dev server: serves the mini app + the backend (PGlite + fake Telegram) on one port.
//   cd dev && npm install && npm run dev   →  http://localhost:8787
// /dev/initdata gives the browser a signed test identity; /dev/messages shows what the "bot" sent.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeHarness, OWNER, FAKE_TOKEN } from './lib.mjs';
import { derivedSecret } from '../supabase/functions/_shared/core.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = +(process.env.PORT || 8787);
const h = await makeHarness({ dataDir: process.env.MEMORY ? undefined : fileURLToPath(new URL('./.pgdata', import.meta.url)) });

// Claim the bot as the test owner (same as sending /start).
const secret = await derivedSecret(FAKE_TOKEN, 'webhook');
await h.app.handle(new Request('http://x/pehlevan/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': secret }, body: JSON.stringify({ message: { text: '/start', from: OWNER, chat: { id: OWNER.id, type: 'private' } } }) }));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/dev/initdata') { res.end(await h.initData()); return; }
    if (url.pathname === '/dev/messages') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(h.calls.slice(-30), null, 2)); return; }
    if (url.pathname === '/dev/cron') { const r = await h.app.runCron(); res.end(JSON.stringify(r)); return; }
    if (url.pathname.startsWith('/functions/v1/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
      const response = await h.app.handle(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    if (!path || path.endsWith('/') || path.endsWith('\\')) path += 'index.html';
    if (path.includes('..') || path.startsWith('dev') || path.startsWith('supabase')) { res.writeHead(404); res.end(); return; }
    const file = await readFile(join(ROOT, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(file);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500); res.end(String(e.message));
  }
}).listen(PORT, () => console.log(`Pəhləvan dev → http://localhost:${PORT}`));
