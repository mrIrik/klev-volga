// Реалистичные векторные иллюстрации рыб: объёмная светотень, чешуя, текстура кожи,
// полупрозрачные плавники с лучами, глаз с бликом и тень под рыбой.

let seq = 0;

const GDIR = {
  up: 'x1="0" y1="1" x2="0" y2="0"',
  down: 'x1="0" y1="0" x2="0" y2="1"',
  left: 'x1="1" y1="0" x2="0" y2="0"',
  right: 'x1="0" y1="0" x2="1" y2="0"',
};

// Плавник: градиент от основания к краю, лучи по веером (обрезаны контуром), тонкая кромка
function fin(id, defs, f) {
  const k = id('f' + seq++);
  defs.push(`<linearGradient id="${k}g" ${GDIR[f.dir || 'up']}>
      <stop offset="0" stop-color="${f.fill}" stop-opacity="${f.op0 ?? 0.95}"/>
      <stop offset="1" stop-color="${f.tip || f.fill}" stop-opacity="${f.op1 ?? 0.6}"/></linearGradient>
    <clipPath id="${k}c"><path d="${f.d}"/></clipPath>`);
  let rays = '';
  if (f.rays) {
    const [ax, ay, bx, by, cx, cy, dx, dy, n] = f.rays;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      rays += `M${(ax + (bx - ax) * t).toFixed(1)} ${(ay + (by - ay) * t).toFixed(1)}L${(cx + (dx - cx) * t).toFixed(1)} ${(cy + (dy - cy) * t).toFixed(1)}`;
    }
  }
  return `<g>
    <path d="${f.d}" fill="url(#${k}g)"/>
    ${rays ? `<path d="${rays}" clip-path="url(#${k}c)" stroke="${f.ray || 'rgba(15,18,20,.38)'}" stroke-width=".65" fill="none"/>` : ''}
    ${f.extra ? `<g clip-path="url(#${k}c)">${f.extra}</g>` : ''}
    <path d="${f.d}" fill="none" stroke="rgba(0,0,0,.3)" stroke-width=".6"/>
  </g>`;
}

function eye(id, defs, x, y, r, iris, rim = '#2a2a24') {
  const k = id('eye' + seq++);
  defs.push(`<radialGradient id="${k}" cx=".45" cy=".4" r=".6">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="${iris}"/>
      <stop offset="1" stop-color="${rim}"/></radialGradient>`);
  return `
    <circle cx="${x}" cy="${y + 0.6}" r="${r + 1.8}" fill="rgba(0,0,0,.28)" filter="url(#${id('b1')})"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="url(#${k})"/>
    <circle cx="${x + r * 0.08}" cy="${y + r * 0.04}" r="${r * 0.5}" fill="#060708"/>
    <ellipse cx="${x - r * 0.3}" cy="${y - r * 0.36}" rx="${r * 0.3}" ry="${r * 0.19}" fill="#fff" opacity=".95" transform="rotate(-25 ${x - r * 0.3} ${y - r * 0.36})"/>
    <circle cx="${x + r * 0.32}" cy="${y + r * 0.32}" r="${r * 0.09}" fill="#fff" opacity=".6"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="rgba(0,0,0,.6)" stroke-width=".7"/>`;
}

// Шахматная чешуя: тёмная дуга + светлый блик по кромке
function scalePattern(id, w, op) {
  const h = w * 0.78;
  const arcs = `M0 ${h / 2}Q${w / 2} ${-h * 0.15} ${w} ${h / 2}M${-w / 2} ${h}Q0 ${h * 0.35} ${w / 2} ${h}M${w / 2} ${h}Q${w} ${h * 0.35} ${w * 1.5} ${h}`;
  return `<pattern id="${id('sc')}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">
      <path d="${arcs}" fill="none" stroke="#0b0d0e" stroke-opacity="${op}" stroke-width=".75"/>
      <path d="${arcs}" transform="translate(0 .9)" fill="none" stroke="#fff" stroke-opacity="${op * 0.55}" stroke-width=".5"/>
    </pattern>`;
}

function fishSvg(uid, o) {
  const id = s => `${uid}-${s}`;
  const defs = [];
  const back = o.backFins.map(f => fin(id, defs, f)).join('');
  const front = o.frontFins.map(f => fin(id, defs, f)).join('');
  const top = o.front(id, defs);
  const [sx, sy, srx, sry, srot] = o.spec;
  return `<svg viewBox="0 0 240 120" class="fish-art" role="img" aria-label="${o.label}">
  <defs>
    <linearGradient id="${id('b')}" x1="0" y1="0" x2="0" y2="1">
      ${o.colors.map(([off, c]) => `<stop offset="${off}" stop-color="${c}"/>`).join('')}
    </linearGradient>
    <linearGradient id="${id('v')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".5"/>
      <stop offset=".22" stop-color="#000" stop-opacity="0"/>
      <stop offset=".4" stop-color="#fff" stop-opacity=".2"/>
      <stop offset=".52" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".8" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".4"/>
    </linearGradient>
    <linearGradient id="${id('h')}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".35"/>
      <stop offset=".3" stop-color="#000" stop-opacity="0"/>
      <stop offset=".85" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".25"/>
    </linearGradient>
    <clipPath id="${id('c')}"><path d="${o.body}"/></clipPath>
    <filter id="${id('b1')}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1"/></filter>
    <filter id="${id('b2')}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="${id('sh')}" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="${id('n')}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${o.grain || 0.85}" numOctaves="2" seed="${o.seed || 3}"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    ${o.scales ? scalePattern(id, o.scales[0], o.scales[1]) : ''}
    ${o.defs ? o.defs(id) : ''}
    ${defs.join('')}
  </defs>
  <ellipse cx="128" cy="106" rx="92" ry="4.5" fill="#000" opacity=".5" filter="url(#${id('sh')})"/>
  ${back}
  <path d="${o.body}" fill="url(#${id('b')})"/>
  <g clip-path="url(#${id('c')})">
    ${o.pattern ? o.pattern(id) : ''}
    ${o.scales ? `<rect width="240" height="120" fill="url(#${id('sc')})"/>` : ''}
    <rect width="240" height="120" filter="url(#${id('n')})" opacity="${o.noise ?? 0.16}" style="mix-blend-mode:overlay"/>
    <rect width="240" height="120" fill="url(#${id('v')})"/>
    <rect width="240" height="120" fill="url(#${id('h')})"/>
    <ellipse cx="${sx}" cy="${sy}" rx="${srx}" ry="${sry}" transform="rotate(${srot} ${sx} ${sy})" fill="#fff" opacity="${o.gloss ?? 0.32}" filter="url(#${id('b2')})"/>
    ${o.lateral ? `<path d="${o.lateral}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8" stroke-dasharray="1.6 1.4"/>` : ''}
    ${o.gill ? `<path d="${o.gill}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="5" filter="url(#${id('b2')})" opacity=".55"/>` : ''}
  </g>
  <path d="${o.body}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>
  ${o.gill ? `<path d="${o.gill}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="1.1"/><path d="${o.gill}" transform="translate(1.4 0)" fill="none" stroke="rgba(255,255,255,.28)" stroke-width=".7"/>` : ''}
  ${front}
  ${top}
</svg>`;
}

// ——— Судак ———
export function zanderArt(uid) {
  const body = 'M42 54 C70 46 95 36 125 35 C160 34 190 40 206 50 L219 57 L214 60 L219 63 C205 70 185 76 150 79 C110 82 70 74 42 66 Z';
  const spots = (pts, r) => pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.75}" fill="#2a2a20" opacity=".55"/>`).join('');
  return fishSvg(uid, {
    label: 'Судак', body,
    colors: [[0, '#2f3a30'], [0.3, '#5d6956'], [0.55, '#a7ae9a'], [0.8, '#dfe2d6'], [1, '#f2f3ec']],
    scales: [4.6, 0.22], spec: [128, 47, 62, 3.5, -1],
    lateral: 'M44 60 C90 55 150 50 200 53',
    gill: 'M189 44 C181 55 181 66 191 75',
    pattern: id => `<g filter="url(#${id('b1')})" fill="#1d231a" opacity=".38">${[76, 98, 120, 142, 164].map((x, i) =>
      `<path d="M${x} 28 q-7 24 ${i % 2 ? 3 : -2} 44 l10 0 q-7 -24 0 -44z"/>`).join('')}</g>`,
    backFins: [
      { d: 'M44 56 L12 34 C19 47 22 54 26 60 C22 66 19 73 12 86 L44 64 Z', dir: 'left', fill: '#7d7c66', tip: '#c3c0a8', rays: [44, 56, 44, 64, 12, 34, 12, 86, 16],
        extra: spots([[22, 44], [30, 50], [24, 76], [32, 70], [18, 60]], 1.6) },
      { d: 'M120 37 L124 14 L131 20 L137 12 L143 19 L149 11 L155 19 L161 14 L168 38 Z', fill: '#8a8770', tip: '#cfcbb4', op1: 0.75, rays: [121, 37, 166, 38, 124, 14, 161, 14, 7], ray: 'rgba(20,20,15,.55)',
        extra: spots([[128, 30], [139, 28], [150, 27], [160, 30], [133, 22], [146, 20]], 1.9) },
      { d: 'M72 44 C76 30 88 25 100 26 C108 28 112 33 114 37 Z', fill: '#8a8770', tip: '#cfcbb4', rays: [74, 44, 113, 37, 76, 30, 108, 27, 10],
        extra: spots([[84, 36], [95, 33], [104, 33]], 1.5) },
      { d: 'M70 73 L64 92 L94 87 L98 77 Z', dir: 'down', fill: '#a9a690', tip: '#dedbc8', rays: [70, 73, 98, 77, 64, 92, 94, 87, 10] },
    ],
    frontFins: [
      { d: 'M150 78 L145 96 L163 81 Z', dir: 'down', fill: '#b4b19c', tip: '#e2e0d0', rays: [150, 78, 163, 81, 145, 96, 148, 95, 6] },
      { d: 'M178 62 C170 67 162 74 157 81 C167 77 175 71 182 66 Z', dir: 'left', fill: '#a9a690', tip: '#d9d6c2', op1: 0.5, rays: [178, 62, 182, 66, 157, 81, 160, 80, 6] },
    ],
    front: (id, defs) => `
      <path d="M219 60 L203 62" stroke="#2a2a20" stroke-width="1.3"/>
      <path d="M213.5 60 l1.4 3 l1.4 -3z M208 61 l1.1 2.4 l1.1 -2.4z" fill="#f4f1e6"/>
      ${eye(id, defs, 201, 51, 5.3, '#8f9a90', '#262c27')}`,
  });
}

// ——— Щука ———
export function pikeArt(uid) {
  const body = 'M36 56 C60 50 100 44 140 44 C170 44 192 47 206 51 L232 56 L230 60 L206 64 C190 70 170 74 140 75 C100 76 60 70 36 64 Z';
  const spots = [];
  [[48, 0], [55, 5], [62, 0], [68, 4]].forEach(([y, sh], r) => {
    for (let x = 46 + sh; x < 190 - r * 6; x += 9.5) {
      const yy = y + ((x * 13) % 5) * 0.6 - 1;
      spots.push(`<ellipse cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" rx="${(2.6 + (x % 3) * 0.4).toFixed(1)}" ry="1.5" transform="rotate(-10 ${x.toFixed(1)} ${yy.toFixed(1)})"/>`);
    }
  });
  const mott = (pts) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2b1d10" opacity=".5"/>`).join('');
  return fishSvg(uid, {
    label: 'Щука', body,
    colors: [[0, '#25311c'], [0.3, '#4a5a2e'], [0.55, '#7d8b4c'], [0.8, '#d7d4b0'], [1, '#efecd8']],
    scales: [3.6, 0.14], spec: [140, 51, 60, 2.6, -1.5], grain: 1.1,
    lateral: 'M40 60 C90 58 150 56 205 57',
    gill: 'M187 47 C181 55 181 63 187 70',
    pattern: id => `<g fill="#e3dda0" opacity=".62" filter="url(#${id('b1')})">${spots.join('')}</g>`,
    backFins: [
      { d: 'M38 56 C28 48 18 40 9 35 C14 50 14 66 9 84 C18 78 28 70 38 64 Z', dir: 'left', fill: '#7a4c2a', tip: '#b37c4f', rays: [38, 56, 38, 64, 9, 35, 9, 84, 16],
        extra: mott([[20, 46, 2.2], [17, 70, 2.2], [28, 60, 1.8], [14, 58, 1.6], [24, 76, 1.6]]) },
      { d: 'M50 52 C56 39 66 33 80 33 L85 48 Z', fill: '#7a4c2a', tip: '#b37c4f', rays: [52, 51, 84, 48, 57, 39, 80, 33, 10],
        extra: mott([[64, 42, 2], [74, 39, 1.8], [78, 45, 1.6]]) },
      { d: 'M52 66 C58 79 68 85 81 85 L85 70 Z', dir: 'down', fill: '#7a4c2a', tip: '#b37c4f', rays: [54, 67, 84, 70, 58, 79, 81, 85, 10],
        extra: mott([[66, 76, 1.8], [76, 80, 1.6]]) },
    ],
    frontFins: [
      { d: 'M120 74 L111 87 L131 76 Z', dir: 'down', fill: '#8c5a33', tip: '#c48c5c', rays: [120, 74, 131, 76, 111, 87, 113, 86, 6] },
      { d: 'M180 63 C172 70 166 77 161 83 L184 67 Z', dir: 'left', fill: '#8c5a33', tip: '#c48c5c', op1: 0.5, rays: [180, 63, 184, 67, 161, 83, 163, 82, 6] },
    ],
    front: (id, defs) => `
      <path d="M231 58 L195 60.5" stroke="#1d2614" stroke-width="1.3"/>
      <path d="M206 52 C214 53 224 55 231 57" stroke="rgba(255,255,255,.18)" stroke-width=".8" fill="none"/>
      ${eye(id, defs, 200, 51, 4.3, '#d9b544', '#5a4515')}`,
  });
}

// ——— Окунь ———
export function perchArt(uid) {
  const body = 'M44 58 C60 52 80 36 115 28 C145 24 175 32 195 44 L214 56 L208 60 L213 64 C200 74 180 82 145 86 C110 88 70 78 44 66 Z';
  return fishSvg(uid, {
    label: 'Окунь', body,
    colors: [[0, '#23331a'], [0.28, '#4d6326'], [0.55, '#a3ad46'], [0.8, '#e2dfb4'], [1, '#f4f1e2']],
    scales: [4.4, 0.24], spec: [125, 42, 55, 4, -6],
    lateral: 'M48 60 C90 50 150 42 196 48',
    gill: 'M184 39 C175 52 175 66 187 78',
    pattern: id => `<g filter="url(#${id('b1')})" fill="#141d0c" opacity=".6">${[[68, 7], [89, 9], [111, 10], [133, 10], [154, 9], [173, 7]].map(([x, w], i) =>
      `<path d="M${x} 20 q${i % 2 ? 6 : 3} 30 -2 58 q${w / 2} 4 ${w} 0 q6 -30 2 -58z"/>`).join('')}</g>`,
    backFins: [
      { d: 'M46 58 L15 33 C21 47 24 55 28 62 C24 69 21 77 15 91 L46 66 Z', dir: 'left', fill: '#c8441c', tip: '#f07a3e', rays: [46, 58, 46, 66, 15, 33, 15, 91, 16] },
      { d: 'M112 31 L118 7 L126 14 L132 5 L140 13 L147 6 L154 15 L161 10 L170 36 Z', fill: '#5d5c4c', tip: '#a6a48c', op1: 0.8, rays: [113, 31, 168, 36, 118, 7, 161, 10, 8], ray: 'rgba(15,15,10,.6)',
        extra: '<ellipse cx="158" cy="23" rx="6" ry="7" fill="#0d0d0b" opacity=".92"/>' },
      { d: 'M70 46 C74 32 84 25 96 25 C104 27 108 31 110 35 Z', fill: '#6d6b55', tip: '#b5b296', rays: [72, 46, 109, 35, 74, 32, 104, 27, 10] },
      { d: 'M72 76 L69 94 L96 91 L99 82 Z', dir: 'down', fill: '#d24a1f', tip: '#f4834a', rays: [72, 76, 99, 82, 69, 94, 96, 91, 10] },
    ],
    frontFins: [
      { d: 'M142 84 L137 101 L157 88 Z', dir: 'down', fill: '#d84d20', tip: '#f68a50', rays: [142, 84, 157, 88, 137, 101, 139, 100, 7] },
      { d: 'M174 63 C166 69 160 76 157 83 L178 69 Z', dir: 'left', fill: '#c98a3a', tip: '#e8b46e', op1: 0.5, rays: [174, 63, 178, 69, 157, 83, 159, 82, 6] },
    ],
    front: (id, defs) => `
      <path d="M183 70 l-8 4.5" stroke="rgba(0,0,0,.45)" stroke-width="1"/>
      <path d="M213 61 L202 62.5" stroke="#1f2a12" stroke-width="1.3"/>
      ${eye(id, defs, 195, 49, 5.4, '#e8a530', '#5a3a0c')}`,
  });
}

// ——— Жерех ———
export function aspArt(uid) {
  const body = 'M42 58 C70 48 100 38 135 37 C165 37 190 44 206 52 L223 57 L216 61 L222 63 C205 71 178 77 140 78 C100 79 70 72 42 65 Z';
  return fishSvg(uid, {
    label: 'Жерех', body,
    colors: [[0, '#1f2d3d'], [0.25, '#3d536a'], [0.45, '#8fa3b6'], [0.6, '#d3dbe3'], [0.85, '#eef2f5'], [1, '#f8fafb']],
    scales: [5.2, 0.2], spec: [130, 49, 66, 3.2, -1], gloss: 0.45,
    lateral: 'M44 61 C90 58 150 56 205 57',
    gill: 'M190 45 C183 55 183 65 191 73',
    defs: id => `<linearGradient id="${id('sheen')}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7fc4ff" stop-opacity="0"/><stop offset=".5" stop-color="#7fc4ff" stop-opacity=".22"/>
      <stop offset="1" stop-color="#b98cff" stop-opacity=".1"/></linearGradient>`,
    pattern: id => `<rect x="0" y="44" width="240" height="14" fill="url(#${id('sheen')})" filter="url(#${id('b2')})"/>`,
    backFins: [
      { d: 'M44 58 L8 28 C19 45 24 54 28 61 C24 68 19 77 8 94 L44 65 Z', dir: 'left', fill: '#3f4b5a', tip: '#7b8797', rays: [44, 58, 44, 65, 8, 28, 8, 94, 18] },
      { d: 'M118 39 L103 12 L112 11 L138 38 Z', fill: '#3f4b5a', tip: '#7b8797', op1: 0.8, rays: [119, 39, 137, 38, 103, 12, 112, 11, 7] },
      { d: 'M78 72 L69 91 L101 82 L105 74 Z', dir: 'down', fill: '#a8766a', tip: '#d6a89c', rays: [78, 72, 105, 74, 69, 91, 101, 82, 10] },
    ],
    frontFins: [
      { d: 'M132 77 L125 93 L145 79 Z', dir: 'down', fill: '#b47f71', tip: '#ddb1a5', rays: [132, 77, 145, 79, 125, 93, 127, 92, 6] },
      { d: 'M180 64 L160 79 L184 68 Z', dir: 'left', fill: '#8b97a6', tip: '#c3ccd6', op1: 0.45, rays: [180, 64, 184, 68, 160, 79, 162, 78, 6] },
    ],
    front: (id, defs) => `
      <path d="M222 60 C214 62 206 64 198 64" stroke="#1a2430" stroke-width="1.3" fill="none"/>
      ${eye(id, defs, 203, 52, 4.2, '#d4dbe2', '#4c5560')}`,
  });
}

// ——— Сом ———
export function catfishArt(uid) {
  const body = 'M18 60 C30 54 60 44 100 42 C140 40 180 40 205 46 C222 50 230 56 230 62 C230 68 220 72 205 74 C175 80 140 80 100 78 C60 76 30 68 18 64 Z';
  const blots = [[44, 55, 8, 4], [64, 49, 10, 4.5], [86, 56, 7, 4], [104, 47, 11, 4.5], [124, 55, 9, 4], [142, 46, 10, 4], [160, 54, 9, 4], [180, 47, 9, 4],
    [198, 53, 7, 3.5], [74, 63, 8, 3], [114, 66, 10, 3], [152, 66, 9, 3], [188, 63, 7, 3], [56, 61, 6, 3], [134, 61, 6, 2.5]];
  return fishSvg(uid, {
    label: 'Сом', body,
    colors: [[0, '#0e100e'], [0.38, '#262a24'], [0.62, '#41463c'], [0.84, '#868373'], [1, '#b8b3a0']],
    spec: [135, 50, 70, 3, -1], gloss: 0.28, grain: 1.4, noise: 0.22,
    gill: 'M200 49 C196 56 196 65 200 71',
    pattern: id => `<g filter="url(#${id('b2')})" fill="#0b0d0a" opacity=".55">${blots.map(([x, y, rx, ry]) =>
      `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}</g>
      <g fill="#c9c3ac" opacity=".35" filter="url(#${id('b1')})">${[[60, 70], [92, 72], [126, 73], [168, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`,
    backFins: [
      { d: 'M22 60 C11 51 3 53 3 62 C3 71 11 73 22 66 Z', dir: 'left', fill: '#22251f', tip: '#4a4e44', rays: [22, 60, 22, 66, 3, 53, 3, 71, 10] },
      { d: 'M148 42 L146 31 L159 33 L164 41 Z', fill: '#22251f', tip: '#4a4e44', rays: [148, 42, 164, 41, 146, 31, 159, 33, 4] },
    ],
    frontFins: [
      { d: 'M28 66 C60 80 100 86 132 81 L130 76 C100 78 60 74 30 64 Z', dir: 'down', fill: '#2b2e27', tip: '#5a5d52', rays: [30, 65, 130, 76, 28, 68, 132, 81, 28] },
      { d: 'M140 78 L135 90 L150 79 Z', dir: 'down', fill: '#2b2e27', tip: '#5a5d52', rays: [140, 78, 150, 79, 135, 90, 137, 89, 5] },
      { d: 'M190 71 C183 80 177 88 170 93 L196 73 Z', dir: 'left', fill: '#2b2e27', tip: '#5a5d52', rays: [190, 71, 196, 73, 170, 93, 172, 92, 7] },
    ],
    front: (id, defs) => `
      <path d="M230 62 C222 65.5 214 65.5 207 62" stroke="#0b0d0a" stroke-width="1.5" fill="none"/>
      <path d="M229 64.5 C222 67 214 67 208 64.5" stroke="rgba(255,255,255,.18)" stroke-width=".7" fill="none"/>
      <g fill="none" stroke-linecap="round">
        <path d="M224 56 C236 50 239 32 231 16" stroke="#1a1c18" stroke-width="2.4"/>
        <path d="M224 56 C236 50 239 32 231 16" stroke="rgba(255,255,255,.18)" stroke-width=".7" transform="translate(-.6 -.4)"/>
        <path d="M226 58 C238 60 238 80 232 96" stroke="#1a1c18" stroke-width="2.1"/>
        <path d="M221 69 q6 8 2 15" stroke="#2a2c26" stroke-width="1.2"/><path d="M215 71 q4 8 0 13" stroke="#2a2c26" stroke-width="1.2"/>
        <path d="M210 72 q3 7 -1 11" stroke="#2a2c26" stroke-width="1"/>
      </g>
      ${eye(id, defs, 214, 53, 2.7, '#b8b38e', '#3b3a2c')}`,
  });
}

// ——— Голавль ———
export function chubArt(uid) {
  const body = 'M44 58 C66 50 96 40 130 38 C165 37 192 42 208 52 C216 57 218 62 214 66 C204 74 180 80 140 81 C100 82 66 74 44 66 Z';
  return fishSvg(uid, {
    label: 'Голавль', body,
    colors: [[0, '#222c33'], [0.28, '#4a5761'], [0.5, '#a39c7a'], [0.7, '#d6cfae'], [0.9, '#efeadb'], [1, '#f6f3ea']],
    scales: [7.6, 0.5], spec: [128, 48, 60, 3.4, -1],
    lateral: 'M48 61 C90 58 150 56 200 56',
    gill: 'M188 43 C179 54 179 66 190 77',
    backFins: [
      { d: 'M46 58 L15 35 C21 49 24 56 26 62 C24 68 21 75 15 89 L46 66 Z', dir: 'left', fill: '#2c3238', tip: '#4b535b', op1: 0.85, rays: [46, 58, 46, 66, 15, 35, 15, 89, 16],
        extra: '<path d="M15 35 C21 49 24 56 26 62 C24 68 21 75 15 89" stroke="#0c0e10" stroke-width="2.4" fill="none"/>' },
      { d: 'M112 40 L104 19 L114 17 L133 39 Z', fill: '#343b42', tip: '#5d666e', op1: 0.85, rays: [113, 40, 132, 39, 104, 19, 114, 17, 7] },
      { d: 'M84 75 C78 84 76 90 80 95 L106 84 L108 78 Z', dir: 'down', fill: '#c4441f', tip: '#ee6e3a', rays: [85, 75, 108, 78, 78, 88, 104, 85, 9] },
    ],
    frontFins: [
      { d: 'M134 80 L127 95 L147 82 Z', dir: 'down', fill: '#cc4c22', tip: '#f07a42', rays: [134, 80, 147, 82, 127, 95, 129, 94, 6] },
      { d: 'M181 67 L166 82 L186 71 Z', dir: 'left', fill: '#c27a3a', tip: '#e6a76a', op1: 0.5, rays: [181, 67, 186, 71, 166, 82, 168, 81, 6] },
    ],
    front: (id, defs) => `
      <path d="M216 62 L203 63.5" stroke="#1d2328" stroke-width="1.4"/>
      ${eye(id, defs, 197, 52, 4.8, '#d9a35a', '#5a3a14')}`,
  });
}
