// ============================================================
//  THE PROGRAM — edit this file to change the plan.
//  Nothing else in the app needs to change.
//
//  Exercise fields:
//    sets      base number of sets (re-entry weeks cap it at 3, supersets at 2)
//    setsBuild sets during build weeks (only on the first lift)
//    reps      [min, max] rep range for double progression
//    rest      seconds of rest after a set
//    start     starting weight in kg (first time only)
//    step      how much to add when every set hits the top of the range
//    ss        superset group: exercises with the same ss number are done back-to-back;
//              only the last one in the group starts the rest timer
// ============================================================

export const EXERCISES = {
  bench: {
    name: 'Ştanqla bençpres', equip: 'barbell', img: 'bench',
    log: 'Ştanq + disklər (ştanq 20 kq)',
    cues: ['Kürəkləri arxaya-aşağı sıx, döşü qaldır', 'Ştanqı döşün aşağısına endir, dirsəklər 45°', 'Ayaxları yerə bərk bas, ombanı skamyadan qaldırma'],
    video: 'barbell bench press form',
  },
  squat: {
    name: 'Ştanqla squat', equip: 'barbell', img: 'squat',
    log: 'Ştanq + disklər (ştanq 20 kq)',
    cues: ['3 saniyəyə aşağı en, döşü dik saxla', 'Dizlər barmaxların istiqamətində, içəri yığılmasın', 'Dabanınnan it, ayağın ortasına bas', 'Qarnı brace elə — nəfəs al, sıx, en'],
    video: 'barbell back squat form beginner',
  },
  pulldown: {
    name: 'Geniş tutuşla yuxarıdan çəkiş', equip: 'cable', img: 'pulldown',
    log: 'Blokun rəqəmi (kq)',
    cues: ['Dirsəkləri aşağı-arxaya çək, qolnan yox', 'Qolu döşün yuxarısına gətir, bədəni yelləmə', 'Yuxarıda tam açıl, kürəyi dart'],
    video: 'wide grip lat pulldown form',
  },
  legcurl: {
    name: 'Uzanaraq ayaq bükmə', equip: 'machine', img: 'legcurl',
    log: 'Blokun rəqəmi (kq)',
    cues: ['Ombanı yastığa bas, qaldırma', 'Yuxarıda 1 saniyə saxla', 'Yavaş-yavaş endir'],
    video: 'lying leg curl form',
  },
  ezcurl: {
    name: 'EZ ştanqla biseps', equip: 'barbell', img: 'ezcurl',
    log: 'Ştanq + disklər (EZ ştanq ~10 kq)',
    cues: ['Dirsəklər bədənə yapışıx qalsın', 'Bədənnən yelləmə, təmiz qaldır', 'Aşağıda tam aç'],
    video: 'ez bar curl form',
  },
  pushdown: {
    name: 'İpnən triseps (aşağı)', equip: 'cable', img: 'pushdown',
    log: 'Blokun rəqəmi (kq)',
    cues: ['Dirsəklər yerində dursun', 'Aşağıda ipi yanlara aç', 'Yuxarı qayıdanda yavaş'],
    video: 'rope triceps pushdown form',
  },
  inclinedb: {
    name: 'Maili skamyada hantel pres', equip: 'dumbbell', img: 'inclinedb',
    log: 'Bir hantelin çəkisi',
    cues: ['Skamya 30°, çox dik olmasın', 'Hantelləri döşün yuxarısına endir', 'Yuxarıda hantellər toxunmasın, nəzarət elə'],
    video: 'incline dumbbell press form',
  },
  legpress: {
    name: 'Ayax presi', equip: 'plate', img: 'legpress',
    log: 'Ancax disklər (kizəyi sayma)',
    cues: ['Belin yastıxdan qalxmasın', 'Dizlər 90°-dən aşağı ensin', 'Yuxarıda dizi tam kilitləmə'],
    video: 'leg press form',
  },
  tbarrow: {
    name: 'Döş dayaqlı T-çəkiş', equip: 'plate', img: 'tbarrow',
    log: 'Ancax disklər',
    cues: ['Döşü yastığa bas', 'Dirsəkləri arxaya çək, kürəkləri sıx', 'Yavaş endir, tam dart'],
    video: 'chest supported t bar row form',
  },
  hipthrust: {
    name: 'Ştanqla omba itələmə', equip: 'barbell', img: 'hipthrust',
    log: 'Ştanq + disklər (ştanq 20 kq)',
    cues: ['Kürəyin yuxarısı skamyada, çənə aşağı', 'Yuxarıda ombanı sıx, beli əymə', 'Dabanlarnan it'],
    video: 'barbell hip thrust form',
  },
  latraise: {
    name: 'Hantelnən yana qaldırma', equip: 'dumbbell', img: 'latraise',
    log: 'Bir hantelin çəkisi',
    cues: ['Çiyin hündürlüyünə qədər qaldır, artıx yox', 'Dirsək azca bükük', 'Yellətmə — yüngül götür, təmiz elə'],
    video: 'dumbbell lateral raise form',
  },
  crunch: {
    name: 'Kabelnən krança', equip: 'cable', img: 'crunch',
    log: 'Blokun rəqəmi (kq)',
    cues: ['Diz üstə, ipi başın yanında tut', 'Qarnınnan bük, qolnan çəkmə', 'Aşağıda 1 saniyə sıx'],
    video: 'kneeling cable crunch form',
  },
  dbbench: {
    name: 'Hantelnən bençpres', equip: 'dumbbell', img: 'dbbench',
    log: 'Bir hantelin çəkisi',
    cues: ['Kürəkləri sıx, döşü qaldır', 'Hantelləri döşün yanına endir', 'Yuxarıda bir-birinə yaxınlaşdır'],
    video: 'dumbbell bench press form',
  },
  cablerow: {
    name: 'Oturaraq kabel çəkişi', equip: 'cable', img: 'cablerow',
    log: 'Blokun rəqəmi (kq)',
    cues: ['Belin düz, dik otur', 'Dirsəkləri arxaya çək, kürəkləri sıx', 'Qabağa gedəndə kürəyi dart, beli bükmə'],
    video: 'seated cable row form',
  },
  shoulderpress: {
    name: 'Trenajorda çiyin presi', equip: 'machine', img: 'shoulderpress',
    log: 'Blokun rəqəmi (kq)',
    cues: ['Kürəyi söykənəcəyə bas', 'Dirsəklər azca qabaxda', 'Yuxarıda tam kilitləmə, yavaş endir'],
    video: 'machine shoulder press form',
  },
  backext: {
    name: '45° bel açma', equip: 'bodyweight', img: 'backext',
    log: 'Əlində tutduğun disk (yoxdusa 0)',
    cues: ['Ombadan bük, beli yox', 'Yuxarıda bədən düz xətt, artıx açılma', 'Asanlaşanda döşündə disk tut'],
    video: '45 degree back extension form',
  },
  hammer: {
    name: 'Hantelnən çəkic biseps', equip: 'dumbbell', img: 'hammer',
    log: 'Bir hantelin çəkisi',
    cues: ['Ovuclar bir-birinə baxsın', 'Dirsəklər yerində', 'Yavaş endir'],
    video: 'dumbbell hammer curl form',
  },
  ohtri: {
    name: 'Baş üstünnən ipnən triseps', equip: 'cable', img: 'ohtri',
    log: 'Blokun rəqəmi (kq)',
    cues: ['Arxanı bloka çevir, bir ayax qabaxda', 'Dirsəklər qulağın yanında qalsın', 'Tam aç, yavaş qayıt'],
    video: 'overhead cable triceps extension rope form',
  },
  calf: {
    name: 'Ayaq üstə baldır qaldırma', equip: 'machine', img: 'calf',
    log: 'Blokun rəqəmi (kq)',
    cues: ['Aşağıda tam dart', 'Yuxarıda 1 saniyə saxla', 'Yaylanma — yavaş elə'],
    video: 'standing calf raise machine form',
  },
};

export const SESSIONS = [
  {
    id: 'A', name: 'Bütün bədən A', focus: 'Bençpres günü',
    warmup: {
      cardio: '5 dəq yüngül velosiped',
      drills: ['Lentnən pull-apart ×15', 'Push-up plus ×10', 'Döş fırlatma ×8 hər tərəf', 'Bədən çəkisiynən squat ×10'],
    },
    exercises: [
      { key: 'bench', sets: 3, setsBuild: 4, reps: [5, 7], rest: 180, start: 72.5, step: 2.5 },
      { key: 'squat', sets: 3, reps: [6, 8], rest: 150, start: 40, step: 5 },
      { key: 'pulldown', sets: 3, reps: [8, 12], rest: 120, start: 55, step: 5 },
      { key: 'legcurl', sets: 3, reps: [10, 15], rest: 90, start: 30, step: 5 },
      { key: 'ezcurl', sets: 3, reps: [10, 15], rest: 0, start: 25, step: 2.5, ss: 1 },
      { key: 'pushdown', sets: 3, reps: [10, 15], rest: 75, start: 25, step: 2.5, ss: 1 },
    ],
    cooldown: ['Qapı ağzında döş açma 30 san/tərəf', 'Stoykada kürək dartma 30 san/tərəf', 'Diz üstə omba qabağı (couch) 45 san/tərəf', 'Oturaraq arxa bud dartma 45 san'],
  },
  {
    id: 'B', name: 'Bütün bədən B', focus: 'Həcm günü',
    warmup: {
      cardio: '5 dəq avarçəkmə trenajoru',
      drills: ['Lentnən çiyin fırlatma ×10', 'Kürək push-up ×10', 'Omba körpüsü ×12', 'Ayax yelləmə ×10 hər tərəf'],
    },
    exercises: [
      { key: 'inclinedb', sets: 3, setsBuild: 4, reps: [8, 12], rest: 120, start: 26, step: 2 },
      { key: 'legpress', sets: 3, reps: [10, 15], rest: 120, start: 80, step: 10 },
      { key: 'tbarrow', sets: 3, reps: [8, 12], rest: 120, start: 40, step: 5 },
      { key: 'hipthrust', sets: 3, reps: [8, 12], rest: 120, start: 50, step: 5 },
      { key: 'latraise', sets: 3, reps: [12, 20], rest: 60, start: 8, step: 1 },
      { key: 'crunch', sets: 3, reps: [12, 15], rest: 60, start: 30, step: 5 },
    ],
    cooldown: ['Divarda döş dartma 30 san/tərəf', 'Uşax pozası, qollar qabaxda 45 san', 'Fiqur-4 omba dartma 30 san/tərəf', 'Ayax üstə bud qabağı dartma 30 san/tərəf'],
    cardio: true,
  },
  {
    id: 'C', name: 'Bütün bədən C', focus: 'Squat günü',
    warmup: {
      cardio: '5 dəq maili yeriş',
      drills: ['Omba fırlatma ×10', 'Goblet squat saxlama 30 san', '"Ən yaxşı dartma" ×5 hər tərəf', 'Kazak squat ×6 hər tərəf'],
    },
    exercises: [
      { key: 'squat', sets: 3, setsBuild: 4, reps: [6, 8], rest: 150, start: 40, step: 5 },
      { key: 'dbbench', sets: 3, reps: [8, 12], rest: 120, start: 30, step: 2 },
      { key: 'cablerow', sets: 3, reps: [10, 12], rest: 90, start: 50, step: 5 },
      { key: 'shoulderpress', sets: 3, reps: [8, 12], rest: 120, start: 35, step: 5 },
      { key: 'backext', sets: 3, reps: [10, 15], rest: 90, start: 0, step: 5 },
      { key: 'hammer', sets: 3, reps: [10, 15], rest: 0, start: 12, step: 2, ss: 1 },
      { key: 'ohtri', sets: 3, reps: [10, 15], rest: 75, start: 20, step: 2.5, ss: 1 },
      { key: 'calf', sets: 3, reps: [10, 15], rest: 60, start: 40, step: 5 },
    ],
    cooldown: ['Göyərçin dartması 45 san/tərəf', 'Ayax üstə bud qabağı 30 san/tərəf', 'Oturaraq arxa bud 45 san', 'Dizləri döşə çək 45 san'],
    cardio: true,
  },
];

// Phases by week. sets(ex, i) decides how many sets an exercise gets.
export const PHASES = {
  reentry: { name: 'Qayıdış', rir: '3', note: 'Yüngül başdıyırıx: hər hərəkət 3 set, 3 təkrar ehtiyatda saxla.' },
  build1: { name: 'Güc yığırıx', rir: '1–2', note: 'Birinci hərəkət 4 set. Son setdə 1–2 təkrar ehtiyat qalsın.' },
  deload: { name: 'Nəfəs dərmə', rir: '4', note: 'Çəki eyni, setlər yarı. Bədən dincəlsin, qağa.' },
  build2: { name: 'Güc yığırıx II', rir: '1–2', note: 'Yenə 4 set. Kiçik hərəkətlərdə son set az qala tükənməyə qədər.' },
  test: { name: 'Sınax + dincəlmə', rir: '0–1', note: 'Birinci hərəkətdə ağır set: 3–5 təkrar. Qalanı yarı set.' },
};

export function setsFor(ex, index, phaseId) {
  const base = ex.sets;
  if (phaseId === 'reentry') return ex.ss ? 2 : Math.min(base, 3);
  if (phaseId === 'deload' || phaseId === 'test') return Math.ceil(base / 2);
  return index === 0 && ex.setsBuild ? ex.setsBuild : (ex.ss ? Math.min(base, 3) : base);
}

// Ramp-up sets before the first lift, from today's working weight.
export function rampUp(exKey, working) {
  const ex = EXERCISES[exKey];
  const out = [];
  const round = (w, to) => Math.max(0, Math.round(w / to) * to);
  if (ex.equip === 'barbell') {
    out.push({ weight: 20, reps: 10, label: 'Boş ştanq' });
    for (const [p, r] of [[0.5, 5], [0.7, 3], [0.85, 1]]) {
      const w = round(working * p, 2.5);
      if (w > (out[out.length - 1]?.weight || 0)) out.push({ weight: w, reps: r, label: `${Math.round(p * 100)}%` });
    }
  } else if (ex.equip === 'dumbbell') {
    for (const [p, r] of [[0.5, 8], [0.7, 4], [0.85, 1]]) out.push({ weight: round(working * p, 2), reps: r, label: `${Math.round(p * 100)}%` });
  } else {
    for (const [p, r] of [[0.5, 8], [0.7, 4]]) out.push({ weight: round(working * p, 5), reps: r, label: `${Math.round(p * 100)}%` });
  }
  return out;
}
