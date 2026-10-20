// App shell: PIN lock, theme, router, bottom tabs, event delegation, pop-ups.
import { S, app, run } from './store.js';
import { tg, esc, flame, haptic, toast, celebrate, openLink, icon } from './ui.js';
import { call, ensureIdentity, ApiError } from './api.js';
import { SESSIONS } from './program.js';
import * as today from './screens/today.js';
import * as train from './screens/train.js';
import * as food from './screens/food.js';
import * as progress from './screens/progress.js';
import * as more from './screens/more.js';
import * as workout from './screens/workout.js';

const SCREENS = { today, train, food, progress, more, workout };
const PIN = '228228';
const view = document.getElementById('view');
const tabs = document.getElementById('tabs');

/* ---------- Telegram + theme ---------- */
function applyTheme() {
  const dark = tg ? tg.colorScheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (tg && tg.isVersionAtLeast('6.1')) { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); }
  } catch { /* old client */ }
}
if (tg) {
  tg.ready(); tg.expand();
  try { if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes(); } catch { /* ignore */ }
  tg.onEvent('themeChanged', applyTheme);
  if (tg.BackButton) tg.BackButton.onClick(() => (S.screen === 'workout' ? workout.actions.minimize() : app.go('today')));
}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

/* ---------- PIN screen ---------- */
function pinScreen() {
  return `<div class="pin">
    <div class="pin-logo">${flame('xl lit')}</div>
    <h1>Pəhləvan</h1>
    <p class="muted">Parolu yaz, qağa</p>
    <div class="dots" id="dots">${[0, 1, 2, 3, 4, 5].map(i => `<i class="${i < S.pin.length ? 'f' : ''}"></i>`).join('')}</div>
    <div class="pad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-a="pin" data-v="${n}">${n}</button>`).join('')}
      <span></span><button data-a="pin" data-v="0">0</button><button data-a="pin" data-v="del" aria-label="Sil">⌫</button>
    </div>
  </div>`;
}

function fatalScreen(title, text) {
  return `<div class="pin"><div class="pin-logo">${flame('xl')}</div><h1>${esc(title)}</h1><p class="muted center">${esc(text)}</p></div>`;
}

/* ---------- render / refresh / go ---------- */
app.render = () => {
  document.body.classList.toggle('locked', !S.unlocked || !!S.fatal);
  if (!S.unlocked) { view.innerHTML = pinScreen(); tabs.hidden = true; return; }
  if (S.fatal) { view.innerHTML = fatalScreen(S.fatal[0], S.fatal[1]); tabs.hidden = true; return; }
  if (!S.st) { view.innerHTML = `<div class="pin">${flame('xl lit')}<p class="muted">Tonqal yanır…</p></div>`; tabs.hidden = true; return; }
  view.innerHTML = `<div class="screen screen-${S.screen}">${SCREENS[S.screen].render()}</div>`;
  tabs.hidden = S.screen === 'workout';
  tabs.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('act', b.dataset.tab === S.screen));
  try { if (tg && tg.BackButton && tg.isVersionAtLeast('6.1')) (S.screen === 'today' ? tg.BackButton.hide() : tg.BackButton.show()); } catch { /* ignore */ }
};

app.refresh = async (rerender = true) => {
  S.st = await call('state');
  showPopups(S.st.popups || []);
  if (rerender) app.render();
};

app.go = async (screen, opts = {}) => {
  S.screen = screen;
  window.scrollTo(0, 0);
  if (screen === 'workout') {
    app.render();
    const okStart = await run(() => workout.begin(opts.session).then(() => true));
    if (!okStart) S.screen = 'today';
  } else if (SCREENS[screen].load) {
    app.render();
    await run(() => SCREENS[screen].load());
  } else if (screen === 'today') {
    await run(() => app.refresh(false));
  }
  app.render();
};

function showPopups(list) {
  for (const p of list) {
    if (p.type === 'level') celebrate(`Səviyyə ${p.level}!`, `İndi sən ${p.rank}san, qağa. Belə get!`);
    if (p.type === 'badge') celebrate(`Yeni nişan: ${p.name}`, `${p.desc}. +100 XP`);
  }
}

async function boot() {
  app.render();
  if (!(await ensureIdentity())) { S.fatal = ['Telegramdan aç', 'Bu proqram ancax öz botunun içində işdiyir.']; app.render(); return; }
  try {
    await call('sync', { sessions: SESSIONS.map(s => ({ id: s.id, name: s.name })) });
    await app.refresh(false);
    app.render();
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) S.fatal = ['Bu bot şəxsidi', /start/.test(e.message) ? 'Əvvəlcə botda /start yaz, sonra proqramı yenidən aç.' : 'Bu proqram ancax sahibi üçündü.'];
    else if (e instanceof ApiError && e.status === 401) S.fatal = ['Giriş vaxtı keçif', 'Proqramı bağla və botdan yenidən aç.'];
    else S.fatal = ['Bağlantı yoxdu', e.message || 'Bir az sonra yenə yoxla, qağa.'];
    app.render();
  }
}

/* ---------- events ---------- */
const GLOBAL = {
  pin(v) {
    if (v === 'del') S.pin = S.pin.slice(0, -1);
    else if (S.pin.length < 6) S.pin += v;
    haptic();
    if (S.pin.length === 6) {
      if (S.pin === PIN) { S.unlocked = true; S.pin = ''; haptic('ok'); boot(); return; }
      app.render(); haptic('error');
      document.getElementById('dots')?.classList.add('shake');
      setTimeout(() => { S.pin = ''; app.render(); }, 450);
      return;
    }
    app.render();
  },
  playlist() { haptic(); openLink(S.st && S.st.settings.playlist); },
};

view.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  if (el.tagName === 'LABEL') return;
  const a = el.dataset.a, screen = SCREENS[S.screen];
  const fn = (S.unlocked && screen.actions && screen.actions[a]) || GLOBAL[a];
  if (fn) { e.preventDefault(); fn(el.dataset.v, el, e); }
});
view.addEventListener('change', e => {
  const el = e.target, key = el.dataset.c;
  if (!key) return;
  const fn = SCREENS[S.screen].changes && SCREENS[S.screen].changes[key];
  if (fn) fn(el);
});
view.addEventListener('input', e => {
  const el = e.target, key = el.dataset.i || el.dataset.c;
  const fn = SCREENS[S.screen].inputs && SCREENS[S.screen].inputs[key];
  if (fn) fn(el);
});
tabs.addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  haptic('select');
  app.go(b.dataset.tab);
});
document.addEventListener('keydown', e => {
  if (S.unlocked) return;
  if (/^\d$/.test(e.key)) GLOBAL.pin(e.key);
  else if (e.key === 'Backspace') GLOBAL.pin('del');
});
// Coming back to the app (e.g. after a bot reminder) refreshes the numbers.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && S.unlocked && S.st && S.screen !== 'workout') run(() => app.refresh());
});

void icon; void toast;
app.render();
