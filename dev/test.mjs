// End-to-end API test with a fake bot token, fake Telegram and in-memory Postgres.
// Run: cd dev && npm test
import assert from 'node:assert/strict';
import { makeHarness, FAKE_TOKEN, OWNER } from './lib.mjs';
import { derivedSecret, signInitData } from '../supabase/functions/_shared/core.js';

// Monday 26 Oct 2026, 07:00 in Riga (UTC+2 after the DST change on 25 Oct).
const T0 = Date.parse('2026-10-26T05:00:00Z');
const H = 3600000;
const h = await makeHarness({ startMs: T0 });
const { app, clock, calls } = h;
const BASE = 'http://localhost/functions/v1/pehlevan';
let passed = 0;
const ok = (name) => { passed++; console.log('  ✓', name); };

const webhookSecret = await derivedSecret(FAKE_TOKEN, 'webhook');
const cronKey = await derivedSecret(FAKE_TOKEN, 'cron');
const hook = (update, secret = webhookSecret) => app.handle(new Request(BASE + '/webhook', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret }, body: JSON.stringify(update),
}));
const api = async (action, body = {}, user = OWNER) => {
  const res = await app.handle(new Request(`${BASE}/a/${action}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-init-data': await h.initData(user) }, body: JSON.stringify(body),
  }));
  return { status: res.status, ...(await res.json()) };
};
const cron = () => app.handle(new Request(BASE + '/cron', { method: 'POST', headers: { 'x-cron-key': cronKey } })).then(r => r.json());
const lastMsg = () => [...calls].reverse().find(c => c.method === 'sendMessage');
const msg = (text, from = OWNER) => hook({ message: { message_id: 1, from, chat: { id: from.id, type: 'private' }, text } });
const cb = (data, from = OWNER) => hook({ callback_query: { id: 'cb' + Math.random(), from, data, message: { chat: { id: from.id } } } });
const today = '2026-10-26';

console.log('Security');
assert.equal((await app.handle(new Request(BASE + '/health'))).status, 200); ok('health');
assert.equal((await hook({ message: { text: '/start', from: OWNER, chat: { id: 1001, type: 'private' } } }, 'wrong')).status, 401); ok('webhook rejects a wrong secret header');
assert.equal((await api('state')).status, 403); ok('API is closed before /start');
await hook({ message: { text: '/start', chat: { id: -100123, type: 'supergroup' } } });
await hook({ message: { text: '/start', from: { id: 5 }, chat: { id: -5, type: 'group' } } });
assert.equal((await api('state')).status, 403); ok('id-less or group /start cannot claim the bot');
await msg('/start');
assert.match(lastMsg().payload.text, /Xoş gəldin/); assert.ok(lastMsg().payload.reply_markup.inline_keyboard[0][0].web_app); ok('/start claims the owner and sends the Open app button');
const stranger = { id: 2002, first_name: 'X' };
await msg('/start', stranger);
assert.match(lastMsg().payload.text, /şəxsidi/); ok('second /start gets "private bot"');
assert.equal((await api('state', {}, stranger)).status, 403); ok('stranger gets 403 from the API');
const bad = await app.handle(new Request(BASE + '/a/state', { method: 'POST', headers: { 'x-init-data': 'user=%7B%22id%22%3A1001%7D&auth_date=1&hash=abc' }, body: '{}' }));
assert.equal(bad.status, 401); ok('forged initData is rejected');
const old = await signInitData(OWNER, FAKE_TOKEN, Math.floor(T0 / 1000) - 3 * 86400);
assert.equal((await app.handle(new Request(BASE + '/a/state', { method: 'POST', headers: { 'x-init-data': old }, body: '{}' }))).status, 401); ok('old auth_date is rejected');

console.log('Today + food');
let st = await api('state');
assert.equal(st.ok, true); assert.equal(st.today, today); assert.equal(st.cycle.week, 1); assert.equal(st.next.id, 'FB'); assert.ok(st.motivation.length > 5);
ok('state: week 1, default full-body session, motivation of the day');
await api('sync', { sessions: [{ id: 'A', name: 'Bütün bədən A' }, { id: 'B', name: 'Bütün bədən B' }, { id: 'C', name: 'Bütün bədən C' }] });
await api('meal_preset', { preset: 'lunch_train', date: today });
await api('meal_preset', { preset: 'snack_train', date: today });
const custom = await api('meal_add', { date: today, name: 'Balıx və kartof', kcal: 520, protein: 46, comment: 'toyuq yox idi, balıx yedim' });
await api('water', { date: today, delta: 2000 });
await api('supp', { date: today, id: 'creatine', on: true });
st = await api('state');
assert.equal(st.score.kcal, 1770); assert.equal(st.score.protein, 179);
assert.equal(st.score.kcalTarget, 1900); assert.equal(st.score.trainDay, true); ok('Monday is a gym day: 1,900 kcal target');
assert.equal((await api('day', { date: '2026-10-27' })).kcalTarget, 1800); ok('Tuesday is a rest day: 1,800 kcal target');
assert.equal(st.settings.goalWeight, 94); assert.equal(st.settings.blockGoal, 98); assert.equal(st.settings.goalRate, 1.4); assert.equal(st.settings.startWeight, 109); assert.equal(st.cycle.weeks, 8); ok('goals: 109 → 98 kg in 8 weeks (−1.4 kg/week), 94 kg long-term'); assert.equal(st.score.parts.supp, 10); assert.equal(st.score.parts.sweets, 10);
ok(`score computed on the server (${st.score.total}/100)`);
await api('meal_update', { id: custom.id, name: 'Balıx və kartof', kcal: 480, protein: 46, comment: 'yağsız' });
const day = await api('day', { date: today });
assert.equal(day.meals.length, 3); assert.equal(day.water, 2000); assert.equal(day.meals.find(m => m.id === custom.id).kcal, 480); ok('edit a meal + day view');

console.log('Workout');
const w1 = await api('workout_start', { session: 'A' });
await api('workout_draft', { id: w1.id, draft: { sets: [{ exercise: 'bench', weight: 72.5, reps: 7 }] } });
st = await api('state'); assert.equal(st.draft.id, w1.id); ok('draft saved on the server');
clock.ms += 1.1 * H;
const sets1 = [7, 7, 7].map((r, i) => ({ exercise: 'bench', idx: i, weight: 72.5, reps: r })).concat([8, 8, 8].map((r, i) => ({ exercise: 'squat', idx: i, weight: 40, reps: r })));
const f1 = await api('workout_finish', { id: w1.id, sets: sets1, notes: 'yaxşı keçdi' });
assert.equal(f1.sets, 6); assert.equal(f1.minutes, 66); ok('finish workout → summary');
st = await api('state');
assert.equal(st.next.id, 'B'); assert.equal(st.next.ready, false); ok('queue moved to B, not ready for 20 h');
assert.equal(Math.round((st.next.readyAt - (T0 + 1.1 * H)) / H), 40); ok('next workout ready 40 h after the last one (every second day)');
let hist = (await api('history')).history;
assert.equal(hist.bench.last.length, 3); assert.equal(hist.bench.last[0].weight, 72.5); ok('history for progression');
await api('workout_skip');
st = await api('state'); assert.equal(st.next.id, 'C'); ok('skip moves the queue forward');

clock.ms += 24 * H;  // Tuesday 08:06
const w2 = await api('workout_start', { session: 'A' });
clock.ms += H;
await api('workout_finish', { id: w2.id, sets: [{ exercise: 'bench', idx: 0, weight: 75, reps: 7 }] });
st = await api('state');
assert.ok(st.popups.some(p => p.type === 'badge' && p.id === 'new_best')); ok('new best → badge pop-up (announced once)');
assert.ok(calls.some(c => c.method === 'sendMessage' && /Yeni nişan/.test(c.payload.text))); ok('badge also announced by the bot');
st = await api('state'); assert.equal(st.popups.length, 0); ok('pop-ups are not repeated');

console.log('Bot');
await msg('104,6 kq');
assert.match(lastMsg().payload.text, /104.6 kq/); ok('reply with a number logs weight');
clock.ms += 7 * 24 * H;
await msg('103.2');
assert.match(lastMsg().payload.text, /həftədə 1.4 kq/); ok('weight reply shows the weekly rate vs goal');
await msg('/today');
assert.match(lastMsg().payload.text, /Növbəti məşq/); ok('/today summary');
const nCalls = calls.length;
await cb('water:500');
assert.equal(calls[calls.length - 1].method, 'answerCallbackQuery'); assert.equal(calls.length, nCalls + 1); ok('inline button logs water');
await cb('supp:creatine', stranger);
assert.match(calls[calls.length - 1].payload.text, /şəxsidi/); ok('stranger buttons are refused');

console.log('Reminders (cron)');
// Tue 3 Nov 2026 — set the clock to 07:16 Riga
clock.ms = Date.parse('2026-11-03T05:16:00Z');
let r = await cron();
assert.deepEqual(r.sent, ['morning']); ok('06:50 morning reminder (10 min before 07:00)');
assert.ok(lastMsg().payload.reply_markup.inline_keyboard[0].some(b => b.callback_data === 'water:500')); ok('morning reminder has a water button');
r = await cron(); assert.deepEqual(r.sent, []); ok('not sent twice');
clock.ms = Date.parse('2026-11-03T10:21:00Z'); // 12:21 — Tuesday, a rest day
r = await cron(); assert.deepEqual(r.sent, ['lunch']); ok('12:20 lunch + creatine reminder');
const lunchKb = lastMsg().payload.reply_markup.inline_keyboard.flat().map(b => b.callback_data);
assert.ok(lunchKb.includes('meal:lunch_rest') && lunchKb.includes('supp:creatine')); ok('lunch reminder: rest-day lunch + creatine buttons');
await cb('supp:creatine');
clock.ms = Date.parse('2026-11-03T13:02:00Z'); // 15:02
r = await cron(); assert.deepEqual(r.sent, ['water']); ok('15:00 water check (under half)');
clock.ms = Date.parse('2026-11-03T17:44:00Z'); // 19:44 — omega reminder not yet
r = await cron(); assert.deepEqual(r.sent, []); ok('nothing before its time');
clock.ms = Date.parse('2026-11-03T19:50:00Z'); // 21:50
r = await cron(); assert.deepEqual(r.sent, ['checkin']); ok('21:30 evening check-in');
const kb = lastMsg().payload.reply_markup.inline_keyboard.flat().map(b => b.callback_data);
assert.ok(kb.includes('meal:fastfood') && kb.includes('close')); ok('check-in buttons');
await cb('meal:cottage'); await cb('meal:shake');
await cb('close');
assert.match(lastMsg().payload.text, /Gün bağlandı/); assert.match(lastMsg().payload.text, /XP/); ok('close the day → score, streaks, XP');
const rem = (await api('reminders')).list;
const water = rem.find(x => x.kind === 'water');
await api('reminder_update', { id: water.id, time: '14:30', enabled: false });
assert.equal((await api('reminders')).list.find(x => x.id === water.id).enabled, false); ok('edit reminder time / off');
const t = await api('reminder_test', { id: water.id });
assert.equal(t.sent, true); assert.match(lastMsg().payload.text, /Sınax/); ok('"Test" sends one now');

clock.ms = Date.parse('2026-11-04T15:51:00Z'); // Wed 17:51 — gym day
r = await cron(); assert.ok(r.sent.includes('workout')); assert.match(lastMsg().payload.text, /10 dəqiqəyə zal/); ok('17:50 gym reminder on Mon/Wed/Fri');
clock.ms = Date.parse('2026-11-04T20:21:00Z'); // 22:21
r = await cron(); assert.ok(r.sent.includes('bed')); ok('22:20 bedtime reminder');
clock.ms = Date.parse('2026-11-03T20:30:00Z');

console.log('Photos, progress, review, more');
const tiny = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64');
const up = await api('photo_upload', { kind: 'progress', date: '2026-11-03', caption: 'öndən', data: tiny.toString('base64') });
assert.ok(up.file_id); ok('photo sent to the bot chat, only file_id stored');
const img = await app.handle(new Request(`${BASE}/photo?f=${up.file_id}&init=${encodeURIComponent(await h.initData())}`));
assert.equal(img.status, 200); assert.equal((await img.arrayBuffer()).byteLength, tiny.length); ok('photo streamed back through the function');
const strangerImg = await app.handle(new Request(`${BASE}/photo?f=${up.file_id}&init=${encodeURIComponent(await h.initData(stranger))}`));
assert.equal(strangerImg.status, 403); ok('photo blocked for strangers');
await api('waist', { date: '2026-11-03', cm: 112.5 });
const pr = await api('progress');
assert.equal(pr.waist[0].cm, 112.5); ok('waist measurement saved');
assert.equal(pr.weights.length, 2); ok('weekly average weight series');
assert.equal(pr.tracker.length, 8); assert.equal(pr.tracker[0].cells.filter(Boolean).length, 2); assert.equal(pr.trend.bench.length, 2);
assert.ok(pr.badges.find(b => b.id === 'first_rep').earned); ok('progress: tracker, e1RM trend, badges');
const rv = await api('review', { days: 14 });
assert.match(rv.text, /WORKOUTS/); assert.match(rv.text, /bench: 72.5×7, 72.5×7, 72.5×7/); assert.match(rv.text, /yağsız/); assert.match(rv.text, /GAMIFICATION: level/); ok('review text for Claude');
await api('motivation_save', { text: 'Mənim sözüm: dayanma!' });
let mv = (await api('motivations')).list;
const mine = mv.find(x => x.mine); assert.ok(mine);
await api('motivation_delete', { id: mine.id });
mv = (await api('motivations')).list; assert.ok(!mv.some(x => x.mine)); ok('own motivations add/delete');
await api('settings_save', { name: 'Orxan', playlist: 'https://open.spotify.com/playlist/x' });
assert.equal((await api('state')).settings.playlist, 'https://open.spotify.com/playlist/x'); ok('settings save');
await api('work_toggle', { date: '2026-11-03', on: true });
assert.deepEqual((await api('work_month')).days, ['2026-11-03']); ok('work days kept');
await api('study_toggle', { date: '2026-11-03', task: 'db', minutes: 45, on: true });
assert.equal((await api('study_get', { date: '2026-11-03' })).totals['2026-11-03'], 45); ok('study kept');
const setup = await app.handle(new Request(BASE + '/setup', { method: 'POST', headers: { 'x-setup-token': FAKE_TOKEN } })).then(x => x.json());
assert.equal(setup.report.webhook, true); assert.equal(setup.report.menu, true); ok('setup: webhook + menu + commands');
assert.equal(calls.find(c => c.method === 'setWebhook').payload.secret_token, webhookSecret); ok('webhook registered with the secret token');
assert.equal((await app.handle(new Request(BASE + '/setup', { method: 'POST', headers: { 'x-setup-token': 'nope' } }))).status, 401); ok('setup needs the token');

assert.equal((await app.handle(new Request(BASE + '/reset-owner', { method: 'POST', headers: { 'x-setup-token': 'nope' } }))).status, 401); ok('owner reset needs the token');
const reset = await app.handle(new Request(BASE + '/reset-owner', { method: 'POST', headers: { 'x-setup-token': FAKE_TOKEN } })).then(x => x.json());
assert.equal(reset.previousOwner.first_name, 'Orxan'); ok('owner reset reports who had the bot');
await msg('/start', stranger);
assert.match(lastMsg().payload.text, /Xoş gəldin/); assert.equal((await api('state', {}, stranger)).ok, true); ok('after a reset the next /start claims the bot');

console.log('Repair of twice-encoded JSON (first live deploy)');
{
  const { resetMigrationCache } = await import('../supabase/functions/_shared/core.js');
  await msg('/start');  // whoever owns it now, make sure it's OWNER again for this check
  await h.db.q(`update app.kv set value = jsonb_build_object('id', $1::int, 'chat_id', $1::int, 'first_name', 'Orxan') where key = 'owner'`, [OWNER.id]);
  const ownerJson = JSON.stringify({ id: OWNER.id, chat_id: OWNER.id, first_name: 'Orxan' });
  await h.db.q(`update app.kv set value = to_jsonb($1::text) where key = 'owner'`, [ownerJson]);
  await h.db.q(`update app.kv set value = to_jsonb($1::text) where key = 'migrations'`, [JSON.stringify(['001_schema', '002_seed', '003_import_old_app'])]);
  await h.db.q(`update app.reminders set weekdays = to_jsonb($1::text), supplements = to_jsonb($2::text)`, ['[1,2,3,4,5,6,7]', '["creatine"]']);
  assert.equal(typeof (await h.db.q(`select value from app.kv where key = 'owner'`))[0].value, 'string'); ok('broken live state reproduced (owner stored as a string)');
  resetMigrationCache();
  const st2 = await api('state');
  assert.equal(st2.ok, true); ok('owner recognised again after the repair migration');
  assert.equal(typeof (await h.db.q(`select value from app.kv where key = 'owner'`))[0].value, 'object'); ok('owner row repaired to real JSON');
  const rems = (await api('reminders')).list; assert.ok(Array.isArray(rems[0].weekdays) && Array.isArray(rems[0].supplements)); ok('reminder lists repaired');
  const mig = (await h.db.q(`select value from app.kv where key = 'migrations'`))[0].value; assert.ok(Array.isArray(mig) && mig.includes('004_fix_double_json')); ok('migration list repaired');
}

console.log(`\nAll ${passed} checks passed.`);
