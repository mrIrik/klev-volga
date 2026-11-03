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
