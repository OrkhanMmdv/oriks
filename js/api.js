// Talks to the Supabase Edge Function. Every call carries Telegram's signed initData.
import { tg } from './ui.js';

const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
export const API = LOCAL ? '/functions/v1/pehlevan' : 'https://yjuujzeukhlsphibluwv.supabase.co/functions/v1/pehlevan';

let initData = tg && tg.initData ? tg.initData : '';

// Outside Telegram on the local dev server, ask it for a signed test identity.
export async function ensureIdentity() {
  if (initData) return true;
  if (LOCAL) {
    const r = await fetch('/dev/initdata');
    initData = await r.text();
    return true;
  }
  return false;
}

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function call(action, body = {}) {
  let res;
  try {
    res = await fetch(`${API}/a/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-init-data': initData },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'İnternet yoxdu, qağa. Bir də yoxla.');
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new ApiError(res.status, j.error || 'Xəta');
  return j;
}

export const photoUrl = fileId => `${API}/photo?f=${encodeURIComponent(fileId)}&init=${encodeURIComponent(initData)}`;
