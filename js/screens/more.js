// "Qalanı" — review with Claude, motivations, reminders, settings, work days, study, lock.
import { S, app, run } from '../store.js';
import { call } from '../api.js';
import { esc, icon, haptic, toast, ask, addDays, MONTHS, WD, tg, flame } from '../ui.js';
import { header } from './today.js';

const M = S.more = { review: null, days: 7, motiv: null, rem: null, work: null, study: null, workMonth: null, studyDate: null, home: null };

// Telegram (Bot API 8.0+) can put the mini app on the phone's home screen as its own icon.
const canHome = () => !!(tg && tg.isVersionAtLeast && tg.isVersionAtLeast('8.0') && tg.addToHomeScreen);
function homeCard() {
  if (M.home === 'added') return '';
  return `<article class="card home-card">
    <div class="row gap center-y">${flame('lg lit gold')}<div class="grow"><h3>Telefonun ekranına əlavə elə</h3>
    <p class="muted small">Pəhləvan ikonu ekranda olajax — bir toxunuşla açılajax, bota girmədən.</p></div></div>
    <button class="btn fire full" data-a="addHome">${icon.plus} Ekrana əlavə elə</button>
    ${canHome() ? '' : '<p class="muted tiny">Bunun üçün Telegramı son versiyaya yenilə.</p>'}
  </article>`;
}
if (canHome()) {
  try { tg.checkHomeScreenStatus(st => { M.home = st; if (st === 'added' && S.screen === 'more') app.render(); }); } catch { /* old client */ }
  tg.onEvent('homeScreenAdded', () => { M.home = 'added'; toast('Əlavə olundu — ikon telefonun ekranındadı!'); haptic('ok'); app.render(); });
}

const section = (id, title, ic, body) => `<article class="card fold ${S.open[id] ? 'open' : ''}">
  <button class="fold-head" data-a="fold" data-v="${id}" aria-expanded="${!!S.open[id]}">${ic}<span class="grow">${title}</span>${S.open[id] ? icon.minus : icon.plus}</button>
  ${S.open[id] ? `<div class="fold-body">${body()}</div>` : ''}</article>`;

export function render() {
  const st = S.st, s = st.settings;
  return `${header(st, 'Qalanı')}
  ${homeCard()}
  ${section('review', 'Claude ilə baxış', icon.copy, () => `
    <p class="small muted">Son günlərin xülasəsi — kopyala, Claude layihənə yapışdır, planı birlikdə düzəldərik.</p>
    <div class="seg"><button class="${M.days === 7 ? 'act' : ''}" data-a="reviewDays" data-v="7">7 gün</button><button class="${M.days === 14 ? 'act' : ''}" data-a="reviewDays" data-v="14">14 gün</button></div>
    ${M.review ? `<textarea class="mono" rows="12" readonly id="review-text">${esc(M.review)}</textarea>
      <button class="btn fire full" data-a="copyReview">${icon.copy} Kopyala</button>` : '<button class="btn full" data-a="makeReview">Xülasəni hazırla</button>'}`)}

  ${section('motiv', 'Motivasiya sözləri', icon.flame, () => M.motiv ? `
    ${M.motiv.map(m => m.mine ? (S.open.motivEdit === m.id ? `
      <div class="motiv-edit"><textarea id="mv-${m.id}" rows="2">${esc(m.text)}</textarea>
      <div class="row gap tight"><button class="btn ghost" data-a="delMotiv" data-v="${m.id}">${icon.trash}</button><button class="btn grow" data-a="saveMotiv" data-v="${m.id}">Saxla</button></div></div>` :
      `<button class="list-row mine" data-a="editMotiv" data-v="${m.id}"><span class="grow">${esc(m.text)}</span>${icon.edit}</button>`) :
      `<div class="list-row"><span class="grow muted">${esc(m.text)}</span></div>`).join('')}
    <textarea id="mv-new" rows="2" placeholder="Öz sözünü yaz…"></textarea>
    <button class="btn soft full" data-a="addMotiv">${icon.plus} Əlavə elə</button>` : '<p class="muted">Yüklənir…</p>')}

  ${section('rem', 'Xatırlatmalar', icon.bell, () => M.rem ? M.rem.map(r => `
    <div class="rem-row">
      <span class="grow"><b>${esc(r.label)}</b>${r.weekdays.length < 7 ? `<small class="muted"> · ${r.weekdays.map(d => WD[d - 1]).join(', ')}</small>` : ''}</span>
      <input type="time" value="${esc(r.time)}" data-c="remTime" data-v="${r.id}" aria-label="Vaxt">
      <input type="checkbox" class="switch" data-c="remOn" data-v="${r.id}" ${r.enabled ? 'checked' : ''} aria-label="Açıq">
      <button class="btn ghost small" data-a="testRem" data-v="${r.id}">Sınax</button>
    </div>`).join('') : '<p class="muted">Yüklənir…</p>')}

  ${section('set', 'Ayarlar', icon.edit, () => `
    <div class="form">
      <label class="lbl">Adın<input id="s-name" value="${esc(s.name)}"></label>
      <label class="lbl">Dövrün başlanğıcı (həftə 1, bazar ertəsi)<input id="s-start" type="date" value="${esc(s.cycleStart)}"></label>
      <label class="lbl">Musiqi linki (Spotify / YouTube Music)<input id="s-pl" type="url" value="${esc(s.playlist)}"></label>
      <div class="row gap tight">
        <label class="lbl grow">Kalori<input id="s-kcal" type="number" inputmode="numeric" value="${s.kcal}"></label>
        <label class="lbl grow">Zülal (q)<input id="s-prot" type="number" inputmode="numeric" value="${s.protein}"></label>
        <label class="lbl grow">Su (ml)<input id="s-water" type="number" inputmode="numeric" value="${s.water}"></label>
      </div>
      <button class="btn fire full" data-a="saveSettings">Yadda saxla</button>
    </div>`)}

  ${section('work', 'İş günləri', icon.dumbbell, () => M.work ? workCalendar() : '<p class="muted">Yüklənir…</p>')}
  ${section('study', 'Dərs', icon.info, () => M.study ? studyBlock(s) : '<p class="muted">Yüklənir…</p>')}

  <button class="btn ghost full" data-a="lock">${icon.lock} Kilidlə</button>
  <p class="muted tiny center pad">Pəhləvan · məlumatlar Supabase-də, şəkillər öz bot çatında</p>`;
}

function workCalendar() {
  const today = S.st.today;
  const [y, m] = (M.workMonth || today.slice(0, 7)).split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)), days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const set = new Set(M.work);
  const prefix = `${y}-${String(m).padStart(2, '0')}`;
  const count = M.work.filter(d => d.startsWith(prefix)).length;
  let cells = WD.map(w => `<span class="wd">${w}</span>`).join('') + '<span></span>'.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const k = `${prefix}-${String(d).padStart(2, '0')}`;
    cells += `<button class="cal-day ${set.has(k) ? 'on' : ''} ${k === today ? 'today' : ''}" data-a="workDay" data-v="${k}" ${k > today ? 'disabled' : ''}>${d}</button>`;
  }
  return `<div class="row between"><button class="icon-btn" data-a="workNav" data-v="-1" aria-label="Əvvəlki ay">${icon.left}</button><b>${MONTHS[m - 1]} ${y} · ${count} gün</b><button class="icon-btn" data-a="workNav" data-v="1" aria-label="Sonrakı ay">${icon.right}</button></div>
    <div class="cal">${cells}</div><p class="muted tiny">İşlədiyin günə toxun — işarələnsin.</p>`;
}

function studyBlock(s) {
  const d = M.study, date = M.studyDate || S.st.today;
  const done = Object.fromEntries(d.tasks.map(t => [t.task, t.minutes]));
  const total = Object.values(done).reduce((a, b) => a + b, 0) + (d.extra || 0);
  return `<div class="row between"><button class="icon-btn" data-a="studyNav" data-v="-1" aria-label="Əvvəlki gün">${icon.left}</button><b>${date === S.st.today ? 'Bu gün' : date} · ${total} / ${s.studyGoal} dəq</b><button class="icon-btn" data-a="studyNav" data-v="1" aria-label="Sonrakı gün" ${date >= S.st.today ? 'disabled' : ''}>${icon.right}</button></div>
    <div class="bar gold"><i style="width:${Math.min(100, total / s.studyGoal * 100)}%"></i></div>
    ${s.studyPlan.map(t => `<button class="check-row ${done[t.id] ? 'on' : ''}" data-a="studyTask" data-v="${esc(t.id)}" data-m="${t.minutes}"><span class="check">${done[t.id] ? icon.check : ''}</span><span class="grow">${esc(t.name)}${t.id === 'db' ? ' <span class="chip small">hər gün</span>' : ''}</span><span class="muted small">${t.minutes} dəq</span></button>`).join('')}
    <div class="row gap tight"><span class="grow muted small">Əlavə vaxt: ${d.extra || 0} dəq</span><button class="btn ghost small" data-a="studyExtra" data-v="15">+15</button><button class="btn ghost small" data-a="studyExtra" data-v="-15">−15</button></div>
    <textarea id="st-note" rows="2" placeholder="Bu gün nə öyrəndim?">${esc(d.note)}</textarea>
    <button class="btn soft full" data-a="studySave">Qeydi saxla</button>
    <p class="muted tiny">Verilənlər bazası seriyası: ${dbStreak(d.db_days)} gün</p>`;
}
function dbStreak(days) {
  const set = new Set(days); let d = S.st.today, n = 0;
  if (!set.has(d)) d = addDays(d, -1);
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

async function loadSection(id) {
  if (id === 'motiv') M.motiv = (await call('motivations')).list;
  if (id === 'rem') M.rem = (await call('reminders')).list;
  if (id === 'work') M.work = (await call('work_month')).days;
  if (id === 'study') M.study = await call('study_get', { date: M.studyDate || S.st.today });
}

export const actions = {
  async fold(id) {
    S.open[id] = !S.open[id]; haptic('select'); app.render();
    if (S.open[id]) { await run(() => loadSection(id)); app.render(); }
  },
  reviewDays(v) { M.days = +v; M.review = null; app.render(); },
  async makeReview() { await run(async () => { M.review = (await call('review', { days: M.days })).text; app.render(); }); },
  async copyReview() {
    try { await navigator.clipboard.writeText(M.review); toast('Kopyalandı — Claude-a yapışdır'); }
    catch { const t = document.getElementById('review-text'); t.select(); document.execCommand('copy'); toast('Kopyalandı'); }
    haptic('ok');
  },
  editMotiv(id) { S.open.motivEdit = +id; app.render(); },
  async saveMotiv(id) { await run(async () => { await call('motivation_save', { id: +id, text: document.getElementById('mv-' + id).value }); S.open.motivEdit = null; await loadSection('motiv'); app.render(); }); },
  async addMotiv() {
    const text = document.getElementById('mv-new').value.trim();
    if (!text) return toast('Bir söz yaz');
    await run(async () => { await call('motivation_save', { text }); haptic('ok'); await loadSection('motiv'); app.render(); });
  },
  async delMotiv(id) {
    if (!(await ask('Bu sözü silək?'))) return;
    await run(async () => { await call('motivation_delete', { id: +id }); await loadSection('motiv'); app.render(); });
  },
  async testRem(id) { await run(async () => { const r = await call('reminder_test', { id: +id }); toast(r.sent ? 'Bota göndərildi' : 'Göndərilmədi'); }); },
  async saveSettings() {
    const body = {
      name: document.getElementById('s-name').value.trim() || 'Orxan',
      cycleStart: document.getElementById('s-start').value,
      playlist: document.getElementById('s-pl').value.trim(),
      kcal: +document.getElementById('s-kcal').value, protein: +document.getElementById('s-prot').value, water: +document.getElementById('s-water').value,
    };
    await run(async () => { await call('settings_save', body); haptic('ok'); toast('Yadda qaldı'); await app.refresh(); });
  },
  async workDay(date) {
    const on = !M.work.includes(date);
    haptic(on ? 'ok' : 'light');
    await run(async () => { await call('work_toggle', { date, on }); await loadSection('work'); app.render(); });
  },
  workNav(v) {
    const [y, m] = (M.workMonth || S.st.today.slice(0, 7)).split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + +v, 1));
    M.workMonth = d.toISOString().slice(0, 7); app.render();
  },
  async studyNav(v) { M.studyDate = addDays(M.studyDate || S.st.today, +v); await run(() => loadSection('study')); app.render(); },
  async studyTask(id, el) {
    const on = !M.study.tasks.some(t => t.task === id);
    haptic(on ? 'ok' : 'light');
    await run(async () => { await call('study_toggle', { date: M.studyDate || S.st.today, task: id, minutes: +el.dataset.m, on }); await loadSection('study'); app.render(); });
  },
  async studyExtra(v) {
    const extra = Math.max(0, (M.study.extra || 0) + +v);
    await run(async () => { await call('study_note', { date: M.studyDate || S.st.today, extra, note: M.study.note }); await loadSection('study'); app.render(); });
  },
  async studySave() {
    await run(async () => { await call('study_note', { date: M.studyDate || S.st.today, extra: M.study.extra || 0, note: document.getElementById('st-note').value }); toast('Saxlandı'); await loadSection('study'); app.render(); });
  },
  lock() { S.unlocked = false; S.pin = ''; app.render(); },
  addHome() {
    haptic();
    if (!canHome()) return toast('Telegramı yenilə (App Store / Play Market), sonra yenə yoxla');
    try { tg.addToHomeScreen(); } catch { toast('Bu telefonda alınmadı'); }
  },
};

export const changes = {
  async remTime(el) { await run(async () => { await call('reminder_update', { id: +el.dataset.v, time: el.value }); toast('Vaxt dəyişdi'); }); },
  async remOn(el) { await run(async () => { await call('reminder_update', { id: +el.dataset.v, enabled: el.checked }); haptic('select'); }); },
};
