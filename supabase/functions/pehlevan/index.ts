// Supabase Edge Function entry. All logic lives in ../_shared/core.js.
// Secrets: BOT_TOKEN (set by the deploy workflow). SUPABASE_URL and SUPABASE_DB_URL are provided by Supabase.
import postgres from 'npm:postgres@3.4.4';
import { createApp } from '../_shared/core.js';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 2, idle_timeout: 20 });

const app = createApp({
  db: {
    q: (text: string, params: unknown[] = []) => sql.unsafe(text, params as never[]),
    exec: (text: string) => sql.unsafe(text),
  },
  env: {
    BOT_TOKEN: Deno.env.get('BOT_TOKEN')!,
    FUNC_URL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/pehlevan`,
    APP_URL: Deno.env.get('APP_URL') || 'https://orkhanmmdv.github.io/oriks/',
  },
});

Deno.serve(req => app.handle(req));
