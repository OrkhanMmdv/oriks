// "Nəticə" — rank, 12-week fire tracker, bodyweight + strength charts, bests, photos, badges.
import { S, app, run } from '../store.js';
import { call, photoUrl } from '../api.js';
import { esc, kg, icon, haptic, toast, ask, bar, flame, lineChart, niceDate, shrinkImage, MONTHS } from '../ui.js';
import { EXERCISES, SESSIONS } from '../program.js';
import { header } from './today.js';

export async function load() { S.prog = await call('progress'); }

const shortDate = d => { const [, m, dd] = d.split('-').map(Number); return `${dd} ${MONTHS[m - 1].slice(0, 3)}`; };

export function render() {
  const st = S.st, p = S.prog;
  if (!p) return `${header(st, 'Nəticə')}<p class="pad muted">Yüklənir…</p>`;
  const L = p.level;

  // Bodyweight: weekly weigh-ins + the goal rate as a dashed line from the first one.
  const w = p.weights;
  const wPts = w.map(x => ({ x: shortDate(x.date), y: x.kg }));
  const goal = w.length ? w.map(x => ({ y: w[0].kg - p.goalRate * ((Date.parse(x.date) - Date.parse(w[0].date)) / 6048e5) })) : null;

  const chartFor = ex => {
    const pts = p.trend[ex].map(x => ({ x: shortDate(x.date), y: x.e1rm }));
    return pts.length ? lineChart(pts, { refs: [{ y: p.oldBest[ex], label: `köhnə rekord ${p.oldBest[ex]}` }], unit: '' }) : '<p class="muted small pad">Hələ məlumat yoxdu.</p>';
  };

  // Goal card: start → now → long-term goal, plus the 8-week aim (~1 kg a week).
  const start = p.startWeight, goalW = p.goalWeight;
  const nowW = p.allWeights.length ? p.allWeights[p.allWeights.length - 1].kg : start;
  const lost = Math.round((start - nowW) * 10) / 10;
  const blockAim = Math.round((start - st.cycle.weeks * p.goalRate) * 10) / 10;
  const waistRows = p.waist.slice(-6).reverse();

  return `${header(st, 'Nəticə')}
  <article class="card goal-card">
    <p class="label gold">Hədəf</p>
    <div class="goal-row"><div><b>${kg(start)}</b><span>başlanğıc</span></div><div class="now"><b>${kg(nowW)}</b><span>indi</span></div><div><b>${kg(goalW)}</b><span>hədəf</span></div></div>
    ${bar(Math.max(0, start - nowW), Math.max(1, start - goalW), 'ember thick')}
    <p class="muted small">${lost > 0 ? `${kg(lost)} kq atmısan, qağa` : 'Başdıyırıx'} · ${st.cycle.weeks} həftəlik hədəf ≈ ${kg(blockAim)} kq · uzun hədəf ${kg(goalW)} kq</p>
  </article>

  <article class="card rank-card">
    <div class="row gap center-y">${flame('lg lit gold')}<div class="grow"><p class="label gold">Rütbə</p><h2>${esc(L.rank)} · Səviyyə ${L.level}</h2><p class="muted small">Cəmi ${L.xp} XP</p></div></div>
    ${bar(L.levelXp, L.levelNeed, 'ember thick')}
    <p class="muted tiny">Növbəti səviyyəyə ${L.levelNeed - L.levelXp} XP qalıf</p>
    <ol class="ladder">${p.ranks.map(r => `<li class="${r.name === L.rank ? 'now' : L.level >= r.from ? 'past' : ''}"><b>${esc(r.name)}</b><span>Səviyyə ${r.from}+</span></li>`).join('')}</ol>
  </article>

  <article class="card tracker-card">
    <h3>${p.tracker.length} həftəlik tonqal</h3>
    <p class="muted tiny">Hər məşq bir alov yandırır. Qızılı alov = 80+ xallı gündə məşq.</p>
    <div class="tracker">
      ${p.tracker.map(row => `<div class="t-row ${row.current ? 'current' : ''}"><span class="t-week">${row.week}</span>
        ${row.cells.map(c => `<span class="t-cell" title="${c ? c.date : ''}">${flame(c ? (c.gold ? 'md lit gold' : 'md lit') : 'md')}</span>`).join('')}</div>`).join('')}
    </div>
  </article>

  <article class="card">
    <h3>Bədən çəkisi</h3><p class="muted tiny">Həftədə ən azı 3 dəfə səhər çəkil (B.e, Ç, C). Qrafik həftəlik ortalamanı göstərir · yaşıl qırıq xətt = hədəf (−${p.goalRate} kq/həftə)</p>
    ${lineChart(wPts, { dashed: goal, unit: '' })}
    <div class="row gap tight">
      <label class="field grow"><input id="wkg" type="number" inputmode="decimal" step="0.1" placeholder="104.6" aria-label="Çəki"><span>kq</span></label>
      <button class="btn soft" data-a="logWeight">Yaz</button>
    </div>
    <p class="muted tiny">Və ya bota sadəcə rəqəm göndər: "104.6".</p>
    ${p.allWeights.slice(-5).reverse().map(x => `<div class="list-row"><span class="grow">${niceDate(x.date, st.today)}</span><b>${kg(x.kg)} kq</b><button class="icon-btn small" data-a="delWeight" data-v="${x.date}" aria-label="Sil">${icon.trash}</button></div>`).join('')}
  </article>

  <article class="card">
    <h3>Bel ölçüsü</h3><p class="muted tiny">2 həftədən bir, göbək səviyyəsində, səhər.</p>
    <div class="row gap tight">
      <label class="field grow"><input id="wcm" type="number" inputmode="decimal" step="0.5" placeholder="112" aria-label="Bel, sm"><span>sm</span></label>
      <button class="btn soft" data-a="logWaist">Yaz</button>
    </div>
    ${waistRows.length ? waistRows.map((x, i) => {
      const prev = waistRows[i + 1];
      const d = prev ? Math.round((x.cm - prev.cm) * 10) / 10 : null;
      return `<div class="list-row"><span class="grow">${niceDate(x.date, st.today)}</span>${d != null ? `<span class="muted small">${d > 0 ? '+' : ''}${d}</span>` : ''}<b>${kg(x.cm)} sm</b><button class="icon-btn small" data-a="delWaist" data-v="${x.date}" aria-label="Sil">${icon.trash}</button></div>`;
    }).join('') : '<p class="muted small">Hələ ölçü yoxdu.</p>'}
  </article>

  <article class="card"><h3>Bençpres — təxmini maksimum</h3>${chartFor('bench')}</article>
  <article class="card"><h3>Squat — təxmini maksimum</h3>${chartFor('squat')}</article>

  <article class="card">
    <h3>Ən yaxşı setlər</h3>
    ${Object.keys(p.best).length ? Object.entries(p.best).map(([ex, b]) => `<div class="list-row"><span class="grow">${esc(EXERCISES[ex]?.name || ex)}</span><span class="muted small">${b.date}</span><b>${kg(b.weight)}×${b.reps}</b><span class="chip small">${kg(b.e1rm)}</span></div>`).join('') : '<p class="muted small">Birinci məşqdən sonra burda görünəjək.</p>'}
  </article>

  <article class="card">
    <h3>Son məşqlər</h3>
    ${p.recent.length ? p.recent.map(r => `<div class="list-row"><span class="grow"><b>${esc((SESSIONS.find(x => x.id === r.session) || {}).name || r.session)}</b><small class="muted"> · ${niceDate(r.date, st.today)} · ${r.minutes} dəq · ${r.sets} set</small>${r.notes ? `<em class="muted tiny block">${esc(r.notes)}</em>` : ''}</span><button class="icon-btn small" data-a="delWorkout" data-v="${r.id}" aria-label="Sil">${icon.trash}</button></div>`).join('') : '<p class="muted small">Hələ məşq yoxdu.</p>'}
  </article>

  <article class="card">
    <h3>Proqres şəkilləri</h3><p class="muted tiny">2 həftədən bir: öndən, yannan, arxadan</p>
    <div class="row gap tight">
      <select id="pkind" aria-label="Bucaq"><option>Öndən</option><option>Yandan</option><option>Arxadan</option></select>
      <label class="btn soft grow file-btn">${icon.camera}<span>Şəkil çək / seç</span><input type="file" accept="image/*" data-c="pphoto"></label>
    </div>
    <div class="photos">${p.photos.map(x => `<button class="photo" data-a="viewPhoto" data-v="${x.id}"><img src="${photoUrl(x.file_id)}" alt="${esc(x.caption)}" loading="lazy"><span>${esc(x.caption)} · ${shortDate(x.date)}</span></button>`).join('')}</div>
    ${S.open.photo ? (() => { const x = p.photos.find(y => y.id === S.open.photo); return x ? `<div class="sheet-bg center" data-a="closePhoto"><div class="photo-view"><img src="${photoUrl(x.file_id)}" alt=""><p>${esc(x.caption)} · ${niceDate(x.date, st.today)}</p><div class="row gap"><button class="btn ghost grow" data-a="closePhoto">Bağla</button><button class="btn danger grow" data-a="delPhoto" data-v="${x.id}">Sil</button></div></div></div>` : ''; })() : ''}
  </article>

  <h3 class="section">Nişanlar</h3>
  <div class="badges">${p.badges.map(b => `<div class="badge ${b.earned ? 'earned' : ''}">${flame(b.earned ? 'md lit gold' : 'md')}<b>${esc(b.name)}</b><span>${esc(b.desc)}${b.id === 'bench_goal' || b.id === 'squat_goal' ? ` (${b.target} kq)` : ''}</span>${bar(b.value, b.target, 'gold')}<small>${b.earned ? 'Qazanılıb' : `${kg(b.value)} / ${b.target}`}</small></div>`).join('')}</div>

  <article class="card">
    <h3>XP necə qazanılır</h3>
    <ul class="xp-list">
      <li><span>Günün xalı</span><b>1 xal = 1 XP</b></li><li><span>Məşqi bitir</span><b>+50</b></li><li><span>Yeni rekord set</span><b>+25</b></li>
      <li><span>Çəki yaz</span><b>+20</b></li><li><span>Axşam yoxlaması</span><b>+10</b></li><li><span>Nişan aç</span><b>+100</b></li>
    </ul>
    <p class="muted tiny">Səviyyə L-dən L+1-ə keçmək üçün 200 + 100×L XP lazımdı.</p>
  </article>`;
}

export const actions = {
  async logWaist() {
    const v = parseFloat(String(document.getElementById('wcm').value).replace(',', '.'));
    if (!(v > 50 && v < 200)) return toast('Düz ölçü yaz, qağa (sm)');
    await run(async () => { await call('waist', { date: S.st.today, cm: v }); haptic('ok'); toast('Bel ölçüsü yazıldı'); await load(); app.render(); });
  },
  async delWaist(date) {
    if (!(await ask('Bu ölçünü silək?'))) return;
    await run(async () => { await call('waist_delete', { date }); await load(); app.render(); });
  },
  async logWeight() {
    const v = parseFloat(String(document.getElementById('wkg').value).replace(',', '.'));
    if (!(v > 30 && v < 300)) return toast('Düz çəki yaz, qağa');
    await run(async () => { await call('weight', { date: S.st.today, kg: v }); haptic('ok'); toast('Yazıldı · +20 XP'); await Promise.all([load(), app.refresh(false)]); app.render(); });
  },
  async delWeight(date) {
    if (!(await ask('Bu çəkini silək?'))) return;
    await run(async () => { await call('weight_delete', { date }); await Promise.all([load(), app.refresh(false)]); app.render(); });
  },
  async delWorkout(id) {
    if (!(await ask('Bu məşqi və setlərini silək?'))) return;
    await run(async () => { await call('workout_delete', { id: +id }); await Promise.all([load(), app.refresh(false)]); app.render(); });
  },
  viewPhoto(id) { S.open.photo = +id; app.render(); },
  closePhoto(v, el, e) { if (e && e.target.tagName === 'IMG') return; S.open.photo = null; app.render(); },
  async delPhoto(id) {
    if (!(await ask('Bu şəkli silək?'))) return;
    await run(async () => { await call('photo_delete', { id: +id }); S.open.photo = null; await load(); app.render(); });
  },
};

export const changes = {
  async pphoto(el) {
    if (!el.files[0]) return;
    await run(async () => {
      toast('Şəkil göndərilir…');
      const data = await shrinkImage(el.files[0]);
      await call('photo_upload', { kind: 'progress', date: S.st.today, caption: document.getElementById('pkind').value, data });
      haptic('ok'); toast('Şəkil yadda qaldı');
      await load(); app.render();
    });
  },
};
