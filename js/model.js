// Модель клёва: каждый фактор даёт оценку 0..1, итог — взвешенное гармоническое среднее,
// которое ограничивается сезоном, температурой воды, временем суток и штормом.
import { weatherText, windDirText } from './weather.js';

export const FACTORS = [
  { id: 'season', name: 'Сезон' },
  { id: 'water', name: 'Температура воды' },
  { id: 'pressure', name: 'Уровень давления' },
  { id: 'trend', name: 'Тренд давления' },
  { id: 'tchange', name: 'Перепад температуры' },
  { id: 'wind', name: 'Ветер' },
  { id: 'cloud', name: 'Облачность' },
  { id: 'rain', name: 'Осадки' },
  { id: 'time', name: 'Время суток' },
  { id: 'moon', name: 'Луна' },
];

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const fmt = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('ru-RU');
const signed = (x, d = 1) => (x > 0 ? '+' : x < 0 ? '−' : '±') + fmt(Math.abs(x), d);

function interp(x, xs, ys) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  }
  return ys[ys.length - 1];
}

// Трапеция: 0 до a, рост до b, плато до c, спад до d
function trap(x, [a, b, c, d]) {
  if (x < b) return a === b ? 1 : clamp((x - a) / (b - a));
  if (x > c) return c === d ? 1 : clamp((d - x) / (d - c));
  return 1;
}

function seasonScore(table, lp) {
  const len = new Date(Date.UTC(lp.y, lp.m + 1, 0)).getUTCDate();
  const pos = lp.m + (lp.d - 0.5) / len - 0.5;
  const i0 = Math.floor(pos), f = pos - i0;
  const a = table[(i0 + 12) % 12], b = table[(i0 + 13) % 12];
  return a + (b - a) * f;
}

const MONTHS_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

function timeOfDay(sp, h) {
  const H = 3600;
  const dayStart = h.t - (h.lp.h * H + h.lp.min * 60);
  const sr = h.day ? h.day.sunrise : dayStart + 6 * H;
  const ss = h.day ? h.day.sunset : dayStart + 18 * H;
  const noon = (sr + ss) / 2;
  const T = sp.time;
  const pts = [
    [sr - 2.5 * H, T.night, 'ночь'],
    [sr, T.dawn, 'утренняя заря'],
    [sr + 3 * H, T.morning, 'утро'],
    [noon, T.day, 'день'],
    [ss - 2.5 * H, T.evening, 'вечер'],
    [ss + 0.25 * H, T.dusk, 'вечерняя заря'],
    [ss + 2.5 * H, T.night, 'ночь'],
  ];
  for (let i = 1; i < pts.length; i++) pts[i][0] = Math.max(pts[i][0], pts[i - 1][0] + 600);
  const score = interp(h.t, pts.map(p => p[0]), pts.map(p => p[1]));
  let label = pts[0][2], best = Infinity;
  for (const p of pts) {
    const d = Math.abs(h.t - p[0]);
    if (d < best) { best = d; label = p[2]; }
  }
  if (h.t < sr - 1.2 * H || h.t > ss + 1.5 * H) label = 'ночь';
  return { score, label };
}

function trendText(d3) {
  const a = Math.abs(d3);
  if (a < 0.5) return 'стабильно';
  const speed = a < 1.8 ? 'медленно ' : 'быстро ';
  return speed + (d3 > 0 ? 'растёт' : 'падает');
}

export function effectiveWeights(sp, overrides) {
  return { ...sp.weights, ...(overrides && overrides[sp.id] || {}) };
}

export function scoreHour(sp, h, series, weights) {
  const f = {};
  const name = sp.name.toLowerCase();

  // Сезон
  f.season = {
    score: seasonScore(sp.season, h.lp),
    value: `${MONTHS_PREP[h.lp.m]}`,
  };
  f.season.note = `Сезонная активность ${sp.nameGen} в ${MONTHS_PREP[h.lp.m]} — ${pctWord(f.season.score)}. ${sp.hints.season}`;

  // Температура воды (оценка)
  f.water = { score: trap(h.water, sp.water), value: `≈${fmt(h.water)} °C` };
  f.water.note = `Вода около ${fmt(h.water)} °C (оценка по погоде и климату). Оптимум для ${sp.nameGen} — ${sp.water[1]}–${sp.water[2]} °C.`;

  // Уровень давления относительно нормы для высоты места
  const dev = h.p - series.pNorm;
  const pl = sp.pLevel;
  f.pressure = {
    score: Math.max(0.15, Math.exp(-((dev - pl.mu) ** 2) / (2 * pl.sigma ** 2))),
    value: `${Math.round(h.p)} мм (${signed(dev, 0)})`,
  };
  f.pressure.note = `${Math.round(h.p)} мм рт. ст., норма для этой высоты ≈${Math.round(series.pNorm)}. ${sp.hints.pressure}`;

  // Тренд давления
  const tr = sp.trend;
  let trScore = interp(h.d3, [-3, -1.2, 0, 1.2, 3], [tr.ff, tr.sf, tr.st, tr.sr, tr.fr]);
  const swing = clamp((Math.abs(h.d24) - 6) / 12, 0, 0.45);
  trScore *= 1 - swing;
  f.trend = { score: trScore, value: `${signed(h.d3)} мм/3 ч` };
  f.trend.note = `Давление ${trendText(h.d3)} (${signed(h.d3)} мм за 3 ч, ${signed(h.d24)} за сутки). ${sp.hints.trend}` +
    (swing > 0.05 ? ' Сильный перепад за сутки сбивает рыбу.' : '');

  // Перепад температуры воздуха за сутки
  const eff = h.t24 < 0 ? -h.t24 * 1.3 : h.t24 * 0.8;
  f.tchange = {
    score: 1 - sp.tSens * clamp((eff - 3) / 10, 0, 0.7),
    value: `${signed(h.t24)} °C/сут`,
  };
  f.tchange.note = Math.abs(h.t24) < 3
    ? `Температура воздуха почти не изменилась за сутки (${signed(h.t24)} °C) — рыба не испытывает стресса.`
    : `Воздух ${h.t24 > 0 ? 'потеплел' : 'похолодал'} на ${fmt(Math.abs(h.t24))} °C за сутки. ${h.t24 < 0 ? 'Резкое похолодание угнетает клёв.' : 'Потепление переносится легче похолодания.'}`;

  // Ветер
  let w = trap(h.wind, sp.wind);
  const dirTxt = windDirText(h.dir);
  const east = h.wind > 1.5 && h.dir >= 45 && h.dir <= 135;
  if (east) w *= 0.88;
  if (h.gust > 14) w *= 0.7;
  f.wind = { score: Math.max(0.03, w), value: `${fmt(h.wind)} м/с ${dirTxt}` };
  f.wind.note = `Ветер ${dirTxt} ${fmt(h.wind)} м/с, порывы до ${Math.round(h.gust)} м/с. ${sp.hints.wind}` +
    (east ? ' Восточный ветер по примете ухудшает клёв.' : '') +
    (h.gust > 14 ? ' Сильные порывы мешают ловле.' : '');

  // Облачность
  f.cloud = { score: interp(h.cloud, [0, 50, 100], sp.cloud), value: `${Math.round(h.cloud)}%` };
  f.cloud.note = `${weatherText(h.code)}, облачность ${Math.round(h.cloud)}%. ${sp.hints.cloud}`;

  // Осадки
  f.rain = { score: interp(h.precip, [0, 0.5, 2.5, 6], sp.rain), value: h.precip > 0 ? `${fmt(h.precip)} мм/ч` : 'нет' };
  f.rain.note = (h.precip > 0 ? `Осадки ${fmt(h.precip)} мм за час. ` : 'Без осадков. ') + sp.hints.rain;

  // Время суток
  const tod = timeOfDay(sp, h);
  f.time = { score: tod.score, value: tod.label };
  f.time.note = `Сейчас ${tod.label}. ${sp.hints.time}`;

  // Луна
  f.moon = {
    score: sp.moon[0] + (sp.moon[1] - sp.moon[0]) * h.moon.illum,
    value: `${h.moon.name}, ${Math.round(h.moon.illum * 100)}%`,
  };
  f.moon.note = `${h.moon.name}, освещённость ${Math.round(h.moon.illum * 100)}%. ${sp.hints.moon}`;

  // Сводим: взвешенное гармоническое среднее — плохой фактор тянет итог вниз сильнее,
  // чем хороший вверх
  let sw = 0, inv = 0;
  const factors = FACTORS.map(def => {
    const x = f[def.id];
    const wgt = Math.max(0, +weights[def.id] || 0);
    sw += wgt; inv += wgt / Math.max(0.05, clamp(x.score));
    return { id: def.id, name: def.name, weight: wgt, score: clamp(x.score), value: x.value, note: x.note };
  });
  const base = sw > 0 ? sw / inv : 0;
  const shaped = Math.pow(base, CONTRAST);

  // Лимитирующие факторы: вне сезона, в неподходящей воде или в «не своё» время суток
  // рыба малоактивна, как бы ни была хороша погода
  const gates = GATES
    .filter(g => (+weights[g.id] || 0) > 0)
    .map(g => {
      const s = Math.max(0.03, f[g.id].score);
      return { id: g.id, name: g.name, k: s >= g.thr ? 1 : Math.pow(s / g.thr, 0.8) };
    })
    .filter(g => g.k < 0.98);
  const limiter = gates.reduce((a, g) => a * g.k, 1);
  const storm = h.wind >= 13 || h.gust >= 20;
  const stormK = storm ? 0.55 : 1;
  const pct = Math.round(100 * clamp(shaped * limiter * stormK));

  return { pct, base, shaped, limiter, gates, storm, factors };
}

const CONTRAST = 1.3;
const GATES = [
  { id: 'season', name: 'сезон', thr: 0.6 },
  { id: 'water', name: 'температура воды', thr: 0.6 },
  { id: 'time', name: 'время суток', thr: 0.4 },
];

function pctWord(s) {
  if (s >= 0.85) return 'очень высокая';
  if (s >= 0.65) return 'высокая';
  if (s >= 0.45) return 'средняя';
  if (s >= 0.25) return 'низкая';
  return 'минимальная';
}

export function summarize(res, sp) {
  const active = res.factors.filter(x => x.weight > 0);
  const pos = active.filter(x => x.score >= 0.7).sort((a, b) => b.weight * b.score - a.weight * a.score).slice(0, 3);
  const neg = active.filter(x => x.score < 0.5).sort((a, b) => b.weight * (1 - b.score) - a.weight * (1 - a.score)).slice(0, 3);
  const parts = [];
  if (pos.length) parts.push('Помогают: ' + pos.map(x => x.name.toLowerCase()).join(', ') + '.');
  if (neg.length) parts.push('Мешают: ' + neg.map(x => x.name.toLowerCase()).join(', ') + '.');
  for (const g of res.gates) {
    parts.push(g.id === 'season' ? `Не сезон для ${sp.nameGen}: итог ×${fmt(g.k, 2)}.`
      : g.id === 'water' ? `Температура воды не подходит ${sp.nameDat}: итог ×${fmt(g.k, 2)}.`
      : `Сейчас не время для ${sp.nameGen}: итог ×${fmt(g.k, 2)}.`);
  }
  if (res.storm) parts.push('Штормовой ветер: итог снижен почти вдвое.');
  return { pos, neg, text: parts.join(' ') || 'Все факторы в среднем диапазоне.' };
}

export function verdict(pct) {
  if (pct >= 80) return 'Отличный клёв';
  if (pct >= 60) return 'Хороший клёв';
  if (pct >= 40) return 'Средний клёв';
  if (pct >= 20) return 'Слабый клёв';
  return 'Клёва почти нет';
}

export function scoreColor(pct) {
  if (pct >= 80) return 'var(--s5)';
  if (pct >= 60) return 'var(--s4)';
  if (pct >= 40) return 'var(--s3)';
  if (pct >= 20) return 'var(--s2)';
  return 'var(--s1)';
}
