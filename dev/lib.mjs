// Local test harness: Postgres in WASM (PGlite) + a fake Telegram API + a controllable clock.
import { PGlite } from '@electric-sql/pglite';
import { createApp, resetMigrationCache, signInitData } from '../supabase/functions/_shared/core.js';

export const FAKE_TOKEN = '123456:FAKE-TOKEN-for-local-tests';
export const OWNER = { id: 1001, first_name: 'Orxan' };
const TG = 'http://fake-telegram';

export async function makeHarness({ dataDir, startMs } = {}) {
  resetMigrationCache();
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = {
    q: async (text, params = []) => (await pg.query(text, params)).rows,
    exec: text => pg.exec(text),
  };
  const clock = { ms: startMs ?? Date.now(), fixed: startMs != null };
  const now = () => (clock.fixed ? clock.ms : Date.now());

  // Every call the backend makes to Telegram lands here.
  const calls = [];
  const files = new Map();
  async function fetchImpl(url, init = {}) {
    if (!String(url).startsWith(TG)) return fetch(url, init);
    const path = String(url).slice(TG.length);
    const fileMatch = path.match(/^\/file\/bot[^/]+\/(.+)$/);
    if (fileMatch) {
      const blob = files.get(fileMatch[1]);
      return blob ? new Response(blob, { headers: { 'content-type': 'image/jpeg' } }) : new Response('nf', { status: 404 });
    }
    const method = path.split('/').pop();
    let payload;
    if (init.body instanceof FormData) {
      payload = Object.fromEntries([...init.body.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '[file]']));
      const photo = init.body.get('photo');
      const id = 'FILE_' + (files.size + 1);
      if (photo) files.set(`photos/${id}.jpg`, photo);
      calls.push({ method, payload });
      return Response.json({ ok: true, result: { message_id: calls.length, photo: [{ file_id: id + '_small' }, { file_id: id }] } });
    }
    payload = init.body ? JSON.parse(init.body) : {};
    calls.push({ method, payload });
    if (method === 'getFile') return Response.json({ ok: true, result: { file_path: `photos/${payload.file_id}.jpg` } });
    return Response.json({ ok: true, result: { message_id: calls.length } });
  }

  const env = { BOT_TOKEN: FAKE_TOKEN, FUNC_URL: 'http://localhost:8787/functions/v1/pehlevan', APP_URL: 'http://localhost:8787/', TG_API: TG, DEV: true };
  const app = createApp({ db, env, now, fetchImpl });

  const initData = async (user = OWNER) => signInitData(user, FAKE_TOKEN, Math.floor(now() / 1000));
  return { app, db, pg, clock, calls, env, initData };
}
