// "Məşq" — phase, the session queue, all sessions and the cardio log.
import { S, app, run } from '../store.js';
import { call } from '../api.js';
import { esc, icon, haptic, toast, bar, niceDate } from '../ui.js';
import { SESSIONS, EXERCISES, PHASES, setsFor } from '../program.js';
import { header, readyText } from './today.js';

const CARDIO_KINDS = ['Maili yeriş', 'Velosiped', 'Avarçəkmə', 'Eliptik', 'Başqa'];

export function render() {
  const st = S.st;
  const phase = PHASES[st.cycle.phase.id];
  const next = SESSIONS.find(x => x.id === st.next.id) || SESSIONS[0];
  const cardio = st.week.cardio || [];
  return `${header(st, 'Məşq')}
  <article class="card phase-note">
    <p class="label gold">${st.cycle.week ? `Həftə ${st.cycle.week} / ${st.cycle.weeks}` : `${st.cycle.startsIn} günə başdıyır`} · ${esc(phase.name)}</p>
    <p class="small">${esc(phase.note)} RIR: ${esc(phase.rir)}.</p>
    <div class="week-bar">${Array.from({ length: st.cycle.weeks }, (_, i) => `<span class="${i + 1 < st.cycle.week ? 'past' : i + 1 === st.cycle.week ? 'now' : ''}"></span>`).join('')}</div>
  </article>

  <article class="card next ${st.next.ready ? 'is-ready' : ''}">
    <p class="label">Növbəti məşq</p>
    <h2>${esc(next.name)}</h2>
    <p class="ready ${st.next.ready ? 'ok' : ''}">${readyText(st.next, st.today)}</p>
    <div class="row gap">
      <button class="btn fire grow" data-a="start" data-v="${next.id}">${st.draft ? 'Davam elə' : 'Başdıyax'}</button>
      ${st.draft || SESSIONS.length < 2 ? '' : '<button class="btn ghost" data-a="skip">Ötür</button>'}
    </div>
    <p class="muted tiny">${SESSIONS.length === 1 ? 'Hər dəfə eyni proqram: B.e, Ç, C — 18:00–19:00. Gün buraxsan, sadəcə gecikir.' : `Növbə: ${SESSIONS.map(x => x.id === next.id ? `<b>${x.id}</b>` : x.id).join(' → ')} → … Gün buraxsan, sadəcə gecikir.`}</p>
  </article>

  <h3 class="section">${SESSIONS.length === 1 ? 'Proqram' : 'Bütün məşqlər'}</h3>
  ${SESSIONS.map(s => `<article class="card">
    <div class="row between"><div><h3>${esc(s.name)}</h3><p class="muted small">${esc(s.focus)}</p></div>
    ${st.draft ? '' : `<button class="btn soft small" data-a="start" data-v="${s.id}">${icon.play} Başla</button>`}</div>
    <ol class="ex-list">${s.exercises.map((e, i) => `<li><span>${esc(EXERCISES[e.key].name)}${e.ss ? ' <em>ss</em>' : ''}</span><span class="muted">${setsFor(e, i, st.cycle.phase.id)} × ${e.reps[0]}–${e.reps[1]}</span></li>`).join('')}</ol>
  </article>`).join('')}

  <h3 class="section">Kardio</h3>
  <article class="card">
    <div class="meter"><span>Bu həftə</span><b>${cardio.length} / 2 dəfə · ${st.week.cardioMin} dəq</b></div>
    ${bar(cardio.length, 2, 'gold')}
    <p class="muted tiny">Hədəf: həftədə 2 × 15–20 dəqiqə — məşqdən sonra və ya istirahət günü gəzinti.</p>
    <div class="row gap tight">
      <label class="field grow"><input id="cmin" type="number" inputmode="numeric" min="1" value="15" aria-label="Dəqiqə"><span>dəq</span></label>
      <select id="ckind" aria-label="Növ">${CARDIO_KINDS.map(k => `<option>${k}</option>`).join('')}</select>
      <button class="btn soft" data-a="addCardio">${icon.plus}</button>
    </div>
    ${cardio.map(c => `<div class="list-row"><span class="grow">${niceDate(c.date, st.today)} · ${esc(c.kind || '')}</span><b>${c.minutes} dəq</b><button class="icon-btn small" data-a="delCardio" data-v="${c.id}" aria-label="Sil">${icon.trash}</button></div>`).join('')}
  </article>`;
}

export const actions = {
  async start(id) { haptic('medium'); await app.go('workout', { session: id }); },
  async skip() { await run(async () => { await call('workout_skip'); toast('Ötürdük'); await app.refresh(); }); },
  async addCardio() {
    const minutes = +document.getElementById('cmin').value, kind = document.getElementById('ckind').value;
    if (!(minutes > 0)) return toast('Dəqiqəni yaz');
    await run(async () => { await call('cardio_add', { date: S.st.today, minutes, kind }); haptic('ok'); await app.refresh(); });
  },
  async delCardio(id) { await run(async () => { await call('cardio_delete', { id: +id }); await app.refresh(); }); },
};
