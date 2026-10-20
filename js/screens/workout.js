// The active workout screen. The workout lives in S.wo and is saved as a draft
// both in localStorage and on the server, so closing the app mid-session loses nothing.
import { S, app, run } from '../store.js';
import { call } from '../api.js';
import { esc, kg, icon, haptic, toast, ask, celebrate, openLink } from '../ui.js';
import { SESSIONS, EXERCISES, PHASES, setsFor, rampUp } from '../program.js';

const KEY = 'pehlevan-wo';
const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);
let draftTimer = null, ticker = null;

/* ---------- progression (double progression) ---------- */
export function suggest(ex, h, phaseId) {
  if (!h || !h.last || !h.last.length) return { w: ex.start, why: 'Başlanğıc çəki — plandakı kimi' };
  const lastW = Math.max(...h.last.map(s => s.weight));
  const top = h.last.filter(s => s.weight === lastW);
  if (phaseId === 'deload') return { w: lastW, why: 'Nəfəs dərmə həftəsi — çəki eyni, setlər yarı' };
  if (top.every(s => s.reps >= ex.reps[1])) return { w: lastW + ex.step, why: `Keçən dəfə hamısı ${ex.reps[1]} təkrara çatıf → +${ex.step} kq` };
  if (h.last.some(s => s.reps < ex.reps[0])) return { w: Math.max(0, lastW - ex.step), why: `Bəzi setlər ${ex.reps[0]}-dən aşağı düşüf → bir pillə yüngül` };
  return { w: lastW, why: 'Eyni çəki — bu dəfə təkrarı artır' };
}

function build(session, hist, phaseId) {
  const ex = session.exercises.map((e, i) => {
    const sug = suggest(e, hist[e.key], phaseId);
    return { key: e.key, sug, sets: Array.from({ length: setsFor(e, i, phaseId) }, () => ({ w: sug.w, r: '', done: false })) };
  });
  const ramp = rampUp(session.exercises[0].key, ex[0].sug.w);
  const warm = [session.warmup.cardio, ...session.warmup.drills, ...ramp.map(r => `${EXERCISES[session.exercises[0].key].name}: ${kg(r.weight)} kq × ${r.reps} (${r.label})`)];
  return {
    id: null, session: session.id, started: Date.now(), phase: phaseId,
    warm: warm.map(t => ({ t, done: false })), cool: session.cooldown.map(t => ({ t, done: false })),
    ex, notes: '', cardio15: false, best: {}, rest: null, cues: null,
  };
}

function save() {
  if (!S.wo) return;
  try { localStorage.setItem(KEY, JSON.stringify(S.wo)); } catch { /* private mode */ }
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => { if (S.wo && S.wo.id) call('workout_draft', { id: S.wo.id, draft: S.wo }).catch(() => {}); }, 2500);
}
function clearLocal() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

/* ---------- start / resume ---------- */
export async function begin(sessionId) {
  S.hist = (await call('history')).history;
  const draft = S.st.draft;
  if (draft) {
    let local = null;
    try { local = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* ignore */ }
    S.wo = local && local.id === draft.id ? local : (draft.draft && draft.draft.ex ? { ...draft.draft, id: draft.id } : null);
    // A draft from an older program version can't be resumed safely — start it fresh with the same id.
    if (S.wo && !SESSIONS.some(x => x.id === S.wo.session && x.exercises.length === S.wo.ex.length)) S.wo = null;
    if (!S.wo) {
      const session = SESSIONS.find(x => x.id === draft.session) || SESSIONS[0];
      draft.session = session.id;
      S.wo = { ...build(session, S.hist, S.st.cycle.phase.id), id: draft.id, started: draft.started_at };
    }
    toast('Yarımçıx məşq — davam edirix');
  } else {
    const session = SESSIONS.find(x => x.id === sessionId) || SESSIONS[0];
    S.wo = build(session, S.hist, S.st.cycle.phase.id);
    const r = await call('workout_start', { session: session.id, draft: S.wo });
    S.wo.id = r.id;
  }
  save();
  startTicker();
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(() => {
    if (S.screen !== 'workout' || !S.wo) return;
    const t = document.getElementById('wo-time');
    if (t) { const m = Math.floor((Date.now() - S.wo.started) / 60000); t.textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; }
    const r = S.wo.rest;
    const barEl = document.getElementById('rest');
    if (r && barEl) {
      const left = Math.max(0, Math.ceil((r.until - Date.now()) / 1000));
      barEl.querySelector('.rest-left').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      barEl.querySelector('.rest-fill').style.width = `${(left / r.total) * 100}%`;
      if (left === 0) {
        S.wo.rest = null; save();
        haptic('warning');
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch { /* ignore */ }
        toast('Dincəlmə bitdi — növbəti set, qağa!');
        app.render();
      }
    }
  }, 250);
}

/* ---------- render ---------- */
export function render() {
  const wo = S.wo;
  if (!wo) return '<p class="pad muted">Yüklənir…</p>';
  const session = SESSIONS.find(x => x.id === wo.session);
  const phase = PHASES[wo.phase] || PHASES.build1;
  const doneSets = wo.ex.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const allSets = wo.ex.reduce((a, e) => a + e.sets.length, 0);

  const exHtml = wo.ex.map((e, i) => {
    const def = session.exercises[i], X = EXERCISES[e.key], h = S.hist[e.key];
    const next = def.ss && session.exercises[i + 1] && session.exercises[i + 1].ss === def.ss ? EXERCISES[session.exercises[i + 1].key].name : null;
    const prev = def.ss && session.exercises[i - 1] && session.exercises[i - 1].ss === def.ss;
    return `<article class="card ex ${e.sets.every(s => s.done) ? 'ex-done' : ''}" id="ex-${i}">
      <div class="ex-head">
        <button class="demo" data-a="cues" data-v="${i}" aria-label="${esc(X.name)} — forma göstərişləri">
          <img src="img/ex/${X.img}-0.jpg" alt="" loading="lazy"><img src="img/ex/${X.img}-1.jpg" alt="" class="f2" loading="lazy">
        </button>
        <div class="grow">
          <h3>${i + 1}. ${esc(X.name)}</h3>
          <p class="muted small">${e.sets.length} × ${def.reps[0]}–${def.reps[1]} · dincəl ${def.rest ? Math.round(def.rest / 60 * 10) / 10 + ' dəq' : 'yox (superset)'}</p>
          ${def.ss ? `<span class="chip small">${prev ? 'Superset — 2-ci' : 'Superset → ' + esc(next || '')}</span>` : ''}
        </div>
      </div>
      ${wo.cues === i ? `<div class="cues"><ul>${X.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        <button class="link" data-a="video" data-v="${i}">${icon.video} Form videolarına bax</button></div>` : ''}
      <p class="last">${h && h.last.length ? `Keçən dəfə (${h.lastDate}): ${h.last.map(s => `${kg(s.weight)}×${s.reps}`).join(', ')} · rekord ${kg(h.best)} kq` : 'Bu hərəkəti ilk dəfə yazırsan'}</p>
      <p class="sug">${icon.flame}<span><b>${kg(e.sug.w)} kq</b> — ${esc(e.sug.why)}</span></p>
      <div class="sets">
        ${e.sets.map((s, j) => `<div class="set-row ${s.done ? 'done' : ''}">
          <span class="set-n">${j + 1}</span>
          <label class="field"><input type="number" inputmode="decimal" step="0.5" min="0" value="${s.w}" data-c="w" data-ex="${i}" data-s="${j}" aria-label="Çəki, set ${j + 1}"><span>kq</span></label>
          <label class="field"><input type="number" inputmode="numeric" min="0" value="${s.r}" placeholder="${def.reps[0]}–${def.reps[1]}" data-c="r" data-ex="${i}" data-s="${j}" aria-label="Təkrar, set ${j + 1}"><span>dəfə</span></label>
          <button class="done-btn" data-a="done" data-v="${i}:${j}" aria-label="Set ${j + 1} bitdi" aria-pressed="${s.done}">${icon.check}</button>
        </div>`).join('')}
      </div>
      <div class="row between">
        <button class="btn ghost small" data-a="addSet" data-v="${i}">${icon.plus} Set</button>
        <span class="muted tiny">${esc(X.log)}</span>
      </div>
    </article>`;
  }).join('');

  return `<header class="top wo-top">
    <button class="icon-btn" data-a="minimize" aria-label="Geri">${icon.left}</button>
    <div class="grow center"><p class="label">${esc(session.name)}</p><b id="wo-time">0:00</b> · <span class="muted small">${doneSets}/${allSets} set</span></div>
    <button class="icon-btn" data-a="playlist" aria-label="Mahnılarım">${icon.music}</button>
  </header>
  <article class="card phase-note"><p class="label gold">${esc(phase.name)} · RIR ${esc(phase.rir)}</p><p class="small">${esc(phase.note)}</p></article>

  <article class="card">
    <h3>İsinmə</h3>
    ${wo.warm.map((w, i) => `<button class="check-row ${w.done ? 'on' : ''}" data-a="warm" data-v="${i}" aria-pressed="${w.done}"><span class="check">${w.done ? icon.check : ''}</span><span class="grow">${esc(w.t)}</span></button>`).join('')}
  </article>

  ${exHtml}

  <article class="card">
    <h3>Soyuma — dartma</h3>
    ${wo.cool.map((w, i) => `<button class="check-row ${w.done ? 'on' : ''}" data-a="cool" data-v="${i}" aria-pressed="${w.done}"><span class="check">${w.done ? icon.check : ''}</span><span class="grow">${esc(w.t)}</span></button>`).join('')}
    ${session.cardio ? `<button class="btn ${wo.cardio15 ? 'ok' : 'soft'} full" data-a="cardio15">${wo.cardio15 ? icon.check + ' 15 dəq kardio yazılajax' : icon.plus + ' 15 dəq kardio yaz'}</button>` : ''}
  </article>

  <article class="card">
    <label class="label" for="wo-notes">Qeydlər</label>
    <textarea id="wo-notes" data-i="notes" rows="3" placeholder="Necə keçdi? Ağrı, enerji, zal dolu idi…">${esc(wo.notes)}</textarea>
  </article>
  <div class="row gap pad-b">
    <button class="btn ghost" data-a="discard">${icon.trash} At</button>
    <button class="btn fire grow" data-a="finish">Məşqi bitir</button>
  </div>
  ${wo.rest ? `<div class="rest" id="rest" role="timer"><div class="rest-fill"></div><span>Dincəl</span><b class="rest-left">…</b><button class="btn small ghost" data-a="skipRest">Ötür</button></div>` : ''}`;
}

/* ---------- actions ---------- */
export const actions = {
  playlist() { openLink(S.st.settings.playlist); },
  async minimize() { save(); await app.go('today'); toast('Məşq yadda qaldı — "Davam elə" bas'); },
  cues(i) { S.wo.cues = S.wo.cues === +i ? null : +i; haptic('select'); app.render(); },
  video(i) { const X = EXERCISES[S.wo.ex[+i].key]; openLink('https://www.youtube.com/results?search_query=' + encodeURIComponent(X.video)); },
  warm(i) { S.wo.warm[+i].done = !S.wo.warm[+i].done; haptic('select'); save(); app.render(); },
  cool(i) { S.wo.cool[+i].done = !S.wo.cool[+i].done; haptic('select'); save(); app.render(); },
  cardio15() { S.wo.cardio15 = !S.wo.cardio15; haptic('select'); save(); app.render(); },
  addSet(i) {
    const e = S.wo.ex[+i], last = e.sets[e.sets.length - 1];
    e.sets.push({ w: last ? last.w : e.sug.w, r: '', done: false });
    haptic(); save(); app.render();
  },
  skipRest() { S.wo.rest = null; save(); app.render(); },
  done(v) {
    const [i, j] = v.split(':').map(Number);
    const wo = S.wo, e = wo.ex[i], s = e.sets[j];
    const session = SESSIONS.find(x => x.id === wo.session), def = session.exercises[i], X = EXERCISES[e.key];
    if (s.done) { s.done = false; save(); app.render(); return; }
    if (!(+s.r > 0)) { toast('Təkrar sayını yaz, qağa'); haptic('error'); return; }
    s.done = true;
    haptic('medium');
    // New best set? (compared with history and earlier sets today)
    const v1 = e1rm(+s.w, +s.r);
    const prevBest = Math.max(S.hist[e.key]?.best || 0, wo.best[e.key] || 0);
    if (S.hist[e.key]?.best && v1 > prevBest + 1e-9) celebrate('Yeni rekord!', `${X.name}: ${kg(s.w)} × ${s.r} → təxmini maksimum ${kg(v1)} kq. +25 XP`);
    wo.best[e.key] = Math.max(wo.best[e.key] || 0, v1);
    // Superset: the first exercise sends you straight to the second; only the last starts the timer.
    const nextDef = session.exercises[i + 1];
    if (def.ss && nextDef && nextDef.ss === def.ss) {
      toast(`İndi düz ${EXERCISES[nextDef.key].name}-ə keç!`);
      wo.rest = null;
    } else if (def.rest) {
      wo.rest = { until: Date.now() + def.rest * 1000, total: def.rest };
    }
    save(); app.render();
  },
  async discard() {
    if (!(await ask('Bu məşqi atax? Yazılan setlər silinəjək.', 'At'))) return;
    await run(async () => {
      await call('workout_discard', { id: S.wo.id });
      clearLocal(); S.wo = null; clearInterval(ticker);
      await app.go('today');
    });
  },
  async finish() {
    const wo = S.wo;
    const sets = [];
    wo.ex.forEach(e => e.sets.forEach((s, idx) => { if (s.done && +s.r > 0) sets.push({ exercise: e.key, idx, weight: +s.w || 0, reps: +s.r }); }));
    if (!sets.length && !(await ask('Heç bir set bitməyif. Yenə də bitirək?', 'Bitir', false))) return;
    await run(async () => {
      const r = await call('workout_finish', { id: wo.id, sets, notes: wo.notes });
      if (wo.cardio15) await call('cardio_add', { date: S.st.today, minutes: 15, kind: 'Maili yeriş' });
      clearLocal(); S.wo = null; clearInterval(ticker); clearTimeout(draftTimer);
      haptic('ok');
      await app.go('today');
      toast(`Məşq bitdi: ${r.minutes} dəq · ${r.sets} set · ${Math.round(r.volume)} kq həcm · +${r.xp} XP${r.newBests ? ` · ${r.newBests} rekord` : ''}`, 4500);
    });
  },
};

export const changes = {
  w(el) { S.wo.ex[+el.dataset.ex].sets[+el.dataset.s].w = el.value === '' ? '' : +el.value; save(); },
  r(el) { S.wo.ex[+el.dataset.ex].sets[+el.dataset.s].r = el.value === '' ? '' : +el.value; save(); },
};
export const inputs = {
  notes(el) { S.wo.notes = el.value; save(); },
  w(el) { changes.w(el); },
  r(el) { changes.r(el); },
};
