// Small UI helpers shared by all screens: escaping, toasts, confirm sheet, haptics, icons, charts.

export const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtL = ml => (ml / 1000).toFixed(ml % 1000 ? (ml % 100 ? 2 : 1) : 1);
export const kg = w => (Math.round(w * 10) / 10).toString();
export const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
export const WD = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'];
export const niceDate = (d, today) => {
  if (d === today) return 'Bu gün';
  const [, m, dd] = d.split('-').map(Number);
  return `${dd} ${MONTHS[m - 1]}`;
};
export const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

export function haptic(kind = 'light') {
  try {
    const h = tg && tg.HapticFeedback;
    if (!h) return;
    if (kind === 'ok' || kind === 'error' || kind === 'warning') h.notificationOccurred(kind === 'ok' ? 'success' : kind);
    else if (kind === 'select') h.selectionChanged();
    else h.impactOccurred(kind);
  } catch { /* old Telegram */ }
}

export function toast(msg, ms = 2200) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// In-app confirm sheet (native confirm() is blocked in some webviews).
export function ask(msg, okText = 'Sil', danger = true) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'sheet-bg';
    el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><p class="sheet-msg">${esc(msg)}</p>
      <div class="row gap"><button class="btn ghost grow" data-r="0">Ləğv elə</button>
      <button class="btn grow ${danger ? 'danger' : ''}" data-r="1">${esc(okText)}</button></div></div>`;
    const close = v => { el.classList.add('out'); setTimeout(() => el.remove(), 200); resolve(v); };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (b) close(b.dataset.r === '1'); else if (e.target === el) close(false);
    });
    document.body.appendChild(el); haptic();
  });
}

// A centred celebration card (new best, level up, badge).
export function celebrate(title, text) {
  const el = document.createElement('div');
  el.className = 'sheet-bg center';
  el.innerHTML = `<div class="sheet celebrate">${flame('xl lit')}<h2>${esc(title)}</h2><p>${esc(text)}</p><button class="btn" data-r="1">Halaldı!</button></div>`;
  el.addEventListener('click', e => { if (e.target.closest('[data-r]') || e.target === el) el.remove(); });
  document.body.appendChild(el); haptic('ok');
}

/* ---------- icons (stroke SVG, no emoji) ---------- */
const svg = (d, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const icon = {
  flame: svg('<path d="M12 3c.5 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2.3 1.3-3.8 2.4-4.8.1 1.5.8 2.6 1.8 3-.4-2.4-.2-5.3.3-7.7z"/>'),
  dumbbell: svg('<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>'),
  bowl: svg('<path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3"/>'),
  chart: svg('<path d="M4 19h16M7 15l4-5 3 3 5-7"/>'),
  more: svg('<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>'),
  music: svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  left: svg('<path d="M15 5l-7 7 7 7"/>'),
  right: svg('<path d="M9 5l7 7-7 7"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  play: svg('<path d="M7 5l12 7-12 7z"/>'),
  skip: svg('<path d="M5 5l10 7-10 7zM19 5v14"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  bell: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  water: svg('<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>'),
  pill: svg('<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="M10 7.5l4 9"/>'),
  video: svg('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>'),
};

// The flame used for the logo, the 12-week tracker and celebrations.
// cls: 'lit' (burning), 'gold' (special day), '' (empty outline); sizes: sm / md / lg / xl
export function flame(cls = '') {
  return `<svg class="flame ${cls}" viewBox="0 0 24 32" aria-hidden="true">
    <path class="f-out" d="M12 1.5c1 5 8 8.5 8 17a8 8 0 0 1-16 0c0-4 2.2-6.6 4.2-8.3.2 2.6 1.4 4.4 3.1 5.1C10.6 11 11 5.8 12 1.5z"/>
    <path class="f-in" d="M12 14c.6 2.4 4 3.8 4 7.6a4 4 0 0 1-8 0c0-2 1-3.1 2-3.9.2 1.1.7 1.9 1.4 2.2-.3-1.6-.1-3.9.6-5.9z"/>
  </svg>`;
}

// A row of small flames used as a decorative border (replaces the carpet stripe).
export const flameStrip = () => `<div class="flame-strip" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => flame(i % 3 === 1 ? 'sm lit gold' : 'sm lit')).join('')}</div>`;

// Score / progress ring.
export function ring(value, max, size = 104, label = '') {
  const r = size / 2 - 9, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, value / max));
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label || value + ' / ' + max)}">
    <defs><linearGradient id="emb${size}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="var(--red)"/><stop offset="1" stop-color="var(--gold)"/></linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="10"/>
    <circle class="ring-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#emb${size})" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" style="--c:${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="${size / 2 + 2}" text-anchor="middle" class="ring-num">${Math.round(value)}</text>
    <text x="50%" y="${size / 2 + 20}" text-anchor="middle" class="ring-sub">/ ${max}</text>
  </svg>`;
}

export const bar = (value, max, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, (value / max) * 100))}%"></i></div>`;

// Simple line chart: points [{x: label, y}] plus optional dashed reference lines [{y, label}] or a dashed series.
export function lineChart(points, { refs = [], dashed = null, unit = '' } = {}) {
  if (points.length < 1) return `<p class="muted center pad">Hələ məlumat yoxdu.</p>`;
  const W = 340, H = 160, L = 38, R = 12, T = 14, B = 24;
  const ys = points.map(p => p.y).concat(refs.map(r => r.y)).concat(dashed ? dashed.map(p => p.y) : []);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 2) { max += 1; min -= 1; }
  const pad = (max - min) * 0.08; min -= pad; max += pad;
  const n = Math.max(points.length, dashed ? dashed.length : 0);
  const x = i => L + (n === 1 ? (W - L - R) / 2 : i * (W - L - R) / (n - 1));
  const y = v => T + (max - v) * (H - T - B) / (max - min);
  const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="qrafik">
    <text x="4" y="${y(max - pad) + 4}">${kg(max - pad)}${unit}</text><text x="4" y="${y(min + pad) + 4}">${kg(min + pad)}${unit}</text>
    <line x1="${L}" x2="${W - R}" y1="${y(max - pad)}" y2="${y(max - pad)}" class="grid"/><line x1="${L}" x2="${W - R}" y1="${y(min + pad)}" y2="${y(min + pad)}" class="grid"/>
    ${refs.map(r => `<line x1="${L}" x2="${W - R}" y1="${y(r.y)}" y2="${y(r.y)}" class="ref"/><text x="${W - R}" y="${y(r.y) - 4}" text-anchor="end" class="ref-t">${esc(r.label)}</text>`).join('')}
    ${dashed ? `<path d="${path(dashed)}" class="goal"/>` : ''}
    <path d="${path(points)}" class="line"/>
    ${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.y)}" r="3.5" class="dot"/>`).join('')}
    <text x="${L}" y="${H - 6}">${esc(points[0].x)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${esc(points[points.length - 1].x)}</text>
  </svg>`;
}

// Shrink an image file in the browser before upload; returns base64 JPEG (no prefix).
export function shrinkImage(file, max = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = reject; img.src = url;
  });
}

export function openLink(url) {
  if (!url) return;
  if (tg && tg.openLink) tg.openLink(url); else window.open(url, '_blank', 'noopener');
}
