// "Yemək" — fast food logging: presets, "something else", water, day arrows.
import { S, app, run } from '../store.js';
import { call, photoUrl } from '../api.js';
import { esc, icon, haptic, toast, ask, bar, niceDate, addDays, shrinkImage } from '../ui.js';
import { header, waterBlock } from './today.js';

export async function load() {
  S.foodDate ||= S.st.today;
  S.day = await call('day', { date: S.foodDate });
}

export function render() {
  const st = S.st, s = st.settings, d = S.day;
  if (!d) return `${header(st, 'Yemək')}<p class="pad muted">Yüklənir…</p>`;
  const kT = d.kcalTarget || s.kcal;
  const kcal = d.meals.reduce((a, m) => a + m.kcal, 0), prot = d.meals.reduce((a, m) => a + m.protein, 0);
  const target = s.water; // past days: plain target (today uses the server value incl. the training bonus)
  const isToday = d.date === st.today;
  const editing = S.open.presets;
  return `${header(st, 'Yemək')}
  <div class="day-nav">
    <button class="icon-btn" data-a="prevDay" aria-label="Əvvəlki gün">${icon.left}</button>
    <b>${niceDate(d.date, st.today)}</b>
    <button class="icon-btn" data-a="nextDay" aria-label="Sonrakı gün" ${isToday ? 'disabled' : ''}>${icon.right}</button>
  </div>

  <article class="card">
    <p class="label">${d.trainDay ? 'Məşq günü' : 'İstirahət günü'} · hədəf ${kT} kkal</p>
    <div class="meter"><span>Kalori</span><b>${kcal} / ${kT}</b></div>${bar(kcal, kT, kcal > kT * 1.1 ? 'over' : 'gold')}
    <div class="meter"><span>Zülal</span><b>${prot} / ${s.protein} q</b></div>${bar(prot, s.protein, 'red')}
    <p class="strong small">${kcal < kT || prot < s.protein ? `Hələ ${Math.max(0, kT - kcal)} kkal, ${Math.max(0, s.protein - prot)} q zülal qalıf` : 'Hədəf tamamdı, qağa!'}</p>
    <hr>
    ${waterBlock(d.water, isToday ? st.score.waterTarget : target, d.date)}
  </article>

  ${menuCard(st, d)}

  <article class="card plate">
    <p class="label gold">Boşqab qaydası</p>
    <p class="small"><b>2 ovuc</b> zülal (balıx, ət, yumurta) · <b>1–2 yumruq</b> düyü/kartof · boşqabın <b>yarısı</b> tərəvəz · <b>1 baş barmax</b> yağ. Məşqdən sonra karbohidrat 2 yumruq ola bilər.</p>
  </article>

  <div class="row between section"><h3>Bir toxunuşla</h3><button class="link" data-a="togglePresets">${editing ? 'Hazırdı' : `${icon.edit} Düzəlt`}</button></div>
  ${editing ? `<article class="card">
      ${st.presets.map((p, i) => `<div class="preset-edit">
        <input value="${esc(p.name)}" data-c="pname" data-i="${i}" aria-label="Ad">
        <label class="field"><input type="number" inputmode="numeric" value="${p.kcal}" data-c="pkcal" data-i="${i}" aria-label="Kalori"><span>kkal</span></label>
        <label class="field"><input type="number" inputmode="numeric" value="${p.protein}" data-c="pprot" data-i="${i}" aria-label="Zülal"><span>q</span></label>
      </div>`).join('')}
      <button class="btn full" data-a="savePresets">Yadda saxla</button>
    </article>` : `<div class="presets">
      ${st.presets.map(p => `<button class="preset" data-a="preset" data-v="${esc(p.id)}"><b>${esc(p.name)}</b><span>${p.kcal} kkal · ${p.protein} q</span></button>`).join('')}
    </div>`}

  <article class="card">
    <h3>Başqa bir şey</h3>
    <div class="form">
      <input id="m-name" placeholder="Nə yedin?" aria-label="Ad">
      <div class="row gap tight">
        <label class="field grow"><input id="m-kcal" type="number" inputmode="numeric" placeholder="0" aria-label="Kalori"><span>kkal</span></label>
        <label class="field grow"><input id="m-prot" type="number" inputmode="numeric" placeholder="0" aria-label="Zülal"><span>q zülal</span></label>
      </div>
      <input id="m-comment" placeholder="Qeyd: məs. toyux yox idi, balıx yedim" aria-label="Qeyd">
      <label class="btn ghost file-btn">${icon.camera}<span id="m-photo-label">Şəkil əlavə elə (istəsən)</span><input id="m-photo" type="file" accept="image/*" data-c="mphoto"></label>
      <button class="btn fire full" data-a="addCustom">Yaz</button>
    </div>
  </article>

  <h3 class="section">${niceDate(d.date, st.today)} yazılanlar</h3>
  ${d.meals.length ? `<article class="card">${d.meals.map(m => S.open.meal === m.id ? `
    <div class="meal-edit">
      <input value="${esc(m.name)}" id="e-name" aria-label="Ad">
      <div class="row gap tight">
        <label class="field grow"><input id="e-kcal" type="number" inputmode="numeric" value="${m.kcal}" aria-label="Kalori"><span>kkal</span></label>
        <label class="field grow"><input id="e-prot" type="number" inputmode="numeric" value="${m.protein}" aria-label="Zülal"><span>q</span></label>
      </div>
      <input value="${esc(m.comment || '')}" id="e-comment" placeholder="Qeyd" aria-label="Qeyd">
      <div class="row gap tight"><button class="btn ghost" data-a="delMeal" data-v="${m.id}">${icon.trash}</button><button class="btn ghost grow" data-a="editMeal" data-v="">Bağla</button><button class="btn grow" data-a="saveMeal" data-v="${m.id}">Saxla</button></div>
    </div>` : `
    <button class="meal" data-a="editMeal" data-v="${m.id}">
      ${m.photo_id ? `<img src="${photoUrl(m.photo_id)}" alt="" loading="lazy">` : ''}
      <span class="grow"><b>${esc(m.name)}</b>${m.comment ? `<em>${esc(m.comment)}</em>` : ''}<small>${esc(m.time || '')}</small></span>
      <span class="meal-n">${m.kcal} kkal<small>${m.protein} q</small></span>
    </button>`).join('')}</article>` : '<p class="muted center pad">Hələ heç nə yazılmıyıf.</p>'}`;
}

// The day's meal plan (gym day vs rest day), one tap each. Times match the bot reminders.
function menuCard(st, d) {
  const kind = d.trainDay ? 'train' : 'rest';
  const rows = [
    ['07:00', 'coffee', 'Su 300–500 ml + qara kofe (yumurta — istəsən)'],
    ['12:30', `lunch_${kind}`, null],
    ['16:30', `snack_${kind}`, null],
    ['16:30', 'shake', 'Protein kokteyli: whey 30 q + su'],
    ['20:00', `dinner_${kind}`, null],
  ];
  const done = new Set(d.meals.map(m => m.preset));
  return `<article class="card menu">
    <p class="label gold">Bu günün menyusu · ${d.trainDay ? 'məşq günü' : 'istirahət günü'}</p>
    ${rows.map(([time, id, text]) => {
      const p = st.presets.find(x => x.id === id);
      if (!p) return '';
      const on = done.has(id);
      return `<button class="check-row ${on ? 'on' : ''}" data-a="${on ? 'noop' : 'preset'}" data-v="${esc(id)}" aria-pressed="${on}">
        <span class="check">${on ? icon.check : ''}</span><span class="menu-time">${time}</span>
        <span class="grow">${esc(text || p.name.replace(/^[^:]*:\s*/, ''))}</span><span class="muted small">${p.kcal}</span></button>`;
    }).join('')}
    <p class="muted tiny">Cəmi ≈ ${rows.reduce((a, [, id]) => a + ((st.presets.find(x => x.id === id) || {}).kcal || 0), 0)} kkal · kreatin + vitaminlər naharnan.</p>
  </article>`;
}

let pendingPhoto = null;
export const actions = {
  noop() { toast('Artıq yazılıb ✓'); },
  async prevDay() { S.foodDate = addDays(S.day.date, -1); await run(load); app.render(); },
  async nextDay() { if (S.day.date >= S.st.today) return; S.foodDate = addDays(S.day.date, 1); await run(load); app.render(); },
  async preset(id) {
    haptic('ok');
    await run(async () => {
      await call('meal_preset', { preset: id, date: S.day.date });
      const p = S.st.presets.find(x => x.id === id);
      toast(`${p.name} yazıldı`);
      await Promise.all([load(), app.refresh(false)]); app.render();
    });
  },
  togglePresets() { S.open.presets = !S.open.presets; app.render(); },
  async savePresets() {
    await run(async () => { await call('presets_save', { presets: S.st.presets }); S.open.presets = false; toast('Yadda qaldı'); await app.refresh(); });
  },
  async addCustom() {
    const name = document.getElementById('m-name').value.trim();
    const kcal = +document.getElementById('m-kcal').value || 0, protein = +document.getElementById('m-prot').value || 0;
    const comment = document.getElementById('m-comment').value.trim();
    if (!name) return toast('Adını yaz, qağa');
    await run(async () => {
      let photo_id = null;
      if (pendingPhoto) {
        toast('Şəkil göndərilir…');
        const r = await call('photo_upload', { kind: 'meal', date: S.day.date, caption: name, data: pendingPhoto });
        photo_id = r.file_id; pendingPhoto = null;
      }
      await call('meal_add', { date: S.day.date, name, kcal, protein, comment, photo_id });
      haptic('ok'); toast('Yazıldı');
      await Promise.all([load(), app.refresh(false)]); app.render();
    });
  },
  editMeal(id) { S.open.meal = id ? +id : null; app.render(); },
  async saveMeal(id) {
    await run(async () => {
      await call('meal_update', { id: +id, name: document.getElementById('e-name').value, kcal: +document.getElementById('e-kcal').value, protein: +document.getElementById('e-prot').value, comment: document.getElementById('e-comment').value });
      S.open.meal = null; await Promise.all([load(), app.refresh(false)]); app.render();
    });
  },
  async delMeal(id) {
    if (!(await ask('Bu yeməyi silək?'))) return;
    await run(async () => { await call('meal_delete', { id: +id }); S.open.meal = null; await Promise.all([load(), app.refresh(false)]); app.render(); });
  },
  async water(delta, el) {
    haptic();
    await run(async () => { await call('water', { date: el.dataset.d || S.st.today, delta: +delta }); await Promise.all([load(), app.refresh(false)]); app.render(); });
  },
};

export const changes = {
  pname(el) { S.st.presets[+el.dataset.i].name = el.value; },
  pkcal(el) { S.st.presets[+el.dataset.i].kcal = +el.value; },
  pprot(el) { S.st.presets[+el.dataset.i].protein = +el.value; },
  async mphoto(el) {
    if (!el.files[0]) return;
    pendingPhoto = await shrinkImage(el.files[0]);
    document.getElementById('m-photo-label').textContent = 'Şəkil hazırdı ✓';
  },
};
