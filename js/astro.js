// Фаза луны по синодическому месяцу (точность ~ несколько часов — для клёва достаточно)
const SYNODIC = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14) / 1000;

export function moonInfo(unix) {
  const days = (unix - NEW_MOON_REF) / 86400;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const angle = (2 * Math.PI * age) / SYNODIC;
  const illum = (1 - Math.cos(angle)) / 2;
  const waxing = age < SYNODIC / 2;
  return { age, illum, waxing, angle, name: phaseName(age) };
}

function phaseName(age) {
  const names = ['Новолуние', 'Молодая луна', 'Первая четверть', 'Растущая луна',
    'Полнолуние', 'Убывающая луна', 'Последняя четверть', 'Старая луна'];
  const idx = Math.floor(((age + SYNODIC / 16) % SYNODIC) / (SYNODIC / 8));
  return names[idx];
}

// Векторная иконка фазы (северное полушарие: растущая освещена справа)
export function moonSvg(m, size = 22) {
  const r = 10, c = 12;
  const k = Math.cos(m.angle);
  const rx = Math.abs(k) * r;
  const outer = m.waxing ? 1 : 0;
  const inner = m.waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
  const lit = m.illum < 0.01 ? '' :
    `<path d="M${c} ${c - r} A${r} ${r} 0 0 ${outer} ${c} ${c + r} A${rx.toFixed(2)} ${r} 0 0 ${inner} ${c} ${c - r}Z" fill="#f4e7b0"/>`;
  return `<svg class="moon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="${c}" cy="${c}" r="${r}" fill="#3a4654"/>${lit}
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width=".8"/></svg>`;
}

// Восход и закат (уравнение восхода, точность ~1–2 мин) для календарной даты, unix-секунды
export function sunTimes(y, m, d, lat, lon) {
  const rad = Math.PI / 180;
  const J = Date.UTC(y, m, d, 12) / 86400000 + 2440587.5;
  const n = Math.round(J - 2451545 - 0.0009 - lon / 360);
  const Jstar = 2451545 + 0.0009 + n - lon / 360;
  const M = ((357.5291 + 0.98560028 * (Jstar - 2451545)) % 360 + 360) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const L = (M + C + 180 + 102.9372) % 360;
  const transit = Jstar + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
  const decl = Math.asin(Math.sin(L * rad) * Math.sin(23.44 * rad));
  const cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
  const w = Math.acos(Math.max(-1, Math.min(1, cosW))) / rad;
  const toUnix = jd => Math.round((jd - 2440587.5) * 86400);
  return { rise: toUnix(transit - w / 360), set: toUnix(transit + w / 360) };
}
