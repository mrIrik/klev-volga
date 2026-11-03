// Виды рыб: параметры моделей, подсказки и векторные иллюстрации
//
// season  — активность по месяцам (янв..дек), 0..1
// water   — трапеция по температуре воды [мин, начало оптимума, конец оптимума, макс], °C
// pLevel  — предпочтительное отклонение давления от нормы (mu) и допуск (sigma), мм
// trend   — оценка при изменении давления за 3 ч: ff −3 мм, sf −1.2, st 0, sr +1.2, fr +3
// wind    — трапеция по скорости ветра, м/с
// cloud   — оценка при облачности 0%, 50%, 100%
// rain    — оценка при осадках 0, 0.5, 2.5, 6 мм/ч
// time    — активность в разные части суток
// moon    — оценка в новолуние и в полнолуние
// tSens   — чувствительность к резкому перепаду температуры воздуха

function fishSvg(uid, o) {
  const id = s => `${uid}-${s}`;
  return `<svg viewBox="0 0 240 120" class="fish-art" role="img" aria-label="${o.label}">
  <defs>
    <linearGradient id="${id('b')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${o.colors[0]}"/>
      <stop offset=".55" stop-color="${o.colors[1]}"/>
      <stop offset=".9" stop-color="${o.colors[2]}"/>
    </linearGradient>
    <linearGradient id="${id('sh')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".0"/>
      <stop offset=".45" stop-color="#fff" stop-opacity=".28"/>
      <stop offset=".6" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="${id('c')}"><path d="${o.body}"/></clipPath>
    ${o.defs ? o.defs(id) : ''}
  </defs>
  <g stroke-linejoin="round">
    ${o.back}
    <path d="${o.body}" fill="url(#${id('b')})"/>
    <g clip-path="url(#${id('c')})">${o.pattern ? o.pattern(id) : ''}<rect x="0" y="0" width="240" height="120" fill="url(#${id('sh')})"/></g>
    <path d="${o.body}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
    ${o.front}
  </g>
</svg>`;
}

const eye = (x, y, r, iris) => `
  <circle cx="${x}" cy="${y}" r="${r}" fill="${iris}" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>
  <circle cx="${x + r * 0.12}" cy="${y}" r="${r * 0.55}" fill="#111"/>
  <circle cx="${x - r * 0.25}" cy="${y - r * 0.35}" r="${r * 0.22}" fill="#fff" opacity=".9"/>`;

const fin = (d, fill, op = 0.92) => `<path d="${d}" fill="${fill}" fill-opacity="${op}" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>`;

function rays(x1, y1, x2, y2, n, len, ang) {
  let s = '';
  for (let i = 0; i <= n; i++) {
    const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n;
    s += `M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(ang) * len).toFixed(1)} ${(Math.sin(ang) * len).toFixed(1)} `;
  }
  return `<path d="${s}" stroke="rgba(0,0,0,.25)" stroke-width=".7" fill="none"/>`;
}

// ——— Судак ———
function zanderArt(uid) {
  const body = 'M42 54 C70 46 95 36 125 35 C160 34 190 40 206 50 L219 57 L214 60 L219 63 C205 70 185 76 150 79 C110 82 70 74 42 66 Z';
  return fishSvg(uid, {
    label: 'Судак', body, colors: ['#4a5c47', '#9aa68b', '#eef0e4'],
    back: fin('M44 56 L12 34 C19 47 22 54 26 60 C22 66 19 73 12 86 L44 64 Z', '#a9a68a') +
      `<path d="M14 36 l6 10 M14 84 l6 -10" stroke="rgba(0,0,0,.3)"/>` +
      fin('M120 37 L124 14 L131 20 L137 12 L143 19 L149 11 L155 19 L161 14 L168 38 Z', '#b3ae92') +
      `<g fill="#3b3a2e" opacity=".55"><circle cx="131" cy="25" r="2.2"/><circle cx="143" cy="23" r="2.2"/><circle cx="155" cy="24" r="2.2"/></g>` +
      fin('M72 44 C76 30 88 25 100 26 C108 28 112 33 114 37 Z', '#b3ae92') +
      `<g fill="#3b3a2e" opacity=".5"><circle cx="86" cy="33" r="1.8"/><circle cx="98" cy="31" r="1.8"/></g>` +
      fin('M70 73 L64 92 L94 87 L98 77 Z', '#c7c2a6'),
    pattern: () => [78, 100, 122, 144, 166].map((x, i) =>
      `<path d="M${x} 28 q-6 28 ${i % 2 ? 3 : -1} 58 l9 0 q-8 -30 -1 -58z" fill="#2c3628" opacity=".3"/>`).join('') +
      '<path d="M44 60 C90 56 150 52 200 54" stroke="rgba(0,0,0,.25)" stroke-dasharray="2 2" fill="none"/>',
    front: fin('M150 78 L145 96 L163 81 Z', '#c7c2a6') +
      fin('M178 62 C170 67 162 74 157 81 C167 77 175 71 182 66 Z', '#c4bfa2', 0.85) +
      '<path d="M189 45 C182 55 182 66 191 74" stroke="rgba(0,0,0,.4)" stroke-width="1.2" fill="none"/>' +
      '<path d="M219 60 L203 62" stroke="#3b3a2e" stroke-width="1.2"/>' +
      '<path d="M214 60 l1.5 3 l1.5 -3z" fill="#fff"/>' + eye(201, 51, 5.2, '#e9e3c5'),
  });
}

// ——— Щука ———
function pikeArt(uid) {
  const body = 'M36 56 C60 50 100 44 140 44 C170 44 192 47 206 51 L232 56 L230 60 L206 64 C190 70 170 74 140 75 C100 76 60 70 36 64 Z';
  const spots = [];
  [[49, 0], [57, 5], [65, 0]].forEach(([y, sh], r) => {
    for (let x = 48 + sh; x < 192 - r * 8; x += 11) spots.push(`<ellipse cx="${x}" cy="${y + ((x * 7) % 3)}" rx="3.3" ry="1.8" transform="rotate(-8 ${x} ${y})"/>`);
  });
  return fishSvg(uid, {
    label: 'Щука', body, colors: ['#33502a', '#7a9550', '#f0f1d8'],
    back: fin('M38 56 C28 48 18 40 9 35 C14 50 14 66 9 84 C18 78 28 70 38 64 Z', '#a06c42') +
      `<g fill="#3b2a18" opacity=".45"><circle cx="20" cy="48" r="2"/><circle cx="18" cy="70" r="2"/><circle cx="28" cy="60" r="1.6"/></g>` +
      fin('M50 52 C56 39 66 33 80 33 L85 48 Z', '#a06c42') + rays(56, 47, 80, 36, 6, 6, Math.PI / 2) +
      fin('M52 66 C58 79 68 85 81 85 L85 70 Z', '#a06c42'),
    pattern: () => `<g fill="#f1edb0" opacity=".55">${spots.join('')}</g>` +
      '<path d="M40 60 C90 58 150 56 205 57" stroke="rgba(0,0,0,.25)" stroke-dasharray="2 2" fill="none"/>',
    front: fin('M120 74 L111 87 L131 76 Z', '#b37a4a') +
      fin('M180 63 C172 70 166 77 161 83 L184 67 Z', '#b37a4a', 0.85) +
      '<path d="M186 48 C180 56 180 63 186 70" stroke="rgba(0,0,0,.4)" stroke-width="1.2" fill="none"/>' +
      '<path d="M231 58 L195 60" stroke="#2a3a1f" stroke-width="1.2"/>' + eye(200, 51, 4.3, '#e6c64e'),
  });
}

// ——— Окунь ———
function perchArt(uid) {
  const body = 'M44 58 C60 52 80 36 115 28 C145 24 175 32 195 44 L214 56 L208 60 L213 64 C200 74 180 82 145 86 C110 88 70 78 44 66 Z';
  return fishSvg(uid, {
    label: 'Окунь', body, colors: ['#3a5722', '#a8b548', '#f3ecd0'],
    back: fin('M46 58 L15 33 C21 47 24 55 28 62 C24 69 21 77 15 91 L46 66 Z', '#e0622d') +
      fin('M112 31 L118 7 L126 14 L132 5 L140 13 L147 6 L154 15 L161 10 L170 36 Z', '#8d8c6a') +
      '<circle cx="158" cy="22" r="5" fill="#1f1f1a"/>' +
      fin('M70 46 C74 32 84 25 96 25 C104 27 108 31 110 35 Z', '#9d9a74') +
      fin('M72 76 L69 94 L96 91 L99 82 Z', '#e86a30'),
    pattern: () => [[70, 7], [90, 9], [112, 10], [134, 10], [155, 9], [174, 7]].map(([x, w], i) =>
      `<path d="M${x} 20 q${i % 2 ? 6 : 3} 32 -2 66 l${w} 0 q6 -34 2 -66z" fill="#203016" opacity=".55"/>`).join('') +
      '<path d="M48 60 C90 50 150 42 196 48" stroke="rgba(0,0,0,.2)" stroke-dasharray="2 2" fill="none"/>',
    front: fin('M142 84 L137 101 L157 88 Z', '#ec6e33') +
      fin('M174 63 C166 69 160 76 157 83 L178 69 Z', '#e7a24a', 0.85) +
      '<path d="M183 40 C175 52 175 66 186 77" stroke="rgba(0,0,0,.4)" stroke-width="1.2" fill="none"/>' +
      '<path d="M183 70 l-7 4" stroke="rgba(0,0,0,.4)"/>' +
      '<path d="M213 61 L202 62" stroke="#2c3a1a" stroke-width="1.2"/>' + eye(195, 49, 5.4, '#f0b33c'),
  });
}

// ——— Жерех ———
function aspArt(uid) {
  const body = 'M42 58 C70 48 100 38 135 37 C165 37 190 44 206 52 L223 57 L216 61 L222 63 C205 71 178 77 140 78 C100 79 70 72 42 65 Z';
  return fishSvg(uid, {
    label: 'Жерех', body, colors: ['#2f4560', '#b8c3d0', '#f5f7f9'],
    defs: id => `<pattern id="${id('sc')}" width="7" height="6" patternUnits="userSpaceOnUse"><path d="M0 6 Q3.5 1 7 6" fill="none" stroke="#1d2a3a" stroke-opacity=".18" stroke-width=".7"/></pattern>`,
    back: fin('M44 58 L8 28 C19 45 24 54 28 61 C24 68 19 77 8 94 L44 65 Z', '#5f6b7c') +
      fin('M118 39 L103 12 L112 11 L138 38 Z', '#5f6b7c') + rays(106, 15, 134, 38, 5, 4, Math.PI * 0.6) +
      fin('M78 72 L69 91 L101 82 L105 74 Z', '#b88b7d'),
    pattern: id => `<rect width="240" height="120" fill="url(#${id('sc')})"/>` +
      '<path d="M44 61 C90 58 150 56 205 57" stroke="rgba(0,0,0,.25)" stroke-dasharray="2 2" fill="none"/>',
    front: fin('M132 77 L125 93 L145 79 Z', '#c48f7e') +
      fin('M180 64 L160 79 L184 68 Z', '#9fa9b6', 0.85) +
      '<path d="M190 45 C183 55 183 65 191 73" stroke="rgba(0,0,0,.4)" stroke-width="1.2" fill="none"/>' +
      '<path d="M222 60 C214 62 206 64 198 64" stroke="#1d2a3a" stroke-width="1.2" fill="none"/>' + eye(203, 52, 4.2, '#d9dfe6'),
  });
}

// ——— Сом ———
function catfishArt(uid) {
  const body = 'M18 60 C30 54 60 44 100 42 C140 40 180 40 205 46 C222 50 230 56 230 62 C230 68 220 72 205 74 C175 80 140 80 100 78 C60 76 30 68 18 64 Z';
  const blots = [[50, 56, 7, 4], [72, 50, 9, 4], [96, 55, 6, 4], [118, 48, 10, 4], [140, 56, 8, 3.5], [162, 49, 9, 4], [184, 55, 7, 3.5], [86, 64, 7, 3], [130, 66, 9, 3], [174, 66, 8, 3]];
  return fishSvg(uid, {
    label: 'Сом', body, colors: ['#262a27', '#565c51', '#d3cfbb'],
    back: fin('M22 60 C11 51 3 53 3 62 C3 71 11 73 22 66 Z', '#33362f') +
      fin('M148 42 L146 31 L159 33 L164 41 Z', '#33362f'),
    pattern: () => `<g fill="#15180f" opacity=".3">${blots.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}</g>`,
    front: fin('M28 66 C60 80 100 86 132 81 L130 76 C100 78 60 74 30 64 Z', '#3a3d35') +
      fin('M140 78 L135 90 L150 79 Z', '#3a3d35') +
      fin('M190 71 C183 80 177 88 170 93 L196 73 Z', '#3a3d35') +
      '<path d="M230 62 C222 65 214 65 207 62" stroke="#15180f" stroke-width="1.4" fill="none"/>' +
      '<g fill="none" stroke="#2a2d27" stroke-linecap="round">' +
      '<path d="M224 56 C236 50 239 32 231 16" stroke-width="2.2"/>' +
      '<path d="M226 58 C238 60 238 80 232 96" stroke-width="2"/>' +
      '<path d="M221 69 q6 8 2 15" stroke-width="1.2"/><path d="M215 71 q4 8 0 13" stroke-width="1.2"/></g>' +
      eye(214, 53, 2.6, '#c9c39e'),
  });
}

// ——— Голавль ———
function chubArt(uid) {
  const body = 'M44 58 C66 50 96 40 130 38 C165 37 192 42 208 52 C216 57 218 62 214 66 C204 74 180 80 140 81 C100 82 66 74 44 66 Z';
  return fishSvg(uid, {
    label: 'Голавль', body, colors: ['#36454e', '#bcb48a', '#f4f0e2'],
    defs: id => `<pattern id="${id('sc')}" width="9" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 Q4.5 1 9 8" fill="none" stroke="#252c31" stroke-opacity=".42" stroke-width=".9"/></pattern>`,
    back: fin('M46 58 L15 35 C21 49 24 56 26 62 C24 68 21 75 15 89 L46 66 Z', '#3a3f45') +
      fin('M112 40 L104 19 L114 17 L133 39 Z', '#454b52') + rays(106, 21, 130, 39, 4, 4, Math.PI * 0.6) +
      fin('M84 75 C78 84 76 90 80 95 L106 84 L108 78 Z', '#da562b'),
    pattern: id => `<rect width="240" height="120" fill="url(#${id('sc')})"/>` +
      '<path d="M48 61 C90 58 150 56 200 56" stroke="rgba(0,0,0,.25)" stroke-dasharray="2 2" fill="none"/>',
    front: fin('M134 80 L127 95 L147 82 Z', '#e0682f') +
      fin('M181 67 L166 82 L186 71 Z', '#da8a4a', 0.88) +
      '<path d="M188 44 C180 54 180 66 190 76" stroke="rgba(0,0,0,.4)" stroke-width="1.2" fill="none"/>' +
      '<path d="M216 62 L203 63" stroke="#252c31" stroke-width="1.3"/>' + eye(197, 52, 4.8, '#e3a35a'),
  });
}

export const SPECIES = [
  {
    id: 'zander', name: 'Судак', nameGen: 'судака', nameDat: 'судаку', latin: 'Sander lucioperca', art: zanderArt,
    season: [0.45, 0.45, 0.5, 0.4, 0.45, 0.7, 0.6, 0.7, 0.9, 1, 0.85, 0.55],
    water: [1, 8, 18, 26],
    pLevel: { mu: 3, sigma: 8 },
    trend: { ff: 0.3, sf: 0.65, st: 1, sr: 0.75, fr: 0.35 },
    wind: [0, 1, 5, 12],
    cloud: [0.6, 0.85, 1],
    rain: [0.85, 1, 0.6, 0.3],
    time: { night: 0.6, dawn: 1, morning: 0.7, day: 0.35, evening: 0.7, dusk: 1 },
    moon: [1, 0.6],
    tSens: 1,
    weights: { season: 2, water: 2, pressure: 1, trend: 2.5, tchange: 1, wind: 1, cloud: 1, rain: 0.5, time: 2.5, moon: 0.7 },
    hints: {
      season: 'Пик — осенний жор в сентябре–октябре.',
      pressure: 'Судак лучше берёт при нормальном или слегка повышенном давлении.',
      trend: 'Судак любит стабильное давление, резкие скачки его отключают.',
      wind: 'Лёгкий ветер с рябью — хорошо, шторм — плохо.',
      cloud: 'Судак светобоязлив: пасмурно лучше, чем ярко.',
      rain: 'Небольшой дождь не мешает, ливень мутит воду.',
      time: 'Судак выходит кормиться на зорях и ночью.',
      moon: 'В тёмные ночи (новолуние) судак активнее.',
    },
    tips: {
      winter: 'Балансир, вертикальная блесна, тюлька на русловых бровках 8–15 м.',
      spring: 'Джиг с лёгкой головкой на свалах; проверьте сроки нерестового запрета в вашем регионе.',
      summer: 'Ночная ловля с лодки, поролоновые рыбки, твистеры на ямах.',
      autumn: 'Жор: джиг и мормышинг на бровках, виброхвосты 8–10 см.',
    },
  },
  {
    id: 'pike', name: 'Щука', nameGen: 'щуки', nameDat: 'щуке', latin: 'Esox lucius', art: pikeArt,
    season: [0.5, 0.45, 0.6, 0.55, 0.7, 0.6, 0.45, 0.55, 0.9, 1, 0.85, 0.6],
    water: [0.3, 4, 16, 25],
    pLevel: { mu: -3, sigma: 9 },
    trend: { ff: 0.55, sf: 1, st: 0.8, sr: 0.6, fr: 0.35 },
    wind: [0, 2, 7, 13],
    cloud: [0.55, 0.85, 1],
    rain: [0.8, 1, 0.75, 0.35],
    time: { night: 0.15, dawn: 0.9, morning: 1, day: 0.65, evening: 0.85, dusk: 0.7 },
    moon: [0.8, 0.75],
    tSens: 1,
    weights: { season: 2, water: 1.5, pressure: 1, trend: 3, tchange: 1, wind: 1.2, cloud: 1.2, rain: 0.8, time: 2, moon: 0.3 },
    hints: {
      season: 'Лучше всего — осень и время перед ледоставом.',
      pressure: 'Щука хорошо берёт при слегка пониженном давлении перед сменой погоды.',
      trend: 'Медленное падение давления — классическая «щучья» погода.',
      wind: 'Умеренный ветер с волной маскирует рыболова и будит щуку.',
      cloud: 'Пасмурная погода предпочтительнее яркого солнца.',
      rain: 'Тёплый моросящий дождь часто провоцирует хватку.',
      time: 'Щука — дневной хищник, пики утром и ближе к вечеру.',
      moon: 'Влияние луны на щуку слабое.',
    },
    tips: {
      winter: 'Жерлицы на живца у травы и на входах в заливы.',
      spring: 'После запрета — мелководные заливы, воблеры-минноу и вертушки.',
      summer: 'Незацепляйки и поппера у травы, утром и вечером.',
      autumn: 'Крупные воблеры, джиг 10–12 см и колебалки на свалах.',
    },
  },
  {
    id: 'perch', name: 'Окунь', nameGen: 'окуня', nameDat: 'окуню', latin: 'Perca fluviatilis', art: perchArt,
    season: [0.6, 0.65, 0.75, 0.6, 0.6, 0.75, 0.75, 0.8, 0.9, 0.85, 0.7, 0.6],
    water: [0.3, 6, 22, 28],
    pLevel: { mu: 4, sigma: 8 },
    trend: { ff: 0.3, sf: 0.7, st: 1, sr: 0.9, fr: 0.5 },
    wind: [0, 1, 5, 11],
    cloud: [1, 0.9, 0.7],
    rain: [1, 0.85, 0.55, 0.3],
    time: { night: 0.05, dawn: 0.6, morning: 1, day: 0.85, evening: 0.9, dusk: 0.4 },
    moon: [0.6, 0.6],
    tSens: 1,
    weights: { season: 1.5, water: 1.5, pressure: 1.5, trend: 2.5, tchange: 1, wind: 1, cloud: 1, rain: 0.8, time: 2.5, moon: 0.2 },
    hints: {
      season: 'Окунь ловится круглый год, осенью — стаями на котлах.',
      pressure: 'Окунь любит высокое стабильное давление и ясную погоду.',
      trend: 'Стабильное или растущее давление — хорошо, резкое падение — плохо.',
      wind: 'Слабый ветер оптимален; в сильную волну окунь уходит глубже.',
      cloud: 'Солнечная погода окуню подходит лучше пасмурной.',
      rain: 'Сильный дождь обычно ухудшает клёв.',
      time: 'Окунь — дневная рыба, ночью почти не берёт.',
      moon: 'Фаза луны на окуня почти не влияет.',
    },
    tips: {
      winter: 'Мормышка с мотылём, безмотылка, балансир на первом льду.',
      spring: 'Микроджиг и вертушки у прибрежных бровок.',
      summer: 'Ищите «котлы» с утра: колебалки, вертушки, микроджиг.',
      autumn: 'Отводной поводок и дроп-шот на глубине 4–8 м.',
    },
  },
  {
    id: 'asp', name: 'Жерех', nameGen: 'жереха', nameDat: 'жереху', latin: 'Leuciscus aspius', art: aspArt,
    season: [0.05, 0.05, 0.1, 0.35, 0.6, 0.9, 1, 1, 0.85, 0.5, 0.15, 0.05],
    water: [6, 14, 24, 29],
    pLevel: { mu: 3, sigma: 9 },
    trend: { ff: 0.4, sf: 0.7, st: 1, sr: 0.85, fr: 0.55 },
    wind: [0, 2, 6, 11],
    cloud: [1, 0.9, 0.7],
    rain: [1, 0.8, 0.5, 0.3],
    time: { night: 0.05, dawn: 0.85, morning: 1, day: 0.7, evening: 1, dusk: 0.5 },
    moon: [0.5, 0.5],
    tSens: 1,
    weights: { season: 3, water: 2, pressure: 1, trend: 1.5, tchange: 1, wind: 1.2, cloud: 1, rain: 0.8, time: 2.5, moon: 0.2 },
    hints: {
      season: 'Жерех активен с поздней весны до сентября, зимой почти не ловится.',
      pressure: 'Лучше всего — устойчивая солнечная погода.',
      trend: 'Стабильное давление — ключ к «бою» жереха.',
      wind: 'Рябь на воде помогает: жерех смелее бьёт малька.',
      cloud: 'Жерех — рыба ясных тёплых дней.',
      rain: 'Дождь и муть снижают активность жереха.',
      time: 'Жерех охотится днём, особенно утром и под вечер.',
      moon: 'Фаза луны на жереха почти не влияет.',
    },
    tips: {
      winter: 'Зимой жерех почти не ловится — лучше выбрать другой вид.',
      spring: 'Пилькеры и кастмастеры на сливах ГЭС и у перекатов.',
      summer: 'Дальний заброс: девоны, пилькеры, «бомбарды» с мушкой по «котлам».',
      autumn: 'Тонущие воблеры и пилькеры на русле до похолодания.',
    },
  },
  {
    id: 'catfish', name: 'Сом', nameGen: 'сома', nameDat: 'сому', latin: 'Silurus glanis', art: catfishArt,
    season: [0.02, 0.02, 0.05, 0.15, 0.45, 0.85, 1, 0.95, 0.65, 0.25, 0.05, 0.02],
    water: [10, 18, 26, 30],
    pLevel: { mu: -4, sigma: 9 },
    trend: { ff: 0.7, sf: 1, st: 0.8, sr: 0.6, fr: 0.4 },
    wind: [0, 0, 3, 9],
    cloud: [0.5, 0.8, 1],
    rain: [0.8, 1, 0.9, 0.6],
    time: { night: 1, dawn: 0.7, morning: 0.3, day: 0.15, evening: 0.5, dusk: 0.85 },
    moon: [1, 0.55],
    tSens: 0.8,
    weights: { season: 3, water: 2.5, pressure: 1, trend: 2, tchange: 0.8, wind: 1, cloud: 1, rain: 1, time: 3, moon: 1 },
    hints: {
      season: 'Сом активен в тёплый сезон, пик — июль.',
      pressure: 'Душная погода с пониженным давлением — время сома.',
      trend: 'Падение давления перед грозой часто будит сома.',
      wind: 'Сом любит тихую тёплую погоду.',
      cloud: 'Облачность и тёмные ночи предпочтительнее.',
      rain: 'Тёплый дождь и гроза не мешают, а часто помогают.',
      time: 'Сом — ночной хищник, кормится с сумерек до рассвета.',
      moon: 'В тёмные безлунные ночи сом выходит смелее.',
    },
    tips: {
      winter: 'Сом зимует в ямах и не питается — ловля бессмысленна.',
      spring: 'В конце весны — донки на выползка и лягушку у ям.',
      summer: 'Квок, донки на живца, раков и пучок выползков ночью.',
      autumn: 'Ранней осенью — живец на ямах, дальше активность падает.',
    },
  },
  {
    id: 'chub', name: 'Голавль', nameGen: 'голавля', nameDat: 'голавлю', latin: 'Squalius cephalus', art: chubArt,
    season: [0.25, 0.25, 0.35, 0.45, 0.6, 0.9, 1, 1, 0.85, 0.65, 0.4, 0.3],
    water: [2, 12, 24, 28],
    pLevel: { mu: 3, sigma: 9 },
    trend: { ff: 0.35, sf: 0.7, st: 1, sr: 0.85, fr: 0.5 },
    wind: [0, 0.5, 4, 10],
    cloud: [0.9, 1, 0.75],
    rain: [0.9, 1, 0.6, 0.3],
    time: { night: 0.25, dawn: 0.8, morning: 1, day: 0.7, evening: 1, dusk: 0.7 },
    moon: [0.55, 0.55],
    tSens: 1,
    weights: { season: 2, water: 2, pressure: 1, trend: 2, tchange: 1, wind: 1, cloud: 1, rain: 1, time: 2, moon: 0.2 },
    hints: {
      season: 'Голавль лучше всего берёт летом и в начале осени.',
      pressure: 'Голавль предпочитает устойчивую ясную погоду.',
      trend: 'Стабильное давление — самый надёжный клёв.',
      wind: 'Тихая погода или лёгкий ветер оптимальны.',
      cloud: 'Переменная облачность — идеальна.',
      rain: 'Лёгкий дождь смывает насекомых в воду — голавль оживляется.',
      time: 'Голавль активен утром и вечером.',
      moon: 'Фаза луны на голавля почти не влияет.',
    },
    tips: {
      winter: 'На ямах с течением — мормышка, но клюёт редко.',
      spring: 'Микровоблеры и вертушки на перекатах.',
      summer: 'Воблеры-кренки, поверхностные приманки, ловля на жука «в проводку».',
      autumn: 'Микроджиг и тонущие воблеры у коряжника.',
    },
  },
];

export const speciesById = id => SPECIES.find(s => s.id === id);

export function seasonKey(month) {
  if (month === 11 || month <= 1) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}
