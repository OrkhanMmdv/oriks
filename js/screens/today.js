// "Bu gün" — the home screen.
import { S, app, run } from '../store.js';
import { call } from '../api.js';
import { esc, fmtL, kg, icon, ring, bar, flameStrip, flame, haptic, toast, openLink, niceDate, addDays } from '../ui.js';
import { SESSIONS, EXERCISES, PHASES } from '../program.js';

// Azerbaijani ordinal ending: 1-ci, 3-cü, 6-cı, 9-cu …
export const ordinal = n => ({ 1: 'ci', 2: 'ci', 3: 'cü', 4: 'cü', 5: 'ci', 6: 'cı', 7: 'ci', 8: 'ci', 9: 'cu', 10: 'cu', 11: 'ci', 12: 'ci' }[n] || 'ci');

export function greeting(hm) {
  const h = +hm.split(':')[0];
  if (h >= 5 && h < 12) return 'Sabahın xeyir';
  if (h >= 12 && h < 17) return 'Günortan xeyir';
  if (h >= 17 && h < 23) return 'Axşamın xeyir';
  return 'Gecən xeyrə qalsın';
}

export function header(st, title = null) {
  return `<header class="top">
    <div class="brand">${flame('md lit')}<span>Pəhləvan</span></div>
    ${title ? `<h1 class="top-title">${esc(title)}</h1>` : ''}
    <button class="pill" data-a="playlist" aria-label="Mahnılarım">${icon.music}<span>Mahnılarım</span></button>
  </header>${flameStrip()}`;
}

export function readyText(next, today) {
  if (next.ready) return 'Hazırdı — gedəx!';
  const when = next.readyDate === today ? 'Bu gün' : next.readyDate === addDays(today, 1) ? 'Sabah' : next.readyDate === addDays(today, 2) ? 'Birigün' : niceDate(next.readyDate, today);
  return `${when} ${next.readyHm}-dan hazır olajax`;
}

const PART_NAMES = { protein: ['Zülal', 25], kcal: ['Kalori', 20], water: ['Su', 20], supp: ['Kreatin', 10], training: ['Məşq', 15], sweets: ['Şirin', 10] };

export function render() {
  const st = S.st, s = st.settings, sc = st.score;
  const session = SESSIONS.find(x => x.id === st.next.id) || SESSIONS[0];
  const phase = PHASES[st.cycle.phase.id];
  const weekLine = st.cycle.week === 0 ? `Proqram ${st.cycle.startsIn} günə başdıyır` : `${st.cycle.weeks} həftənin <b>${st.cycle.week}-${ordinal(st.cycle.week)} həftəsi</b> · ${esc(phase.name)}`;
  const kT = sc.kcalTarget || s.kcal;
  const kcalLeft = Math.max(0, kT - sc.kcal), protLeft = Math.max(0, s.protein - sc.protein);
  const partsHtml = Object.entries(PART_NAMES).map(([k, [name, max]]) => {
    const v = sc.parts[k] || 0;
    const cls = v >= max ? 'good' : v > 0 ? 'mid' : 'bad';
    return `<span class="part ${cls}">${name} ${v}/${max}</span>`;
  }).join('');
  const lw = st.week.lastWeight;

  return `${header(st)}
  <section class="hello">
    <h1>${greeting(st.nowHm)},<br>${esc(s.name)} qağa</h1>
    <p class="muted">${weekLine}</p>
  </section>

  <article class="card quote">
    <p class="label gold">Günün sözü</p>
    <p class="quote-text">${esc(st.motivation)}</p>
  </article>

  <article class="card next ${st.next.ready ? 'is-ready' : ''}">
    <div class="row between top-align">
      <div>
        <p class="label">Növbəti məşq</p>
        <h2>${esc(session.name)}</h2>
        <p class="muted small">${session.exercises.slice(0, 3).map(e => esc(EXERCISES[e.key].name)).join(' · ')} · +${session.exercises.length - 3}</p>
      </div>
      <span class="chip">${esc(session.focus)}</span>
    </div>
    <p class="ready ${st.next.ready ? 'ok' : ''}">${readyText(st.next, st.today)}</p>
    <div class="row gap">
      <button class="btn grow fire" data-a="startNext">${st.draft ? 'Davam elə' : 'Başdıyax'}</button>
      ${st.draft || SESSIONS.length < 2 ? '' : '<button class="btn ghost" data-a="skipNext">Ötür</button>'}
    </div>
    <label class="switch-row">
      <span>Bu gün işdən boşam</span>
      <input type="checkbox" class="switch" data-c="dayoff" ${st.dayoff ? 'checked' : ''}>
    </label>
  </article>

  <article class="card">
    <div class="row gap center-y">
      ${ring(sc.total, 100, 108, 'Günün xalı')}
      <div class="grow">
        <p class="label">Günün xalı</p>
        <p class="strong">${sc.total >= 80 ? 'Xüsusi gündü — alov qızılıdı!' : sc.noMeals ? 'Yemək yazılmıyıf — xal 0' : `Xüsusi günə ${80 - sc.total} xal qalır`}</p>
        <div class="parts">${partsHtml}</div>
      </div>
    </div>
  </article>

  <article class="card">
    <p class="label">${sc.trainDay ? 'Məşq günü' : 'İstirahət günü'} · hədəf ${kT} kkal</p>
    <div class="meter"><span>Kalori</span><b>${sc.kcal} / ${kT}</b></div>${bar(sc.kcal, kT, sc.kcal > kT * 1.1 ? 'over' : 'gold')}
    <div class="meter"><span>Zülal</span><b>${sc.protein} / ${s.protein} q</b></div>${bar(sc.protein, s.protein, 'red')}
    <p class="muted small">${kcalLeft || protLeft ? `Hələ ${kcalLeft} kkal, ${protLeft} q zülal qalıf` : 'Bu günlük hədəf tamamdı, halaldı!'}</p>
    <hr>
    ${waterBlock(sc.water, sc.waterTarget)}
  </article>

  <article class="card">
    <p class="label">Dərmanlar</p>
    ${s.supps.map(x => {
      const on = sc.supps.includes(x.id);
      return `<button class="check-row ${on ? 'on' : ''}" data-a="supp" data-v="${esc(x.id)}" aria-pressed="${on}">
        <span class="check">${on ? icon.check : ''}</span><span class="grow">${esc(x.name)}</span><span class="muted small">${esc(x.when)}</span></button>`;
    }).join('')}
  </article>

  <div class="streaks">
    ${[['supp', 'kreatin', 'gün'], ['water', 'su', 'gün'], ['logging', 'yazı', 'gün'], ['training', 'məşq', 'həftə']].map(([k, n, u]) =>
      `<div class="card streak ${st.atRisk.some(r => r.kind === k) ? 'risk' : ''}"><b>${st.streaks[k]}</b><span>${n} ${u}</span></div>`).join('')}
  </div>
  ${st.atRisk.map(r => `<p class="risk-text">${esc(r.text)}</p>`).join('')}

  <article class="card">
    <div class="row between baseline"><h3>Səviyyə ${st.level.level} · ${esc(st.level.rank)}</h3><span class="muted small">${st.level.levelXp} / ${st.level.levelNeed} XP</span></div>
    ${bar(st.level.levelXp, st.level.levelNeed, 'ember thick')}
    <p class="muted small">Bu həftə: ${st.week.sessions} məşq · son çəki ${lw ? kg(lw.kg) + ' kq (' + niceDate(lw.date, st.today) + ')' : '—'} · kardio ${st.week.cardioMin} dəq</p>
  </article>`;
}

export function waterBlock(ml, target, date = null) {
  return `<div class="meter"><span>${icon.water} Su</span><b>${fmtL(ml)} / ${fmtL(target)} L</b></div>${bar(ml, target, 'blue')}
    <div class="row gap tight">
      <button class="btn ghost grow" data-a="water" data-v="-250" ${date ? `data-d="${date}"` : ''}>−250</button>
      <button class="btn soft grow" data-a="water" data-v="250" ${date ? `data-d="${date}"` : ''}>+250</button>
      <button class="btn soft grow" data-a="water" data-v="500" ${date ? `data-d="${date}"` : ''}>+500</button>
    </div>`;
}

export const actions = {
  playlist() { haptic(); openLink(S.st.settings.playlist); },
  async startNext() { haptic('medium'); await app.go('workout', { session: S.st.next.id }); },
  async skipNext() {
    await run(async () => { await call('workout_skip'); toast('Ötürdük — növbəti hazırdı'); await app.refresh(); });
  },
  async supp(id) {
    const on = !S.st.score.supps.includes(id);
    haptic(on ? 'ok' : 'light');
    await run(async () => { await call('supp', { date: S.st.today, id, on }); await app.refresh(); });
  },
  async water(delta, el) {
    haptic();
    const date = el.dataset.d || S.st.today;
    await run(async () => { await call('water', { date, delta: +delta }); await app.refresh(); });
  },
};

export const changes = {
  async dayoff(el) {
    haptic('select');
    await run(async () => { await call('dayoff', { date: S.st.today, on: el.checked }); await app.refresh(); toast(el.checked ? 'İstirahət günü — məşq üçün əla gündü!' : 'Yaxşı, iş günüdü'); });
  },
};
