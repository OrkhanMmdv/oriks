// Pəhləvan backend — all server logic in one runtime-neutral module.
// It runs inside the Supabase Edge Function (Deno) in production and inside
// dev/server.mjs (Node + PGlite) for local testing. Nothing here touches Deno or
// Node APIs directly: the caller passes in `db`, `env` and optionally `now`.
//
//   db.q(sql, params)  -> Promise<rows[]>   (one statement, $1..$n params)
//   db.exec(sql)       -> Promise           (several statements, no params)
//   env: BOT_TOKEN, FUNC_URL (public URL of this function), APP_URL (mini app URL),
//        TG_API (Telegram API base, default https://api.telegram.org), DEV (true locally)

export const TZ = 'Europe/Riga';

/* ------------------------------------------------------------------ */
/* Defaults (all editable from the app; stored in the kv table)        */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS = {
  name: 'Orxan',
  cycleStart: '2026-10-26',
  playlist: 'https://open.spotify.com/playlist/24ODYm1iVHYYADUlLLJwE6?si=64e6166cbd9d4a34',
  kcal: 2000,
  protein: 180,
  water: 3500,            // ml per day
  waterTrainBonus: 500,   // extra ml on training days
  goalWeight: 90,
  goalRate: 1.3,          // kg lost per week
  keySupp: 'creatine',
  benchGoal: 105,         // estimated 1RM for the "Bench goal" badge
  squatGoal: 100,
  oldBest: { bench: 100, squat: 40 },
  supps: [
    { id: 'creatine', name: 'Kreatin 5 q', when: 'Səhər yeməyiynən' },
    { id: 'vitd', name: 'D3 vitamini 2000 IU', when: 'Səhər yeməyiynən' },
    { id: 'multi', name: 'Multivitamin', when: 'Səhər yeməyiynən' },
    { id: 'omega3', name: 'Omeqa-3', when: 'Axşam yeməyiynən' },
    { id: 'magnesium', name: 'Maqnezium', when: 'Yatmazdan 30 dəq qabax' },
  ],
  studyPlan: [
    { id: 'db', name: 'Verilənlər bazası kursu', minutes: 45 },
    { id: 'sql', name: 'SQL məşqi — sorğu yaz', minutes: 30 },
    { id: 'read', name: 'Başqa mövzu / oxu', minutes: 30 },
  ],
  studyGoal: 90,
};

export const DEFAULT_PRESETS = [
  { id: 'breakfast', name: 'Yeməkxana səhər yeməyi', kcal: 450, protein: 30 },
  { id: 'lunch', name: 'Yeməkxana naharı', kcal: 600, protein: 45 },
  { id: 'canteen_dinner', name: 'Yeməkxana şamı', kcal: 650, protein: 40 },
  { id: 'home_dinner', name: 'Evdə şam (balıx)', kcal: 500, protein: 45 },
  { id: 'cottage', name: 'Kəsmik 250 q', kcal: 250, protein: 40 },
  { id: 'kefir', name: 'Kefir 500 ml', kcal: 200, protein: 15 },
  { id: 'shake', name: 'Protein kokteyli', kcal: 130, protein: 25 },
  { id: 'tuna', name: 'Tuna konservi', kcal: 120, protein: 26 },
  { id: 'dessert', name: 'Şirniyyat', kcal: 250, protein: 4 },
  { id: 'fastfood', name: 'Fast food', kcal: 900, protein: 35 },
];

// Used until the app sends its own program (program.js) with /a/sync.
export const DEFAULT_SESSIONS = [
  { id: 'A', name: 'Bütün bədən A' },
  { id: 'B', name: 'Bütün bədən B' },
  { id: 'C', name: 'Bütün bədən C' },
];

export const STARTER_MOTIVATIONS = [
  'Kəpəz də bir günə ucalmıyıf, qağa. Hər məşq bir daşdı — qoy üst-üstə.',
  'Tonqal bir qığılcımnan başdıyır. Bu günkü məşq o qığılcımdı.',
  'Çəkini bir günə yığmamısan, bir günə də atmıyajaxsan. Səbr elə, qağa.',
  'Gecə acınnan ölən olmuyuf. Kəsmiyini ye, get yat.',
  'Bençpres 100 kq səni gözdüyür. Çox gözdətmə.',
  'Su iç, qağa. Su iç. Bir də su iç.',
  'Yorğunsan? Normaldı. Gəl heç olmasa isinmə elə, sonra baxarıx.',
  'Pəhləvan olmax üçün hər gün meydana çıxmax lazımdı.',
  'Bu gün yediyin zülal sabahkı əzələndi.',
  'Novruz tonqalının üstünnən hoppanan kimi — qorxma, hoppan!',
  'Gəncəli söz verəndə tutar. Özünə verdiyin sözü tut.',
];

const DEFAULT_REMINDERS = [
  { label: 'Səhər + kreatin', kind: 'morning', time: '07:15', supplements: ['creatine', 'vitd', 'multi'] },
  { label: 'Su yoxlaması', kind: 'water', time: '15:00' },
  { label: 'Növbəti məşq', kind: 'workout', time: '17:15' },
  { label: 'Omeqa-3', kind: 'supp', time: '19:45', supplements: ['omega3'] },
  { label: 'Yatmazdan zülal', kind: 'protein', time: '21:30' },
  { label: 'Axşam yoxlaması', kind: 'checkin', time: '21:45' },
  { label: 'Maqnezium', kind: 'supp', time: '23:30', supplements: ['magnesium'] },
  { label: 'Həftəlik çəki', kind: 'weighin', time: '07:00', weekdays: [1] },
  { label: 'Çəki — axşam xatırlatması', kind: 'weighin', time: '20:00', weekdays: [1] },
  { label: 'Proqres şəkilləri', kind: 'photos', time: '10:00', weekdays: [7] },
];

// The evening check-in buttons (preset ids, or special actions).
const CHECKIN_BUTTONS = [
  ['meal:canteen_dinner', 'Yeməkxana şamı'], ['meal:home_dinner', 'Evdə şam'],
  ['meal:fastfood', 'Fast food'], ['meal:dessert', 'Şirniyyat'],
  ['meal:shake', 'Kokteyl'], ['meal:cottage', 'Kəsmik'],
  ['water:500', '+500 ml su'], ['supp:creatine', 'Kreatin içdim'],
];

export const RANKS = [
  { id: 'sveji', name: 'Sveji', you: 'Svejisən', from: 1 },
  { id: 'kele', name: 'Kələ', you: 'Kələsən', from: 3 },
  { id: 'kacok', name: 'Kaçok', you: 'Kaçoksan', from: 6 },
  { id: 'ejdaha', name: 'Əjdaha', you: 'Əjdahasan', from: 10 },
];

export const BADGES = [
  { id: 'first_rep', name: 'İlk təkrar', desc: 'İlk məşqi yaz' },
  { id: 'week_one', name: 'Birinci həftə', desc: 'Bir həftədə 3 məşq' },
  { id: 'new_best', name: 'Yeni rekord', desc: 'İlk rekord set' },
  { id: 'on_scale', name: 'Tərəzidə', desc: 'İlk çəki' },
  { id: 'hydrated', name: 'Su pəhləvanı', desc: '7 gün dalbadal su hədəfi' },
  { id: 'creatine30', name: 'Kreatin 30', desc: '30 gün dalbadal kreatin' },
  { id: 'clean_week', name: 'Təmiz həftə', desc: '7 yazılı gün, fast food yox' },
  { id: 'full_row', name: 'Dolu sıra', desc: 'Bir həftədə 4 məşq' },
  { id: 'early_bird', name: 'Sübh quşu', desc: '08:00-dan qabax 5 məşq' },
  { id: 'bench_goal', name: 'Bençpres hədəfi', desc: 'Bençpres maksimumu hədəfə çatsın' },
  { id: 'squat_goal', name: 'Squat hədəfi', desc: 'Squat maksimumu hədəfə çatsın' },
  { id: 'finisher', name: 'Tonqal tamamdı', desc: '12 həftənin 48 alovu yansın' },
];

export const PHASES = [
  { id: 'reentry', name: 'Qayıdış', weeks: [1, 2] },
  { id: 'build1', name: 'Güc yığırıx', weeks: [3, 4, 5, 6] },
  { id: 'deload', name: 'Nəfəs dərmə', weeks: [7] },
  { id: 'build2', name: 'Güc yığırıx II', weeks: [8, 9, 10, 11] },
  { id: 'test', name: 'Sınax + dincəlmə', weeks: [12] },
];

/* ------------------------------------------------------------------ */
/* Small helpers                                                        */
/* ------------------------------------------------------------------ */

const DAY = 86400000;

// Local Riga date/time parts for a moment in ms.
export function local(ms) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(new Date(ms)).map(p => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const wd = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday];
  return { date, hm: `${parts.hour}:${parts.minute}`, minutes: +parts.hour * 60 + +parts.minute, weekday: wd, hour: +parts.hour };
}
export const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
const isoWeekday = date => ((new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7) + 1;
const mondayOf = date => addDays(date, 1 - isoWeekday(date));
const hmToMin = hm => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + (m || 0); };
export const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);
const round1 = x => Math.round(x * 10) / 10;
const fmtL = ml => (ml / 1000).toFixed(ml % 1000 ? (ml % 100 ? 2 : 1) : 1);
const DESSERT_RE = /(desert|dessert|şirniyyat|tort|cake|donut|ponçik|pişi|şokolad|chocolate|konfet|candy|dondurma|ice ?cream|paxlava|baklava|şəkərbura|cookie|peçenye)/i;
const FASTFOOD_RE = /(fast ?food|burger|kfc|mcdonald|pizza|pitsa|doner|dönər|shawarma|şaurma|kebab)/i;

async function hmacRaw(key, msg) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
}
const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');

// Secrets derived from the bot token, so only BOT_TOKEN has to be configured.
export async function derivedSecret(token, purpose) {
  return hex(await hmacRaw('pehlevan-' + purpose, token)).slice(0, 40);
}

// Check Telegram WebApp initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
export async function verifyInitData(initData, token, nowMs, maxAgeSec = 86400) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const check = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = await hmacRaw('WebAppData', token);
  if (hex(await hmacRaw(secret, check)) !== hash) return null;
  const authDate = +params.get('auth_date');
  if (!authDate || nowMs / 1000 - authDate > maxAgeSec) return null;
  try { return JSON.parse(params.get('user')); } catch { return null; }
}

// Build a signed initData string (used only by local tests and the dev server).
export async function signInitData(user, token, authDateSec) {
  const params = new URLSearchParams({ auth_date: String(authDateSec), query_id: 'dev', user: JSON.stringify(user) });
  const check = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  params.set('hash', hex(await hmacRaw(await hmacRaw('WebAppData', token), check)));
  return params.toString();
}

/* ------------------------------------------------------------------ */
/* Database: schema + small flagged migrations                          */
/* ------------------------------------------------------------------ */

const SCHEMA = `
create schema if not exists app;
create table if not exists app.kv (key text primary key, value jsonb);
create table if not exists app.workouts (id serial primary key, session text not null, week int, started_at double precision, finished_at double precision, notes text default '', draft jsonb);
create table if not exists app.sets (id serial primary key, workout_id int references app.workouts(id) on delete cascade, exercise text not null, idx int not null, weight double precision not null default 0, reps int not null default 0);
create index if not exists sets_exercise on app.sets(exercise);
create table if not exists app.meals (id serial primary key, date text not null, time text, preset text, name text not null, kcal int not null default 0, protein int not null default 0, comment text default '', photo_id text);
create index if not exists meals_date on app.meals(date);
create table if not exists app.photos (id serial primary key, file_id text not null, kind text not null, date text not null, caption text default '');
create table if not exists app.weights (date text primary key, kg double precision not null);
create table if not exists app.water (date text primary key, ml int not null default 0);
create table if not exists app.supps (date text not null, supplement text not null, time text, primary key (date, supplement));
create table if not exists app.cardio (id serial primary key, date text not null, minutes int not null, kind text);
create table if not exists app.motivations (id serial primary key, text text not null, mine boolean not null default false);
create table if not exists app.reminders (id serial primary key, label text not null, kind text not null, time text not null, supplements jsonb default '[]', weekdays jsonb default '[1,2,3,4,5,6,7]', enabled boolean default true, last_sent text);
create table if not exists app.dayoff (date text primary key);
create table if not exists app.checkins (date text primary key, at double precision);
create table if not exists app.badges (id text primary key, unlocked_at double precision);
create table if not exists app.workdays (date text primary key);
create table if not exists app.study (date text not null, task text not null, minutes int not null, primary key (date, task));
create table if not exists app.study_notes (date text primary key, extra int default 0, note text default '');
`;

// Each migration runs once; its id is remembered in kv('migrations').
const MIGRATIONS = [
  ['001_schema', async db => {
    await db.exec(SCHEMA);
    // Keep the app schema away from Supabase's public REST API roles (roles don't exist in local tests).
    try { await db.exec('revoke all on schema app from anon, authenticated'); } catch { /* local */ }
  }],
  ['002_seed', async db => {
    for (const t of STARTER_MOTIVATIONS) await db.q('insert into app.motivations (text, mine) values ($1, false)', [t]);
    for (const r of DEFAULT_REMINDERS) {
      await db.q('insert into app.reminders (label, kind, time, supplements, weekdays) values ($1,$2,$3,$4::jsonb,$5::jsonb)',
        [r.label, r.kind, r.time, JSON.stringify(r.supplements || []), JSON.stringify(r.weekdays || [1, 2, 3, 4, 5, 6, 7])]);
    }
  }],
  ['003_import_old_app', async db => {
    // Copy what the previous version (public.* tables) stored. Each step is optional.
    const steps = [
      `insert into app.weights (date, kg) select day::text, kg from public.weights on conflict do nothing`,
      `insert into app.meals (date, name, kcal, protein, comment) select day::text, name, kcal, 0, '' from public.meals`,
      `insert into app.workdays (date) select day::text from public.work_days on conflict do nothing`,
      `insert into app.study (date, task, minutes) select day::text, task, minutes from public.study_tasks on conflict do nothing`,
      `insert into app.study_notes (date, extra, note) select day::text, extra_min, note from public.study_days on conflict do nothing`,
    ];
    for (const s of steps) { try { await db.q(s); } catch { /* table missing: nothing to import */ } }
  }],
];

let migrated = null;
export function ensureSchema(db) {
  if (!migrated) {
    migrated = (async () => {
      await db.exec('create schema if not exists app; create table if not exists app.kv (key text primary key, value jsonb);');
      const done = (await db.q(`select value from app.kv where key = 'migrations'`))[0]?.value || [];
      for (const [id, run] of MIGRATIONS) {
        if (done.includes(id)) continue;
        await run(db);
        done.push(id);
        await db.q(`insert into app.kv (key, value) values ('migrations', $1::jsonb) on conflict (key) do update set value = excluded.value`, [JSON.stringify(done)]);
      }
    })().catch(e => { migrated = null; throw e; });
  }
  return migrated;
}
export const resetMigrationCache = () => { migrated = null; };

/* ------------------------------------------------------------------ */
/* The app                                                              */
/* ------------------------------------------------------------------ */

export function createApp({ db, env, now = () => Date.now(), fetchImpl = (...a) => fetch(...a) }) {
  const TG = (env.TG_API || 'https://api.telegram.org');
  const token = env.BOT_TOKEN;

  /* ---------- kv ---------- */
  const getKV = async (key, def) => {
    const r = await db.q('select value from app.kv where key = $1', [key]);
    return r.length && r[0].value != null ? r[0].value : def;
  };
  const setKV = (key, value) => db.q('insert into app.kv (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value', [key, JSON.stringify(value)]);
  const settings = async () => ({ ...DEFAULT_SETTINGS, ...(await getKV('settings', {})) });
  const presets = async () => getKV('presets', DEFAULT_PRESETS);
  const programMeta = async () => getKV('program', { sessions: DEFAULT_SESSIONS });

  /* ---------- Telegram ---------- */
  async function tg(method, payload) {
    try {
      const res = await fetchImpl(`${TG}/bot${token}/${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!j.ok) console.error('telegram', method, j.description);
      return j;
    } catch (e) { console.error('telegram', method, e); return { ok: false }; }
  }
  const ownerInfo = () => getKV('owner', null);
  async function sendOwner(text, extra = {}) {
    const o = await ownerInfo();
    if (!o) return null;
    return tg('sendMessage', { chat_id: o.chat_id, text, parse_mode: 'HTML', ...extra });
  }
  const openAppButton = () => ({ inline_keyboard: [[{ text: 'Proqramı aç', web_app: { url: env.APP_URL } }]] });

  /* ---------- load everything (one owner, small data) ---------- */
  async function loadAll() {
    const [workouts, sets, meals, weights, water, supps, cardio, dayoff, checkins, badges, photos] = await Promise.all([
      db.q('select * from app.workouts order by started_at'),
      db.q('select * from app.sets order by workout_id, exercise, idx'),
      db.q('select * from app.meals order by date, id'),
      db.q('select * from app.weights order by date'),
      db.q('select * from app.water'),
      db.q('select * from app.supps'),
      db.q('select * from app.cardio order by date, id'),
      db.q('select * from app.dayoff'),
      db.q('select * from app.checkins'),
      db.q('select * from app.badges'),
      db.q('select id, file_id, kind, date, caption from app.photos order by date, id'),
    ]);
    return { workouts, sets, meals, weights, water, supps, cardio, dayoff, checkins, badges, photos };
  }

  /* ---------- gamification (always computed from the logged data) ---------- */
  function compute(all, s, todayDate, nowMs) {
    const finished = all.workouts.filter(w => w.finished_at);
    const trainedOn = new Set(finished.map(w => local(w.finished_at).date));
    const trainedDates = [...trainedOn].sort();
    const byDate = {};
    const day = d => (byDate[d] ||= { meals: [], kcal: 0, protein: 0, desserts: 0, fastfood: 0, water: 0, supps: new Set() });
    for (const m of all.meals) {
      const d = day(m.date);
      d.meals.push(m); d.kcal += m.kcal; d.protein += m.protein;
      if (m.preset === 'dessert' || DESSERT_RE.test(m.name)) d.desserts++;
      if (m.preset === 'fastfood' || FASTFOOD_RE.test(m.name)) d.fastfood++;
    }
    for (const w of all.water) day(w.date).water = w.ml;
    for (const x of all.supps) day(x.date).supps.add(x.supplement);

    const waterTarget = d => s.water + (trainedOn.has(d) ? s.waterTrainBonus : 0);
    const lastTrainedOnOrBefore = d => { let r = null; for (const t of trainedDates) { if (t <= d) r = t; else break; } return r; };

    function score(d) {
      const x = byDate[d] || day(d);
      const parts = { protein: 0, kcal: 0, water: 0, supp: 0, training: 0, sweets: 0 };
      if (!x.meals.length) return { total: 0, parts, noMeals: true };
      parts.protein = 25 * Math.min(1, x.protein / s.protein);
      const lo = s.kcal * 0.9, hi = s.kcal * 1.1;
      parts.kcal = x.kcal < lo ? 20 * x.kcal / lo : x.kcal <= hi ? 20 : Math.max(0, 20 - (x.kcal - hi) / 50);
      parts.water = 20 * Math.min(1, x.water / waterTarget(d));
      parts.supp = x.supps.has(s.keySupp) ? 10 : 0;
      const last = lastTrainedOnOrBefore(d);
      parts.training = last && daysBetween(last, d) <= 2 ? 15 : 0;
      parts.sweets = x.desserts <= 1 ? 10 : 0;
      for (const k in parts) parts[k] = Math.round(parts[k]);
      return { total: Object.values(parts).reduce((a, b) => a + b, 0), parts };
    }

    // Days to score: from the first logged day up to today.
    const firstDay = [Object.keys(byDate).sort()[0], trainedDates[0], all.weights[0]?.date].filter(Boolean).sort()[0] || todayDate;
    const scores = {};
    for (let d = firstDay; d <= todayDate; d = addDays(d, 1)) scores[d] = score(d);

    // New best sets, in time order.
    const setsByWorkout = {};
    for (const st of all.sets) (setsByWorkout[st.workout_id] ||= []).push(st);
    const best = {}; let newBests = 0; const bestSet = {};
    for (const w of finished) {
      for (const st of setsByWorkout[w.id] || []) {
        const v = e1rm(st.weight, st.reps);
        if (!v) continue;
        if (best[st.exercise] != null && v > best[st.exercise] + 1e-9) newBests++;
        if (best[st.exercise] == null || v > best[st.exercise]) { best[st.exercise] = v; bestSet[st.exercise] = { weight: st.weight, reps: st.reps, e1rm: round1(v), date: local(w.finished_at).date }; }
      }
    }

    // Streaks: today counts once done, otherwise count up to yesterday.
    function dayStreak(test) {
      let d = todayDate, n = 0;
      if (!test(d)) d = addDays(d, -1);
      while (test(d)) { n++; d = addDays(d, -1); if (n > 3650) break; }
      return n;
    }
    function maxRun(test) {
      let best = 0, cur = 0;
      for (let d = firstDay; d <= todayDate; d = addDays(d, 1)) { cur = test(d) ? cur + 1 : 0; best = Math.max(best, cur); }
      return best;
    }
    const tookKey = d => !!byDate[d]?.supps.has(s.keySupp);
    const waterOk = d => (byDate[d]?.water || 0) >= waterTarget(d);
    const logged = d => (byDate[d]?.meals.length || 0) >= 2;
    const weekCount = {};
    for (const w of finished) { const m = mondayOf(local(w.finished_at).date); weekCount[m] = (weekCount[m] || 0) + 1; }
    let wk = mondayOf(todayDate), trainingWeeks = 0;
    if ((weekCount[wk] || 0) < 3) wk = addDays(wk, -7);
    while ((weekCount[wk] || 0) >= 3) { trainingWeeks++; wk = addDays(wk, -7); }
    const streaks = { supp: dayStreak(tookKey), water: dayStreak(waterOk), logging: dayStreak(logged), training: trainingWeeks };

    // At-risk warnings (a streak exists and today isn't done yet).
    const t = byDate[todayDate] || day(todayDate);
    const atRisk = [];
    if (streaks.water > 0 && !waterOk(todayDate)) atRisk.push({ kind: 'water', text: `Su seriyası bu gecə qırılajax — hələ ${fmtL(waterTarget(todayDate) - t.water)} L iç, qağa.` });
    if (streaks.supp > 0 && !tookKey(todayDate)) atRisk.push({ kind: 'supp', text: 'Kreatini içməsən seriya sönəjəx, qağa.' });
    if (streaks.logging > 0 && !logged(todayDate)) atRisk.push({ kind: 'logging', text: `Yazı seriyası üçün hələ ${2 - t.meals.length} yemək yaz.` });

    // 12-week tracker: 12 rows × 4 cells; a cell fills per finished workout.
    const tracker = [];
    let filled = 0;
    for (let w = 0; w < 12; w++) {
      const start = addDays(s.cycleStart, w * 7), end = addDays(start, 7);
      const ws = finished.map(x => local(x.finished_at).date).filter(d => d >= start && d < end).sort().slice(0, 4);
      const cells = [0, 1, 2, 3].map(i => ws[i] ? { date: ws[i], gold: (scores[ws[i]]?.total || 0) >= 80 } : null);
      filled += ws.length;
      tracker.push({ week: w + 1, start, cells, current: todayDate >= start && todayDate < end });
    }

    // Badges.
    const maxWeek = Math.max(0, ...Object.values(weekCount));
    const earlyBirds = all.workouts.filter(w => w.finished_at && local(w.started_at).hour < 8).length;
    const cleanRun = maxRun(d => (byDate[d]?.meals.length || 0) >= 1 && !byDate[d].fastfood);
    const benchMax = best.bench || 0, squatMax = best.squat || 0;
    const prog = {
      first_rep: [finished.length, 1], week_one: [maxWeek, 3], new_best: [newBests, 1], on_scale: [all.weights.length, 1],
      hydrated: [maxRun(waterOk), 7], creatine30: [maxRun(tookKey), 30], clean_week: [cleanRun, 7], full_row: [maxWeek, 4],
      early_bird: [earlyBirds, 5], bench_goal: [round1(benchMax), s.benchGoal], squat_goal: [round1(squatMax), s.squatGoal], finisher: [filled, 48],
    };
    const unlockedAt = Object.fromEntries(all.badges.map(b => [b.id, b.unlocked_at]));
    const badges = BADGES.map(b => {
      const [v, target] = prog[b.id];
      return { ...b, value: v, target, progress: Math.min(1, v / target), earned: v >= target, unlockedAt: unlockedAt[b.id] || null };
    });

    // XP and level.
    const scoreXP = Object.values(scores).reduce((a, x) => a + x.total, 0);
    const xpParts = {
      score: scoreXP, workouts: finished.length * 50, bests: newBests * 25, weighins: all.weights.length * 20,
      checkins: all.checkins.length * 10, badges: badges.filter(b => b.earned).length * 100,
    };
    const xp = Object.values(xpParts).reduce((a, b) => a + b, 0);
    let level = 1, rem = xp;
    while (rem >= 200 + 100 * level) { rem -= 200 + 100 * level; level++; }
    const rank = [...RANKS].reverse().find(r => level >= r.from);

    return {
      scores, today: { ...scores[todayDate] || score(todayDate), kcal: t.kcal, protein: t.protein, water: t.water, waterTarget: waterTarget(todayDate), meals: t.meals.length, supps: [...t.supps] },
      streaks, atRisk, tracker, badges, best: bestSet, bestE1rm: best, newBests,
      xp, xpParts, level, levelXp: rem, levelNeed: 200 + 100 * level, rank, weekCount, trainedOn,
    };
  }

  // Compute + store first unlock dates + announce level-ups and badges once (bot + in-app pop-up).
  async function refresh() {
    const s = await settings();
    const nowMs = now();
    const todayDate = local(nowMs).date;
    const all = await loadAll();
    const g = compute(all, s, todayDate, nowMs);
    const popups = [];
    for (const b of g.badges) {
      if (b.earned && !b.unlockedAt) {
        await db.q('insert into app.badges (id, unlocked_at) values ($1, $2) on conflict do nothing', [b.id, nowMs]);
        b.unlockedAt = nowMs;
        popups.push({ type: 'badge', id: b.id, name: b.name, desc: b.desc });
      }
    }
    // A newly unlocked badge adds XP; recompute once so the level is right.
    const g2 = popups.length ? compute({ ...all, badges: await db.q('select * from app.badges') }, s, todayDate, nowMs) : g;
    const lastLevel = await getKV('last_level', null);
    if (lastLevel == null) await setKV('last_level', g2.level);
    else if (g2.level > lastLevel) {
      popups.push({ type: 'level', level: g2.level, rank: g2.rank.name, you: g2.rank.you });
      await setKV('last_level', g2.level);
    }
    if (popups.length) {
      const pending = await getKV('popups', []);
      await setKV('popups', [...pending, ...popups]);
      for (const p of popups) {
        if (p.type === 'badge') await sendOwner(`🏅 <b>Yeni nişan: ${p.name}</b>\n${p.desc}. Halaldı, qağa! +100 XP`);
        else await sendOwner(`🔥 <b>Səviyyə ${p.level}!</b> İndi sən <b>${p.you}</b>, qağa. Belə get!`);
      }
    }
    return { g: g2, s, all, todayDate, nowMs };
  }

  /* ---------- queue: which session is next ---------- */
  async function nextSession(all, nowMs) {
    const meta = await programMeta();
    const sessions = meta.sessions?.length ? meta.sessions : DEFAULT_SESSIONS;
    const q = await getKV('queue', { pos: 0 });
    const next = sessions[((q.pos % sessions.length) + sessions.length) % sessions.length];
    const last = [...all.workouts].filter(w => w.finished_at).sort((a, b) => b.finished_at - a.finished_at)[0];
    const readyAt = last ? last.finished_at + 20 * 3600000 : null;
    return { ...next, index: sessions.indexOf(next), readyAt, ready: !readyAt || readyAt <= nowMs, sessions };
  }
  async function advanceQueue(sessionId, skip = false) {
    const meta = await programMeta();
    const sessions = meta.sessions?.length ? meta.sessions : DEFAULT_SESSIONS;
    const q = await getKV('queue', { pos: 0 });
    const idx = skip ? q.pos : Math.max(0, sessions.findIndex(x => x.id === sessionId));
    await setKV('queue', { pos: (idx + 1) % sessions.length });
  }

  function cycleWeek(s, todayDate) {
    const d = daysBetween(s.cycleStart, todayDate);
    const week = d < 0 ? 0 : Math.min(12, Math.floor(d / 7) + 1);
    const phase = PHASES.find(p => p.weeks.includes(Math.max(1, week))) || PHASES[0];
    return { week, phase, startsIn: d < 0 ? -d : 0 };
  }

  const motivationOfDay = async date => {
    const list = await db.q('select id, text from app.motivations order by id');
    if (!list.length) return '';
    return list[Math.abs(daysBetween('2026-01-01', date)) % list.length].text;
  };

  /* ---------- day summary text (bot) ---------- */
  async function todayText(ctx) {
    const { g, s, all, nowMs } = ctx;
    const t = g.today;
    const ns = await nextSession(all, nowMs);
    const ready = ns.ready ? 'hazırdı' : `${local(ns.readyAt).hm}-dan hazır olajax`;
    return [
      `<b>Bu gün, ${s.name} qağa</b>`,
      `Kalori: ${t.kcal} / ${s.kcal} kkal`,
      `Zülal: ${t.protein} / ${s.protein} q`,
      `Su: ${fmtL(t.water)} / ${fmtL(t.waterTarget)} L`,
      `Xal: ${t.total}/100`,
      `Növbəti məşq: <b>${ns.name}</b> — ${ready}`,
    ].join('\n');
  }

  /* ---------- logging helpers shared by the API and the bot ---------- */
  async function addMeal(m) {
    const r = await db.q('insert into app.meals (date, time, preset, name, kcal, protein, comment, photo_id) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id',
      [m.date, m.time || local(now()).hm, m.preset || null, String(m.name || 'Yemək').slice(0, 120), Math.max(0, Math.round(+m.kcal || 0)), Math.max(0, Math.round(+m.protein || 0)), String(m.comment || '').slice(0, 500), m.photo_id || null]);
    return r[0].id;
  }
  async function addPresetMeal(id, date) {
    const p = (await presets()).find(x => x.id === id);
    if (!p) return null;
    return addMeal({ date, preset: p.id, name: p.name, kcal: p.kcal, protein: p.protein });
  }
  const addWater = (date, delta) => db.q('insert into app.water (date, ml) values ($1, greatest(0, $2::int)) on conflict (date) do update set ml = greatest(0, app.water.ml + $2::int)', [date, Math.round(delta)]);
  const setSupp = (date, id, on = true) => on
    ? db.q('insert into app.supps (date, supplement, time) values ($1, $2, $3) on conflict do nothing', [date, id, local(now()).hm])
    : db.q('delete from app.supps where date = $1 and supplement = $2', [date, id]);
  async function logWeight(date, kg) {
    await db.q('insert into app.weights (date, kg) values ($1, $2) on conflict (date) do update set kg = excluded.kg', [date, round1(kg)]);
  }

  /* ---------- weight reply (bot) ---------- */
  async function weightReply(date, kg, s) {
    const prev = (await db.q('select date, kg from app.weights where date < $1 order by date desc limit 1', [date]))[0];
    if (!prev) return `Yazdım: <b>${round1(kg)} kq</b>. Bu ilk çəkidi — buradan başdıyırıx, qağa!`;
    const diff = round1(kg - prev.kg);
    const weeks = Math.max(1, daysBetween(prev.date, date)) / 7;
    const rate = round1(-diff / weeks);
    const verdict = rate >= s.goalRate * 0.8 ? (rate > s.goalRate * 1.3 ? 'çox sürətlidi — azca artıx ye.' : 'düz hədəfdəsən, halaldı!') : rate > 0 ? 'yavaşdı, amma düz yoldasan.' : 'bu həftə düşmüyüf — yeməyə bir də bax.';
    return `Yazdım: <b>${round1(kg)} kq</b>\n${diff <= 0 ? '' : '+'}${diff} kq (${prev.date}-dən bəri) · həftədə ${rate} kq, hədəf ${s.goalRate} kq\nTempin ${verdict}`;
  }

  /* ---------- evening check-in ---------- */
  function checkinKeyboard() {
    const rows = [];
    for (let i = 0; i < CHECKIN_BUTTONS.length; i += 2) rows.push(CHECKIN_BUTTONS.slice(i, i + 2).map(([data, text]) => ({ text, callback_data: data })));
    rows.push([{ text: 'Hamısı yazılıf — günü bağla', callback_data: 'close' }]);
    return { inline_keyboard: rows };
  }
  async function checkinText(ctx) {
    const t = ctx.g.today, s = ctx.s;
    return `<b>Axşamın xeyir, ${s.name} qağa!</b>\nBu gün: ${t.kcal} kkal · ${t.protein} q zülal · ${fmtL(t.water)} L su · xal ${t.total}\n\nYazmadığın nəsə qalıf? Düymələri bas — bir neçəsini dalbadal basa bilərsən.`;
  }
  async function closeDay() {
    const before = await refresh();
    const date = before.todayDate;
    await db.q('insert into app.checkins (date, at) values ($1, $2) on conflict do nothing', [date, now()]);
    const ctx = await refresh();
    const { g, s } = ctx, t = g.today;
    const special = t.total >= 80;
    const lines = [
      `<b>Gün bağlandı.</b> Xal: <b>${t.total}/100</b>${special ? ' — ⭐ xüsusi gün!' : ` — xüsusi günə ${80 - t.total} xal çatmadı`}`,
      `Seriyalar: kreatin ${g.streaks.supp} gün · su ${g.streaks.water} gün · yazı ${g.streaks.logging} gün · məşq ${g.streaks.training} həftə`,
    ];
    if (t.water < t.waterTarget) lines.push(`Su: hələ ${fmtL(t.waterTarget - t.water)} L çatmır.`);
    lines.push(`Bu gün +${t.total + 10} XP · Səviyyə ${g.level} (${g.rank.name}) · ${g.levelXp}/${g.levelNeed} XP`);
    return lines.join('\n');
  }

  /* ---------- reminders (cron every 5 minutes) ---------- */
  async function reminderMessage(r, ctx, force = false) {
    const { g, s, all, todayDate, nowMs } = ctx;
    const t = g.today;
    const suppButtons = ids => ({ inline_keyboard: [ids.map(id => ({ text: '✅ ' + ((s.supps.find(x => x.id === id) || {}).name || id), callback_data: 'supp:' + id }))] });
    const ns = await nextSession(all, nowMs);
    switch (r.kind) {
      case 'morning': {
        const left = (r.supplements || []).filter(id => !t.supps.includes(id));
        return { text: `<b>Sabahın xeyir, ${s.name} qağa!</b>\n\n${await motivationOfDay(todayDate)}\n\nNövbəti məşq: <b>${ns.name}</b>${ns.ready ? ' — bu axşam hazırdı' : ''}\nKreatini unutma.`, markup: left.length ? suppButtons(left) : openAppButton() };
      }
      case 'supp': {
        const left = (r.supplements || []).filter(id => !t.supps.includes(id));
        if (!left.length && !force) return null;
        const names = (left.length ? left : r.supplements).map(id => (s.supps.find(x => x.id === id) || {}).name || id).join(', ');
        return { text: `Vaxtıdı, qağa: <b>${names}</b>`, markup: suppButtons(left.length ? left : r.supplements) };
      }
      case 'water': {
        if (t.water >= t.waterTarget / 2 && !force) return null;
        return { text: `Su azdı, qağa: <b>${fmtL(t.water)} / ${fmtL(t.waterTarget)} L</b>. Bir stəkan iç, gəl.`, markup: { inline_keyboard: [[{ text: '+250 ml', callback_data: 'water:250' }, { text: '+500 ml', callback_data: 'water:500' }]] } };
      }
      case 'workout': {
        // Only if the next session is ready by tonight (21:00) — and not on a day already trained.
        const readyTonight = ns.ready || (ns.readyAt && local(ns.readyAt).date === todayDate && local(ns.readyAt).hour < 21);
        if ((!readyTonight || g.trainedOn.has(todayDate)) && !force) return null;
        return { text: `Bu axşam məşq var: <b>${ns.name}</b>. Çantanı götür, qağa — 18:00-da GYM LATVIA!`, markup: openAppButton() };
      }
      case 'protein': {
        const left = s.protein - t.protein;
        if (left <= 0 && !force) return null;
        return { text: `Yatmazdan qabax zülal: hələ <b>${Math.max(0, left)} q</b> qalıf. Kəsmik ye, qağa.`, markup: { inline_keyboard: [[{ text: 'Kəsmik yedim', callback_data: 'meal:cottage' }, { text: 'Kokteyl içdim', callback_data: 'meal:shake' }]] } };
      }
      case 'weighin': {
        if (all.weights.some(w => w.date === todayDate) && !force) return null;
        return { text: 'Həftəlik çəki vaxtıdı, qağa. Tualetdən sonra, yeməkdən qabax tərəziyə çıx və rəqəmi bura yaz (məs. <b>104.6</b>).' };
      }
      case 'photos': {
        const lastP = all.photos.filter(p => p.kind === 'progress').map(p => p.date).sort().pop();
        if (lastP && daysBetween(lastP, todayDate) < 13 && !force) return null;
        return { text: 'Proqres şəkli vaxtıdı: öndən, yannan, arxadan. Eyni yer, eyni işıx, qağa.', markup: openAppButton() };
      }
      case 'checkin': {
        if (all.checkins.some(c => c.date === todayDate) && !force) return null;
        return { text: await checkinText(ctx), markup: checkinKeyboard() };
      }
      default: return null;
    }
  }

  async function runCron() {
    const nowMs = now(), L = local(nowMs);
    const reminders = await db.q('select * from app.reminders where enabled order by time');
    let ctx = null; const sent = [];
    for (const r of reminders) {
      const due = hmToMin(r.time);
      if (r.last_sent === L.date) continue;
      if (!(r.weekdays || []).includes(L.weekday)) continue;
      if (L.minutes < due || L.minutes >= due + 60) continue;      // a one-hour window survives missed ticks
      ctx ||= await refresh();
      const msg = await reminderMessage(r, ctx);
      await db.q('update app.reminders set last_sent = $1 where id = $2', [L.date, r.id]);
      if (msg) { await sendOwner(msg.text, msg.markup ? { reply_markup: msg.markup } : {}); sent.push(r.kind); }
    }
    return sent;
  }

  /* ---------- review text for Claude ---------- */
  async function reviewText(days) {
    const ctx = await refresh();
    const { g, s, all, todayDate } = ctx;
    const from = addDays(todayDate, -(days - 1));
    const setsBy = {};
    for (const st of all.sets) (setsBy[st.workout_id] ||= []).push(st);
    const L = [];
    const cw = cycleWeek(s, todayDate);
    L.push(`PƏHLƏVAN REVIEW — last ${days} days (${from} → ${todayDate})`);
    L.push(`Athlete: ${s.name}, cycle week ${cw.week}/12 (${cw.phase.name}). Targets: ${s.kcal} kcal, ${s.protein} g protein, ${fmtL(s.water)} L water, goal rate −${s.goalRate} kg/week.`);
    L.push('');
    L.push('WORKOUTS');
    const ws = all.workouts.filter(w => w.finished_at && local(w.finished_at).date >= from);
    if (!ws.length) L.push('- none');
    for (const w of ws) {
      const mins = Math.round((w.finished_at - w.started_at) / 60000);
      L.push(`- ${local(w.started_at).date} ${local(w.started_at).hm} · ${w.session} · ${mins} min${w.notes ? ` · notes: ${w.notes}` : ''}`);
      const byEx = {};
      for (const st of setsBy[w.id] || []) (byEx[st.exercise] ||= []).push(`${st.weight}×${st.reps}`);
      for (const [ex, list] of Object.entries(byEx)) L.push(`    ${ex}: ${list.join(', ')}`);
    }
    L.push('');
    L.push('NUTRITION (kcal / protein g / water L / supplements / notes)');
    let waterSum = 0, waterDays = 0;
    for (let d = from; d <= todayDate; d = addDays(d, 1)) {
      const ms = all.meals.filter(m => m.date === d);
      const kcal = ms.reduce((a, m) => a + m.kcal, 0), prot = ms.reduce((a, m) => a + m.protein, 0);
      const wml = (all.water.find(x => x.date === d) || {}).ml || 0;
      if (wml) { waterSum += wml; waterDays++; }
      const sp = all.supps.filter(x => x.date === d).map(x => x.supplement);
      const off = all.dayoff.some(x => x.date === d) ? ' [day off work]' : '';
      const comments = ms.filter(m => m.comment).map(m => `${m.name}: "${m.comment}"`);
      if (!ms.length && !wml && !sp.length) { L.push(`- ${d}${off}: nothing logged`); continue; }
      L.push(`- ${d}${off}: ${kcal} kcal / ${prot} g / ${fmtL(wml)} L / ${sp.join(', ') || '—'} · score ${g.scores[d]?.total ?? 0}${comments.length ? ` · ${comments.join('; ')}` : ''}`);
      for (const m of ms) L.push(`    ${m.time || ''} ${m.name} — ${m.kcal} kcal, ${m.protein} g`);
    }
    L.push(`Water average: ${waterDays ? fmtL(Math.round(waterSum / waterDays)) : 0} L on ${waterDays} logged days.`);
    L.push('');
    const cardio = all.cardio.filter(c => c.date >= from);
    L.push(`CARDIO: ${cardio.length ? cardio.map(c => `${c.date} ${c.minutes} min ${c.kind || ''}`.trim()).join('; ') : 'none'}`);
    const wts = all.weights.filter(w => w.date >= addDays(from, -7));
    L.push(`WEIGH-INS: ${wts.length ? wts.map(w => `${w.date} ${w.kg} kg`).join('; ') : 'none'}`);
    L.push(`DAYS OFF WORK: ${all.dayoff.filter(x => x.date >= from).map(x => x.date).join(', ') || 'none'}`);
    L.push(`PHOTOS: ${all.photos.filter(p => p.date >= from).map(p => `${p.date} ${p.kind}${p.caption ? ` (${p.caption})` : ''}`).join('; ') || 'none'}`);
    const scored = Object.entries(g.scores).filter(([d]) => d >= from).map(([, x]) => x.total);
    const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;
    L.push('');
    L.push(`GAMIFICATION: level ${g.level} (${g.rank.name}), ${g.xp} XP · average daily score ${avg} · streaks: creatine ${g.streaks.supp} d, water ${g.streaks.water} d, logging ${g.streaks.logging} d, training ${g.streaks.training} wk · badges: ${g.badges.filter(b => b.earned).map(b => b.name).join(', ') || 'none'}`);
    const bests = Object.entries(g.best).map(([ex, b]) => `${ex} ${b.weight}×${b.reps} (e1RM ${b.e1rm})`).join('; ');
    L.push(`BEST SETS: ${bests || 'none'}`);
    return L.join('\n');
  }

  /* ---------- API actions (POST /a/<action>) ---------- */
  const A = {
    async state(b) {
      const ctx = await refresh();
      const { g, s, all, todayDate, nowMs } = ctx;
      const ns = await nextSession(all, nowMs);
      const draft = all.workouts.find(w => !w.finished_at) || null;
      const wkStart = mondayOf(todayDate);
      const weekSessions = all.workouts.filter(w => w.finished_at && local(w.finished_at).date >= wkStart).length;
      const weekCardio = all.cardio.filter(c => c.date >= wkStart);
      const popups = await getKV('popups', []);
      if (popups.length && b.consumePopups !== false) await setKV('popups', []);
      return {
        today: todayDate, nowHm: local(nowMs).hm, settings: s, presets: await presets(),
        cycle: cycleWeek(s, todayDate), motivation: await motivationOfDay(todayDate),
        next: { id: ns.id, name: ns.name, ready: ns.ready, readyAt: ns.readyAt, readyHm: ns.readyAt ? local(ns.readyAt).hm : null, readyDate: ns.readyAt ? local(ns.readyAt).date : null },
        draft: draft ? { id: draft.id, session: draft.session, started_at: draft.started_at, draft: draft.draft } : null,
        dayoff: all.dayoff.some(x => x.date === todayDate),
        score: g.today, streaks: g.streaks, atRisk: g.atRisk,
        level: { level: g.level, xp: g.xp, levelXp: g.levelXp, levelNeed: g.levelNeed, rank: g.rank.name },
        week: { sessions: weekSessions, cardioMin: weekCardio.reduce((a, c) => a + c.minutes, 0), cardioCount: weekCardio.length, cardio: weekCardio, lastWeight: all.weights[all.weights.length - 1] || null },
        closed: all.checkins.some(c => c.date === todayDate),
        popups,
      };
    },
    async sync(b) {   // the app sends its program's session list so the bot knows names/order
      if (Array.isArray(b.sessions) && b.sessions.length) await setKV('program', { sessions: b.sessions.map(x => ({ id: String(x.id), name: String(x.name) })) });
      return {};
    },
    async day(b) {     // food screen for one date
      const date = b.date;
      const meals = await db.q('select * from app.meals where date = $1 order by time, id', [date]);
      const water = (await db.q('select ml from app.water where date = $1', [date]))[0]?.ml || 0;
      const supps = (await db.q('select supplement from app.supps where date = $1', [date])).map(r => r.supplement);
      return { date, meals, water, supps };
    },
    async meal_add(b) { const id = await addMeal(b); await refresh(); return { id }; },
    async meal_preset(b) { const id = await addPresetMeal(b.preset, b.date); await refresh(); return { id }; },
    async meal_update(b) {
      await db.q('update app.meals set name=$2, kcal=$3, protein=$4, comment=$5 where id=$1', [b.id, String(b.name).slice(0, 120), Math.round(+b.kcal || 0), Math.round(+b.protein || 0), String(b.comment || '').slice(0, 500)]);
      await refresh(); return {};
    },
    async meal_delete(b) { await db.q('delete from app.meals where id = $1', [b.id]); await refresh(); return {}; },
    async presets_save(b) { if (Array.isArray(b.presets)) await setKV('presets', b.presets.map(p => ({ id: String(p.id), name: String(p.name), kcal: Math.round(+p.kcal || 0), protein: Math.round(+p.protein || 0) }))); return {}; },
    async water(b) { await addWater(b.date, +b.delta || 0); await refresh(); return {}; },
    async supp(b) { await setSupp(b.date, b.id, !!b.on); await refresh(); return {}; },
    async dayoff(b) {
      if (b.on) await db.q('insert into app.dayoff (date) values ($1) on conflict do nothing', [b.date]);
      else await db.q('delete from app.dayoff where date = $1', [b.date]);
      return {};
    },
    async weight(b) { await logWeight(b.date, +b.kg); await refresh(); return {}; },
    async weight_delete(b) { await db.q('delete from app.weights where date = $1', [b.date]); await refresh(); return {}; },
    async cardio_add(b) { await db.q('insert into app.cardio (date, minutes, kind) values ($1,$2,$3)', [b.date, Math.round(+b.minutes || 0), String(b.kind || '').slice(0, 40)]); return {}; },
    async cardio_delete(b) { await db.q('delete from app.cardio where id = $1', [b.id]); return {}; },

    async history() {   // per-exercise last session + best, for the workout screen
      const rows = await db.q(`select s.exercise, s.idx, s.weight, s.reps, w.id as wid, w.finished_at from app.sets s join app.workouts w on w.id = s.workout_id where w.finished_at is not null order by w.finished_at, s.idx`);
      const out = {};
      for (const r of rows) {
        const x = out[r.exercise] ||= { last: [], lastWid: null, lastDate: null, best: 0 };
        if (x.lastWid !== r.wid) { x.last = []; x.lastWid = r.wid; x.lastDate = local(r.finished_at).date; }
        x.last.push({ weight: r.weight, reps: r.reps });
        x.best = Math.max(x.best, e1rm(r.weight, r.reps));
      }
      return { history: out };
    },
    async workout_start(b) {
      const open = (await db.q('select id from app.workouts where finished_at is null'))[0];
      if (open) return { id: open.id, resumed: true };
      const s = await settings();
      const cw = cycleWeek(s, local(now()).date);
      const r = await db.q('insert into app.workouts (session, week, started_at, notes, draft) values ($1,$2,$3,$4,$5::jsonb) returning id', [b.session, cw.week, now(), '', JSON.stringify(b.draft || {})]);
      return { id: r[0].id };
    },
    async workout_draft(b) { await db.q('update app.workouts set draft = $2::jsonb where id = $1 and finished_at is null', [b.id, JSON.stringify(b.draft || {})]); return {}; },
    async workout_finish(b) {
      const w = (await db.q('select * from app.workouts where id = $1', [b.id]))[0];
      if (!w) throw new Error('workout not found');
      const before = await refresh();
      await db.q('delete from app.sets where workout_id = $1', [b.id]);
      let n = 0;
      for (const st of b.sets || []) {
        if (!(+st.reps > 0)) continue;
        await db.q('insert into app.sets (workout_id, exercise, idx, weight, reps) values ($1,$2,$3,$4,$5)', [b.id, String(st.exercise), +st.idx || 0, +st.weight || 0, Math.round(+st.reps)]);
        n++;
      }
      await db.q('update app.workouts set finished_at = $2, notes = $3, draft = null where id = $1', [b.id, now(), String(b.notes || '').slice(0, 1000)]);
      await advanceQueue(w.session);
      const after = await refresh();
      const minutes = Math.round((now() - w.started_at) / 60000);
      const volume = (b.sets || []).reduce((a, st) => a + (+st.weight || 0) * (+st.reps || 0), 0);
      return { sets: n, minutes, volume: Math.round(volume), newBests: after.g.newBests - before.g.newBests, xp: after.g.xp - before.g.xp };
    },
    async workout_discard(b) { await db.q('delete from app.workouts where id = $1 and finished_at is null', [b.id]); return {}; },
    async workout_skip() { await advanceQueue(null, true); return {}; },
    async workout_delete(b) { await db.q('delete from app.workouts where id = $1', [b.id]); await refresh(); return {}; },

    async progress() {
      const ctx = await refresh();
      const { g, s, all } = ctx;
      const setsBy = {};
      for (const st of all.sets) (setsBy[st.workout_id] ||= []).push(st);
      // e1RM trend: best estimated max per finished workout for each main lift.
      const trend = { bench: [], squat: [] };
      for (const w of all.workouts.filter(x => x.finished_at)) {
        for (const ex of Object.keys(trend)) {
          const v = Math.max(0, ...(setsBy[w.id] || []).filter(x => x.exercise === ex).map(x => e1rm(x.weight, x.reps)));
          if (v) trend[ex].push({ date: local(w.finished_at).date, e1rm: round1(v) });
        }
      }
      // One weigh-in per week (the last of each week).
      const weekly = {};
      for (const w of all.weights) weekly[mondayOf(w.date)] = w;
      const recent = all.workouts.filter(w => w.finished_at).slice(-10).reverse().map(w => ({
        id: w.id, session: w.session, date: local(w.finished_at).date, minutes: Math.round((w.finished_at - w.started_at) / 60000),
        sets: (setsBy[w.id] || []).length, notes: w.notes,
      }));
      return {
        level: { level: g.level, xp: g.xp, levelXp: g.levelXp, levelNeed: g.levelNeed, rank: g.rank.name, parts: g.xpParts },
        ranks: RANKS, tracker: g.tracker, badges: g.badges, best: g.best, trend, oldBest: s.oldBest,
        weights: Object.values(weekly), allWeights: all.weights, goalRate: s.goalRate, goalWeight: s.goalWeight,
        recent, photos: all.photos.filter(p => p.kind === 'progress').reverse(), streaks: g.streaks,
      };
    },

    async photo_upload(b) {   // body: { kind, date, caption, data: base64 jpeg }
      const owner = await ownerInfo();
      const bin = Uint8Array.from(atob(String(b.data || '')), c => c.charCodeAt(0));
      if (!bin.length || bin.length > 8e6) throw new Error('bad photo');
      const form = new FormData();
      form.append('chat_id', String(owner.chat_id));
      form.append('caption', `${b.kind === 'meal' ? 'Yemək' : 'Proqres'} · ${b.date}${b.caption ? ' · ' + b.caption : ''}`);
      form.append('disable_notification', 'true');
      form.append('photo', new Blob([bin], { type: 'image/jpeg' }), 'photo.jpg');
      const res = await fetchImpl(`${TG}/bot${token}/sendPhoto`, { method: 'POST', body: form });
      const j = await res.json();
      if (!j.ok) throw new Error('telegram: ' + (j.description || 'sendPhoto failed'));
      const fileId = j.result.photo[j.result.photo.length - 1].file_id;
      const r = await db.q('insert into app.photos (file_id, kind, date, caption) values ($1,$2,$3,$4) returning id', [fileId, b.kind === 'meal' ? 'meal' : 'progress', b.date, String(b.caption || '').slice(0, 60)]);
      return { id: r[0].id, file_id: fileId };
    },
    async photo_delete(b) { await db.q('delete from app.photos where id = $1', [b.id]); return {}; },

    async motivations() { return { list: await db.q('select * from app.motivations order by mine, id') }; },
    async motivation_save(b) {
      const text = String(b.text || '').trim().slice(0, 300);
      if (!text) throw new Error('empty');
      if (b.id) await db.q('update app.motivations set text = $2 where id = $1 and mine', [b.id, text]);
      else await db.q('insert into app.motivations (text, mine) values ($1, true)', [text]);
      return {};
    },
    async motivation_delete(b) { await db.q('delete from app.motivations where id = $1 and mine', [b.id]); return {}; },

    async reminders() { return { list: await db.q('select * from app.reminders order by time') }; },
    async reminder_update(b) {
      if (b.time != null && !/^\d{2}:\d{2}$/.test(b.time)) throw new Error('bad time');
      await db.q('update app.reminders set time = coalesce($2, time), enabled = coalesce($3, enabled), last_sent = null where id = $1', [b.id, b.time ?? null, b.enabled ?? null]);
      return {};
    },
    async reminder_test(b) {
      const r = (await db.q('select * from app.reminders where id = $1', [b.id]))[0];
      if (!r) throw new Error('not found');
      const msg = await reminderMessage(r, await refresh(), true);
      if (msg) await sendOwner('<i>Sınax:</i>\n' + msg.text, msg.markup ? { reply_markup: msg.markup } : {});
      return { sent: !!msg };
    },
    async settings_save(b) {
      const cur = await getKV('settings', {});
      const allowed = ['name', 'cycleStart', 'playlist', 'kcal', 'protein', 'water', 'goalWeight', 'goalRate', 'benchGoal', 'squatGoal', 'studyPlan', 'studyGoal'];
      for (const k of allowed) if (b[k] !== undefined) cur[k] = b[k];
      await setKV('settings', cur);
      return { settings: await settings() };
    },
    async review(b) { return { text: await reviewText(b.days === 14 ? 14 : 7) }; },

    // Kept from the earlier version: work days and study, now under "More".
    async work_month() { return { days: (await db.q('select date from app.workdays')).map(r => r.date) }; },
    async work_toggle(b) {
      if (b.on) await db.q('insert into app.workdays (date) values ($1) on conflict do nothing', [b.date]);
      else await db.q('delete from app.workdays where date = $1', [b.date]);
      return {};
    },
    async study_get(b) {
      const tasks = await db.q('select task, minutes from app.study where date = $1', [b.date]);
      const note = (await db.q('select extra, note from app.study_notes where date = $1', [b.date]))[0] || { extra: 0, note: '' };
      const all = await db.q('select date, sum(minutes)::int as m from app.study group by date');
      const extras = await db.q('select date, extra from app.study_notes');
      const totals = {};
      for (const r of all) totals[r.date] = r.m;
      for (const r of extras) totals[r.date] = (totals[r.date] || 0) + (r.extra || 0);
      const db_days = (await db.q(`select date from app.study where task = 'db'`)).map(r => r.date);
      return { tasks, extra: note.extra || 0, note: note.note || '', totals, db_days };
    },
    async study_toggle(b) {
      if (b.on) await db.q('insert into app.study (date, task, minutes) values ($1,$2,$3) on conflict (date, task) do update set minutes = excluded.minutes', [b.date, b.task, Math.round(+b.minutes || 0)]);
      else await db.q('delete from app.study where date = $1 and task = $2', [b.date, b.task]);
      return {};
    },
    async study_note(b) {
      await db.q('insert into app.study_notes (date, extra, note) values ($1,$2,$3) on conflict (date) do update set extra = excluded.extra, note = excluded.note', [b.date, Math.max(0, Math.round(+b.extra || 0)), String(b.note || '').slice(0, 2000)]);
      return {};
    },
  };

  /* ---------- Telegram webhook ---------- */
  async function onUpdate(u) {
    const owner = await ownerInfo();
    if (u.message) {
      const m = u.message, from = m.from || {}, text = (m.text || '').trim();
      const isOwner = owner && owner.id === from.id;
      if (text.startsWith('/start')) {
        if (!owner) {
          await setKV('owner', { id: from.id, chat_id: m.chat.id, first_name: from.first_name || '' });
          await tg('sendMessage', { chat_id: m.chat.id, parse_mode: 'HTML', text: `<b>Xoş gəldin, ${from.first_name || 'qağa'}!</b>\nBu bot artıq sənindi — başqa heç kəs girə bilməz.\n\nAşağıdakı düyməni bas, Pəhləvanı aç. Çəkini yazmax üçün sadəcə rəqəm göndər (məs. 104.6).`, reply_markup: openAppButton() });
          return;
        }
        if (!isOwner) { await tg('sendMessage', { chat_id: m.chat.id, text: 'Bu bot şəxsidi, qağa. Bağışla.' }); return; }
        await tg('sendMessage', { chat_id: m.chat.id, text: 'Yenə xoş gəldin, qağa! Proqram aşağıdadı.', reply_markup: openAppButton() });
        return;
      }
      if (!isOwner) { await tg('sendMessage', { chat_id: m.chat.id, text: 'Bu bot şəxsidi, qağa. Bağışla.' }); return; }
      if (text.startsWith('/today')) { await tg('sendMessage', { chat_id: m.chat.id, parse_mode: 'HTML', text: await todayText(await refresh()), reply_markup: openAppButton() }); return; }
      const num = text.match(/^(\d{2,3}(?:[.,]\d{1,2})?)\s*(kq|kg)?$/i);
      if (num) {
        const kg = parseFloat(num[1].replace(',', '.'));
        if (kg > 30 && kg < 300) {
          const date = local(now()).date;
          const s = await settings();
          const reply = await weightReply(date, kg, s);
          await logWeight(date, kg);
          await refresh();
          await tg('sendMessage', { chat_id: m.chat.id, parse_mode: 'HTML', text: reply });
          return;
        }
      }
      await tg('sendMessage', { chat_id: m.chat.id, text: 'Çəkini yazmax üçün rəqəm göndər (məs. 104.6). Bu günün hesabı: /today', reply_markup: openAppButton() });
      return;
    }
    if (u.callback_query) {
      const c = u.callback_query;
      if (!owner || owner.id !== c.from.id) { await tg('answerCallbackQuery', { callback_query_id: c.id, text: 'Bu bot şəxsidi.' }); return; }
      const date = local(now()).date;
      const [kind, arg] = String(c.data || '').split(':');
      let answer = 'Yazdım ✅';
      if (kind === 'supp') { await setSupp(date, arg, true); answer = 'İçdin — yazdım ✅'; }
      else if (kind === 'water') { await addWater(date, +arg); answer = `+${arg} ml su ✅`; }
      else if (kind === 'meal') { const id = await addPresetMeal(arg, date); const p = (await presets()).find(x => x.id === arg); answer = id ? `${p.name} yazıldı ✅` : 'Tapılmadı'; }
      else if (kind === 'close') {
        const text = await closeDay();
        await tg('answerCallbackQuery', { callback_query_id: c.id, text: 'Gün bağlandı' });
        await tg('sendMessage', { chat_id: c.message.chat.id, parse_mode: 'HTML', text });
        return;
      }
      await refresh();
      await tg('answerCallbackQuery', { callback_query_id: c.id, text: answer });
    }
  }

  /* ---------- setup: webhook, menu button, commands, cron ---------- */
  async function setup() {
    const report = {};
    await ensureSchema(db);
    const whSecret = await derivedSecret(token, 'webhook');
    report.webhook = (await tg('setWebhook', { url: env.FUNC_URL + '/webhook', secret_token: whSecret, allowed_updates: ['message', 'callback_query'] })).ok;
    report.menu = (await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Aç', web_app: { url: env.APP_URL } } })).ok;
    report.commands = (await tg('setMyCommands', { commands: [{ command: 'start', description: 'Başdıyax' }, { command: 'today', description: 'Bu günün hesabı' }] })).ok;
    if (env.DEV) report.cron = 'skipped locally';
    else {
      try {
        const cronKey = await derivedSecret(token, 'cron');
        await db.exec('create extension if not exists pg_net with schema extensions; create extension if not exists pg_cron with schema pg_catalog;');
        try { await db.q(`select cron.unschedule('pehlevan-tick')`); } catch { /* not scheduled yet */ }
        const headers = JSON.stringify({ 'Content-Type': 'application/json', 'x-cron-key': cronKey });
        const cmd = `select net.http_post(url := '${env.FUNC_URL}/cron', headers := '${headers}'::jsonb, body := '{}'::jsonb)`;
        await db.q(`select cron.schedule('pehlevan-tick', '*/5 * * * *', $1)`, [cmd]);
        report.cron = true;
      } catch (e) { report.cron = 'error: ' + e.message; }
    }
    return report;
  }

  /* ---------- HTTP entry ---------- */
  const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-init-data, x-setup-token',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  };
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' } });

  async function authOwner(initData) {
    const user = await verifyInitData(initData, token, now());
    if (!user) return { error: json({ ok: false, error: 'bad initData' }, 401) };
    const owner = await ownerInfo();
    if (!owner) return { error: json({ ok: false, error: 'no owner yet — send /start to the bot' }, 403) };
    if (owner.id !== user.id) return { error: json({ ok: false, error: 'This is a private bot' }, 403) };
    return { user };
  }

  async function handle(req) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    // Path looks like /pehlevan/<route>... (Supabase keeps the function name in the path).
    const route = url.pathname.replace(/^\/(functions\/v1\/)?[^/]+/, '') || '/';
    try {
      await ensureSchema(db);

      if (route === '/webhook' && req.method === 'POST') {
        if (req.headers.get('x-telegram-bot-api-secret-token') !== await derivedSecret(token, 'webhook')) return json({ ok: false }, 401);
        await onUpdate(await req.json());
        return json({ ok: true });
      }
      if (route === '/cron' && req.method === 'POST') {
        if (req.headers.get('x-cron-key') !== await derivedSecret(token, 'cron')) return json({ ok: false }, 401);
        return json({ ok: true, sent: await runCron() });
      }
      if (route === '/setup' && req.method === 'POST') {
        if (req.headers.get('x-setup-token') !== token) return json({ ok: false }, 401);
        return json({ ok: true, report: await setup() });
      }
      if (route === '/photo' && req.method === 'GET') {
        const auth = await authOwner(url.searchParams.get('init') || '');
        if (auth.error) return auth.error;
        const fileId = url.searchParams.get('f');
        const known = await db.q('select 1 from app.photos where file_id = $1', [fileId]);
        if (!known.length) return json({ ok: false }, 404);
        const f = await tg('getFile', { file_id: fileId });
        if (!f.ok) return json({ ok: false }, 404);
        const img = await fetchImpl(`${TG}/file/bot${token}/${f.result.file_path}`);
        return new Response(img.body, { headers: { ...CORS, 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=86400' } });
      }
      const m = route.match(/^\/a\/([a-z_]+)$/);
      if (m && req.method === 'POST') {
        const auth = await authOwner(req.headers.get('x-init-data') || '');
        if (auth.error) return auth.error;
        const fn = A[m[1]];
        if (!fn) return json({ ok: false, error: 'unknown action' }, 404);
        const body = await req.json().catch(() => ({}));
        return json({ ok: true, ...(await fn(body)) });
      }
      if (route === '/' || route === '/health') return json({ ok: true, app: 'pehlevan' });
      return json({ ok: false, error: 'not found' }, 404);
    } catch (e) {
      console.error(e);
      return json({ ok: false, error: String(e.message || e) }, 500);
    }
  }

  return { handle, runCron, refresh, setup, compute };
}
