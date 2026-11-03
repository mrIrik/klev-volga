import { PLACES, nearestPlace } from './places.js';
import { fetchWeather, mergeHistory, SOURCE_NAMES, loadCached, saveCache, clearCache, buildSeries, nowIndex, weatherText, windDirText } from './weather.js';
import { moonSvg } from './astro.js';
import { SPECIES, speciesById, seasonKey } from './fish.js';
import { scoreHour, summarize, verdict, scoreColor } from './model.js';

const LS = { place: 'klev:place', weights: 'klev:weights' };
const STALE_MS = 30 * 60 * 1000;
const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'нояб', 'дек'];
const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const loadJSON = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

// сохранённую точку из списка берём из актуального списка (там могли появиться новые поля)
function restorePlace(saved) {
  if (saved && saved.gps) return saved;
  return (saved && PLACES.find(p => p.id === saved.id)) || PLACES.find(p => p.id === 'samara');
}

const state = {
  place: restorePlace(loadJSON(LS.place)),
  entry: null,
  series: null,
  scores: null,
  days: [],
  hourOffset: 0,
  detailDay: null,
  loading: false,
  placeQuery: '',
  lastError: null,
};

const $ = s => document.querySelector(s);
const view = $('#view');
const fmt = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('ru-RU');
const signed = (x, d = 1) => (x > 0.05 ? '+' : x < -0.05 ? '−' : '±') + fmt(Math.abs(x), d);
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const placeKey = p => (p.gps ? 'gps' : p.id);

// ——— Данные ———

function recompute() {
  const e = state.entry;
  if (!e) { state.series = state.scores = null; state.days = []; return; }
  const series = buildSeries(e.raw, e.place.lat);
  const scores = {};
  for (const sp of SPECIES) {
    scores[sp.id] = series.hours.map(h => scoreHour(sp, h, series, sp.weights));
  }
  state.series = series;
  state.scores = scores;
  state.days = buildDays(series);
}

function buildDays(series) {
  const ni = nowIndex(series);
  const start = ni < 0 ? series.hours.length : ni;
  const firstKey = series.hours[start]?.lp.dayKey;
  const days = [];
  let cur = null, started = false;
  series.hours.forEach((h, i) => {
    if (h.lp.dayKey === firstKey) started = true;
    if (!started) return;
    if (!cur || cur.key !== h.lp.dayKey) { cur = { key: h.lp.dayKey, lp: h.lp, idx: [] }; days.push(cur); }
    cur.idx.push(i);
  });
  return days.filter(d => d.idx.length >= 12);
}

function currentIndex() {
  const ni = nowIndex(state.series);
  if (ni < 0) return -1;
  return Math.min(state.series.hours.length - 1, ni + state.hourOffset);
}

function bestWindow(spId, idxs) {
  const sc = state.scores[spId];
  let bi = idxs[0];
  for (const i of idxs) if (sc[i].pct > sc[bi].pct) bi = i;
  const max = sc[bi].pct;
  const tol = Math.max(3, max * 0.06);
  let a = bi, b = bi;
  while (idxs.includes(a - 1) && sc[a - 1].pct >= max - tol) a--;
  while (idxs.includes(b + 1) && sc[b + 1].pct >= max - tol) b++;
  const hs = state.series.hours;
  return { from: hs[a], to: hs[b], max, label: `${pad(hs[a].lp.h)}–${pad((hs[b].lp.h + 1) % 24)}` };
}

function dayScore(spId, day) {
  const p = day.idx.map(i => state.scores[spId][i].pct).sort((a, b) => b - a).slice(0, 4);
  return Math.round(p.reduce((a, b) => a + b, 0) / p.length);
}

function dayLabel(day, i) {
  if (i === 0) return 'Сегодня';
  if (i === 1) return 'Завтра';
  return `${WD[day.lp.wd]}, ${day.lp.d} ${MON[day.lp.m]}`;
}

function hourLabel(h) {
  const di = state.days.findIndex(d => d.key === h.lp.dayKey);
  const dl = di === 0 ? 'сегодня' : di === 1 ? 'завтра' : di > 1 ? `${h.lp.d} ${MON[h.lp.m]}` : '';
  return `${dl} ${pad(h.lp.h)}:00`.trim();
}

const timeOf = (unix, off) => { const d = new Date((unix + off) * 1000); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };

// ——— Загрузка ———

function loadEntryForPlace() {
  const e = loadCached(placeKey(state.place));
  const p = state.place;
  state.entry = e && e.place && Math.abs(e.place.lat - p.lat) < 0.05 && Math.abs(e.place.lon - p.lon) < 0.05 ? e : null;
  try { recompute(); } catch (err) {
    console.warn('Повреждённый кэш погоды', err);
    state.entry = null;
    recompute();
  }
}

async function refresh(force = false) {
  if (state.loading) return;
  const e = state.entry;
  if (!force && e && Date.now() - e.fetchedAt < STALE_MS) return;
  if (!navigator.onLine && e) { renderStatus(); if (force) toast('Нет сети — показаны сохранённые данные'); return; }
  state.loading = true;
  renderStatus();
  const p = state.place;
  try {
    const tz = p.tz != null ? p.tz * 3600 : -new Date().getTimezoneOffset() * 60;
    let raw = await fetchWeather(p.lat, p.lon, tz);
    if (placeKey(p) !== placeKey(state.place)) return;
    // у запасного источника нет прошлых часов — берём их из прежнего прогноза для трендов давления
    if (raw.source === 'met' && state.entry) raw = mergeHistory(raw, state.entry.raw);
    const entry = { raw, fetchedAt: Date.now(), place: { ...p } };
    const prev = state.entry;
    state.entry = entry;
    try { recompute(); } catch (err) {
      state.entry = prev;
      recompute();
      throw Object.assign(new Error(`Ошибка обработки данных: ${err.message}`), { kind: 'format' });
    }
    saveCache(placeKey(p), entry);
    state.lastError = null;
    if (force) toast('Прогноз обновлён');
  } catch (err) {
    state.lastError = { kind: err.kind || 'other', message: err.message || String(err) };
    toast(state.entry ? 'Не удалось обновить — показаны сохранённые данные' : 'Не удалось загрузить погоду');
    console.warn(err);
  } finally {
    state.loading = false;
    render();
  }
}

function setPlace(p) {
  state.place = p;
  saveJSON(LS.place, p);
  state.hourOffset = 0;
  state.detailDay = null;
  loadEntryForPlace();
  location.hash = '#/';
  render();
  refresh();
}

function locate() {
  if (!('geolocation' in navigator)) { toast('Геолокация недоступна на этом устройстве'); return; }
  toast('Определяем местоположение…');
  navigator.geolocation.getCurrentPosition(pos => {
    const pt = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    const near = nearestPlace(pt);
    const km = Math.round(near.km);
    setPlace({
      id: 'gps', gps: true, lat: pt.lat, lon: pt.lon,
      name: km <= 15 ? `${near.place.name} (GPS)` : 'Моё место',
      near: near.place.name, km,
    });
    if (km > 60) toast(`До Волги далеко: ближайшая точка — ${near.place.name}, ${km} км`);
  }, err => {
    toast(err.code === 1 ? 'Доступ к геолокации запрещён — выберите точку из списка' : 'Не удалось определить местоположение');
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 });
}

// ——— Общие элементы ———

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function renderStatus() {
  $('#placeName').textContent = state.place.name;
  $('#refreshBtn').classList.toggle('spin', state.loading);
  const e = state.entry;
  let s = '';
  if (state.loading && !e) s = 'Загрузка…';
  else if (e) {
    const d = new Date(e.fetchedAt);
    const age = Date.now() - e.fetchedAt;
    const t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    s = age < 20 * 3600 * 1000 ? `Обновлено в ${t}` : `Данные от ${d.getDate()} ${MON[d.getMonth()]}, ${t}`;
    if (!navigator.onLine) s += '<br><span class="off">офлайн</span>';
    else if (state.loading) s += '<br>обновление…';
  } else if (!navigator.onLine) s = '<span class="off">офлайн</span>';
  $('#status').innerHTML = s;
}

const bar = (pct, color) => `<div class="bar"><i style="width:${Math.max(2, pct)}%;background:${color || scoreColor(pct)}"></i></div>`;

function ring(pct, size = 92) {
  const r = size / 2 - 7, c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--card-2)" stroke-width="9"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${scoreColor(pct)}" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}"/></svg>
    <div class="num" style="color:${scoreColor(pct)}">${pct}%</div></div>`;
}

const ERROR_HINTS = {
  network: 'Серверы погоды (Open-Meteo и запасной MET Norway) недоступны из этой сети. Так бывает при ограничениях мобильного интернета или в корпоративном Wi-Fi. Попробуйте другую сеть или включите VPN один раз — прогноз сохранится на 8 дней.',
  timeout: 'Сервер погоды не ответил вовремя — вероятно, медленное соединение. Попробуйте ещё раз.',
  http: 'Сервер погоды вернул ошибку. Если это 429 — превышен лимит запросов с вашего IP, попробуйте позже или через другую сеть.',
  format: 'Сервер погоды прислал неожиданные данные.',
  other: 'Не удалось получить прогноз погоды.',
};

function emptyState() {
  if (state.loading) return `<div class="empty"><h2>Загружаем погоду…</h2><p>Open-Meteo, ${esc(state.place.name)}</p></div>`;
  const err = state.lastError;
  const hint = !navigator.onLine ? 'Нет сети, а сохранённых данных для этого места пока нет.' : ERROR_HINTS[err ? err.kind : 'other'] || ERROR_HINTS.other;
  return `<div class="empty"><h2>Нет данных</h2>
    <p>${hint}</p>
    <button class="btn" data-action="refresh">Повторить</button>
    ${err ? `<p class="small muted" style="margin-top:18px;word-break:break-word">Подробности: ${esc(err.message)}</p>` : ''}</div>`;
}

function staleNotice() {
  return `<div class="notice">Сохранённый прогноз закончился. Подключитесь к интернету и обновите данные.</div>`;
}

// ——— Главная ———

function condHtml(h) {
  const s = state.series;
  const arrow = Math.abs(h.d3) < 0.5 ? '→' : h.d3 > 0 ? '↗' : '↘';
  const cls = Math.abs(h.d3) < 0.5 ? '' : h.d3 > 0 ? 'trend-up' : 'trend-down';
  return `
    <div class="c"><div class="k">Воздух</div><div class="v">${signed(h.air, 0).replace('±', '')}°</div><div class="d">${weatherText(h.code)}</div></div>
    <div class="c"><div class="k">Вода</div><div class="v">≈${fmt(h.water)}°</div><div class="d">оценка</div></div>
    <div class="c"><div class="k">Давление</div><div class="v">${Math.round(h.p)} <span class="${cls}">${arrow}</span></div><div class="d">мм · ${signed(h.d3)}/3 ч</div></div>
    <div class="c"><div class="k">Ветер</div><div class="v">${fmt(h.wind)} м/с</div><div class="d">${windDirText(h.dir)}, порывы ${Math.round(h.gust)}</div></div>
    <div class="c"><div class="k">Облака</div><div class="v">${Math.round(h.cloud)}%</div><div class="d">${h.precip > 0 ? fmt(h.precip) + ' мм/ч' : 'без осадков'}</div></div>
    <div class="c"><div class="k">Луна</div><div class="v">${moonSvg(h.moon, 18)} ${Math.round(h.moon.illum * 100)}%</div><div class="d">${h.moon.name}</div></div>`;
}

function cardsHtml(i) {
  const hs = state.series.hours;
  const next = []; for (let k = i; k < Math.min(hs.length, i + 24); k++) next.push(k);
  return SPECIES.map(sp => {
    const r = state.scores[sp.id][i];
    const bw = bestWindow(sp.id, next);
    const when = bw.from.lp.dayKey === hs[i].lp.dayKey ? '' : 'завтра ';
    return `<a class="card fish-card" href="#/fish/${sp.id}">
      <div class="art">${sp.art('c-' + sp.id)}</div>
      <div class="row"><span class="name">${sp.name}</span><span class="pct" style="color:${scoreColor(r.pct)}">${r.pct}%</span></div>
      ${bar(r.pct)}
      <div class="verdict" style="color:${scoreColor(r.pct)}">${verdict(r.pct)}</div>
      <div class="best">${bw.max < 10 ? 'В ближайшие сутки клёва не ждём' : `Лучше: ${when}${bw.label} · ${bw.max}%`}</div>
    </a>`;
  }).join('');
}

function timeLabel(i) {
  const h = state.series.hours[i];
  return state.hourOffset === 0 ? `Сейчас, ${pad(h.lp.h)}:00` : hourLabel(h);
}

function renderHome() {
  if (!state.series) return emptyState();
  const i = currentIndex();
  if (i < 0) return staleNotice() + emptyState();
  const h = state.series.hours[i];
  const ni = nowIndex(state.series);
  const max = Math.min(71, state.series.hours.length - 1 - ni);
  const sun = h.day ? `Восход ${timeOf(h.day.sunrise, state.series.offset)} · закат ${timeOf(h.day.sunset, state.series.offset)}` : '';
  return `
    <h1 class="app-title">Клёв на Волге</h1>
    <div class="cond" id="cond">${condHtml(h)}</div>
    <div class="card timepick">
      <div class="row"><span>Прогноз на: <b id="tlabel">${timeLabel(i)}</b></span><span class="muted small" id="sun">${sun}</span></div>
      <input type="range" id="hourRange" min="0" max="${max}" step="1" value="${state.hourOffset}" aria-label="Час прогноза">
    </div>
    <div class="section"><h2>Вероятность клёва</h2><span class="sub">нажмите для деталей</span></div>
    <div class="grid" id="cards">${cardsHtml(i)}</div>`;
}

function updateHome() {
  const i = currentIndex();
  const h = state.series.hours[i];
  $('#cond').innerHTML = condHtml(h);
  $('#tlabel').textContent = timeLabel(i);
  $('#sun').textContent = h.day ? `Восход ${timeOf(h.day.sunrise, state.series.offset)} · закат ${timeOf(h.day.sunset, state.series.offset)}` : '';
  $('#cards').innerHTML = cardsHtml(i);
}

// ——— Детали ———

function hourlyChart(spId, day, markIdx) {
  const hs = state.series.hours;
  const sc = state.scores[spId];
  const W = 340, H = 150, padL = 8, padB = 18, padT = 16;
  const bw = (W - padL * 2) / 24;
  const off = state.series.offset;
  let bg = '', bars = '', labels = '';
  const sr = hs[day.idx[0]].day?.sunrise, ss = hs[day.idx[0]].day?.sunset;
  for (const i of day.idx) {
    const h = hs[i];
    const x = padL + h.lp.h * bw;
    const mid = h.t + 1800;
    if (sr && (mid < sr || mid > ss)) bg += `<rect x="${x}" y="${padT}" width="${bw + 0.5}" height="${H - padT - padB}" fill="var(--card-2)"/>`;
    const p = sc[i].pct;
    const bh = (H - padT - padB) * p / 100;
    bars += `<rect x="${x + 1.5}" y="${H - padB - bh}" width="${bw - 3}" height="${Math.max(1, bh)}" rx="2" fill="${scoreColor(p)}"/>`;
    if (h.lp.h % 3 === 0) labels += `<text x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${pad(h.lp.h)}</text>`;
    if (i === markIdx) bars += `<line class="now-line" x1="${x + bw / 2}" x2="${x + bw / 2}" y1="${padT - 6}" y2="${H - padB}" stroke-width="2" stroke-dasharray="3 2"/><text x="${x + bw / 2}" y="${padT - 8}" text-anchor="middle" style="fill:var(--accent);font-weight:700">${sc[i].pct}%</text>`;
  }
  const grid = [25, 50, 75].map(v => { const y = H - padB - (H - padT - padB) * v / 100; return `<line x1="${padL}" x2="${W - padL}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-dasharray="2 3"/>`; }).join('');
  void off;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Клёв по часам">${bg}${grid}${bars}${labels}</svg>`;
}

function renderDetail(id) {
  const sp = speciesById(id);
  if (!sp) return '<p>Вид не найден</p>';
  if (!state.series) return `<a class="back" href="#/">‹ Назад</a>` + emptyState();
  const i = currentIndex();
  if (i < 0) return `<a class="back" href="#/">‹ Назад</a>` + staleNotice();
  const h = state.series.hours[i];
  const res = state.scores[sp.id][i];
  const sum = summarize(res, sp);
  const curDay = state.days.findIndex(d => d.key === h.lp.dayKey);
  const dIdx = state.detailDay ?? Math.max(0, curDay);
  const day = state.days[Math.min(dIdx, state.days.length - 1)];
  const bwDay = bestWindow(sp.id, day.idx);
  const posIds = new Set(sum.pos.map(f => f.id)), negIds = new Set(sum.neg.map(f => f.id));
  const factors = [...res.factors].sort((a, b) => b.weight - a.weight);

  return `
    <a class="back" href="#/">‹ Все рыбы</a>
    <div class="card hero">
      <div class="art">${sp.art('d-' + sp.id)}</div>
      <div class="hero-head">
        ${ring(res.pct)}
        <div>
          <h1>${sp.name}</h1>
          <div class="latin">${sp.latin}</div>
          <div style="color:${scoreColor(res.pct)};font-weight:700;margin-top:4px">${verdict(res.pct)}</div>
          <div class="muted small">${timeLabel(i)} · ${esc(state.place.name)}</div>
        </div>
      </div>
      <div class="summary">${sum.text}</div>
    </div>

    <div class="section"><h2>Почему такой прогноз</h2><span class="sub">нажмите на фактор</span></div>
    <div class="card factors">
      ${factors.map(f => `
        <div class="factor" data-action="toggle">
          <div class="top"><span class="fname">${f.name}
            ${posIds.has(f.id) ? '<span class="badge pos">помогает</span>' : negIds.has(f.id) ? '<span class="badge neg">мешает</span>' : ''}</span>
            <span class="fval">${f.value}</span><span class="fscore" style="color:${scoreColor(f.score * 100)}">${Math.round(f.score * 100)}</span></div>
          <div class="meta">${bar(Math.round(f.score * 100))}</div>
          <div class="note">${f.note}</div>
        </div>`).join('')}
      <div class="factor" style="cursor:default"><div class="small muted">
        Сводная оценка факторов: <b>${Math.round(res.shaped * 100)}%</b>${res.gates.map(g => ` × ${g.name} ${fmt(g.k, 2)}`).join('')}${res.storm ? ' × шторм 0,55' : ''} = <b>${res.pct}%</b>.</div></div>
    </div>

    <div class="section" id="hourly"><h2>По часам</h2><span class="sub">лучшее: ${bwDay.label}, ${bwDay.max}%</span></div>
    <div class="chips">${state.days.map((d, k) => `<button class="chip ${d === day ? 'active' : ''}" data-action="day" data-day="${k}">${dayLabel(d, k)}</button>`).join('')}</div>
    <div class="card chart">${hourlyChart(sp.id, day, i)}
      <div class="small muted" style="padding:4px 6px 0">Серым — тёмное время суток. Пунктир — выбранный час.</div></div>

    <div class="section"><h2>По дням</h2><span class="sub">среднее 4 лучших часов</span></div>
    <div class="card daylist">
      ${state.days.map((d, k) => {
        const p = dayScore(sp.id, d), bw = bestWindow(sp.id, d.idx);
        return `<div class="drow" data-action="day" data-day="${k}" data-scroll="1">
          <div class="dname"><b>${dayLabel(d, k)}</b><span class="small muted">${p < 10 ? 'не клюёт' : 'лучше ' + bw.label}</span></div>
          <div class="dbar">${bar(p)}</div><div class="dpct" style="color:${scoreColor(p)}">${p}%</div></div>`;
      }).join('')}
    </div>

    <div class="section"><h2>Советы</h2><span class="sub">по сезону</span></div>
    <div class="card tips">${sp.tips[seasonKey(h.lp.m)]}</div>`;
}

// ——— По дням ———

function pressureChart() {
  const s = state.series, hs = s.hours;
  const ni = nowIndex(s);
  const from = Math.max(0, ni - 48);
  const pts = hs.slice(from);
  const W = 340, H = 130, pl = 30, pr = 8, pt = 10, pb = 20;
  const ps = pts.map(h => h.p);
  let lo = Math.floor(Math.min(...ps, s.pNorm) - 2), hi = Math.ceil(Math.max(...ps, s.pNorm) + 2);
  const x = k => pl + (W - pl - pr) * k / (pts.length - 1);
  const y = v => pt + (H - pt - pb) * (hi - v) / (hi - lo);
  const line = pts.map((h, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${y(h.p).toFixed(1)}`).join('');
  let ticks = '';
  pts.forEach((h, k) => {
    if (h.lp.h === 0) ticks += `<line x1="${x(k)}" x2="${x(k)}" y1="${pt}" y2="${H - pb}" stroke="var(--line)"/><text x="${x(k) + 2}" y="${H - 6}">${h.lp.d}</text>`;
  });
  const nx = x(ni - from);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Давление">
    ${ticks}
    <line x1="${pl}" x2="${W - pr}" y1="${y(s.pNorm)}" y2="${y(s.pNorm)}" stroke="var(--muted)" stroke-dasharray="4 3" opacity=".6"/>
    <text x="${pl - 4}" y="${y(hi) + 8}" text-anchor="end">${hi}</text><text x="${pl - 4}" y="${y(lo)}" text-anchor="end">${lo}</text>
    <text x="${pl - 4}" y="${y(s.pNorm) + 3}" text-anchor="end">${Math.round(s.pNorm)}</text>
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round"/>
    <line class="now-line" x1="${nx}" x2="${nx}" y1="${pt}" y2="${H - pb}" stroke-width="1.5" stroke-dasharray="3 2"/>
  </svg>`;
}

function renderDays() {
  if (!state.series) return emptyState();
  if (nowIndex(state.series) < 0) return staleNotice();
  const hs = state.series.hours;
  return `
    <div class="section" style="margin-top:4px"><h2>Давление, мм рт. ст.</h2><span class="sub">пунктир — норма</span></div>
    <div class="card chart">${pressureChart()}</div>
    <div class="section"><h2>Прогноз по дням</h2><span class="sub">${state.days.length} дн.</span></div>
    ${state.days.map((d, k) => {
      const H = d.idx.map(i => hs[i]);
      const tmin = Math.min(...H.map(h => h.air)), tmax = Math.max(...H.map(h => h.air));
      const wmax = Math.max(...H.map(h => h.wind));
      const rain = H.reduce((a, h) => a + h.precip, 0);
      const dp = H[H.length - 1].p - H[0].p;
      const noon = H.find(h => h.lp.h === 13) || H[Math.floor(H.length / 2)];
      const ranked = SPECIES.map(sp => ({ sp, p: dayScore(sp.id, d) })).sort((a, b) => b.p - a.p);
      return `<div class="card day-card">
        <div class="dh"><h3>${dayLabel(d, k)}${k < 2 ? `, <span class="muted" style="font-weight:500">${d.lp.d} ${MON[d.lp.m]}</span>` : ''}</h3>
          <span class="small muted">лучше всех: <b style="color:${scoreColor(ranked[0].p)}">${ranked[0].sp.name}</b></span></div>
        <div class="wx">
          <span>${weatherText(noon.code)}</span>
          <span>${Math.round(tmin)}…${Math.round(tmax)}°</span>
          <span>${Math.round(H[0].p)}→${Math.round(H[H.length - 1].p)} мм (${signed(dp)})</span>
          <span>ветер до ${fmt(wmax)} м/с</span>
          ${rain > 0.2 ? `<span>осадки ${fmt(rain)} мм</span>` : ''}
          <span>${moonSvg(noon.moon, 15)} ${noon.moon.name}</span>
        </div>
        <div class="sp-grid">${SPECIES.map(sp => {
          const p = dayScore(sp.id, d);
          return `<a class="sp-cell" href="#/fish/${sp.id}?d=${k}"><div class="n">${sp.name}</div>
            <div class="p" style="color:${scoreColor(p)}">${p}%</div><div class="b">${p < 10 ? 'не клюёт' : 'лучше ' + bestWindow(sp.id, d.idx).label}</div></a>`;
        }).join('')}</div>
      </div>`;
    }).join('')}`;
}

// ——— Место ———

function renderPlace() {
  const q = state.placeQuery.trim().toLowerCase();
  const list = PLACES.filter(p => !q || p.name.toLowerCase().includes(q));
  const groups = {};
  list.forEach(p => (groups[p.part] = groups[p.part] || []).push(p));
  const cur = state.place;
  return `
    <button class="btn block" data-action="gps">
      <svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" stroke-width="2"/></svg>
      Определить по GPS</button>
    ${cur.gps ? `<p class="small muted">Сейчас: ${fmt(cur.lat, 3)}, ${fmt(cur.lon, 3)} · ближайшая точка на Волге — ${esc(cur.near)}, ${cur.km} км</p>` : ''}
    <div class="section"><h2>Точки на Волге</h2><span class="sub">от Твери до Астрахани</span></div>
    <input class="search" id="placeSearch" type="search" placeholder="Поиск города" value="${esc(state.placeQuery)}" autocomplete="off">
    <div id="plist">${Object.entries(groups).map(([part, ps]) => `
      <div class="section"><h2 style="font-size:15px" class="muted">${part}</h2></div>
      <div class="card plist">${ps.map(p => `<div class="pitem ${!cur.gps && cur.id === p.id ? 'sel' : ''}" data-action="place" data-id="${p.id}">
        <span>${p.name}</span><span class="km">${!cur.gps && cur.id === p.id ? '✓' : `${fmt(p.lat, 2)}° с. ш.`}</span></div>`).join('')}</div>`).join('') || '<p class="muted">Ничего не найдено</p>'}</div>`;
}

// ——— Настройки модели ———

function renderSettings() {
  const e = state.entry;
  return `
    <div class="section" style="margin-top:4px"><h2>Данные</h2></div>
    <div class="card about">
      <p>Основной источник погоды — Open-Meteo: давление у поверхности, ветер и порывы, температура, облачность, осадки за 7 прошедших и 8 будущих дней. Если он недоступен из вашей сети, приложение само переключается на MET Norway (метеослужба Норвегии, прогноз на 10 дней без истории — тренды давления первые часы считаются по прогнозу).
      ${e ? `Последнее обновление: ${new Date(e.fetchedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}, источник — ${SOURCE_NAMES[e.raw.source || 'om']}.` : ''}</p>
      <p>Без сети приложение показывает последний сохранённый прогноз для выбранного места.</p>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn" style="flex:1" data-action="refresh">Обновить</button>
        <button class="btn secondary" style="flex:1" data-action="clear-cache">Очистить кэш</button>
      </div>
    </div>

    <div class="section"><h2>Как считается прогноз</h2></div>
    <div class="card about">
      <p>Для каждого вида задана своя модель: предпочтения по сезону, температуре воды, уровню и тренду давления, ветру, облачности, осадкам, времени суток относительно восхода и заката и фазе луны. Каждый фактор даёт оценку 0–100.</p>
      <p>Важность факторов для каждого вида уже подобрана. Оценки сводятся взвешенным гармоническим средним: один плохой фактор тянет итог вниз сильнее, чем хороший — вверх. Если вид не в сезоне, вода для него слишком холодная или тёплая или сейчас не его время суток, итог дополнительно снижается; при штормовом ветре — почти вдвое.</p>
      <p>Температура воды оценивается по климатической норме для широты и сглаженной температуре воздуха за последние дни — это приближение, а не замер.</p>
      <p>Прогноз — ориентир, а не гарантия. Соблюдайте правила рыболовства и сроки нерестовых запретов вашего региона.</p>
    </div>`;
}

// ——— Роутер ———

function parseHash() {
  const [path, qs] = (location.hash || '#/').slice(1).split('?');
  const parts = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  return { parts, query };
}

let lastRoute = '';
function render() {
  renderStatus();
  const { parts, query } = parseHash();
  const tab = parts[0] === 'days' ? 'days' : parts[0] === 'place' ? 'place' : parts[0] === 'settings' ? 'settings' : 'home';
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  let html;
  if (parts[0] === 'fish') {
    if (query.d != null && location.hash !== lastRoute) state.detailDay = +query.d;
    html = renderDetail(parts[1]);
  } else if (parts[0] === 'days') html = renderDays();
  else if (parts[0] === 'place') html = renderPlace();
  else if (parts[0] === 'settings') html = renderSettings();
  else html = renderHome();
  view.innerHTML = html;
  const routeChanged = location.hash !== lastRoute;
  lastRoute = location.hash;
  return routeChanged;
}

window.addEventListener('hashchange', () => {
  const { parts, query } = parseHash();
  if (parts[0] === 'fish' && query.d == null) state.detailDay = null;
  render();
  window.scrollTo(0, 0);
});

// ——— События ———

view.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'toggle') el.classList.toggle('open');
  else if (a === 'refresh') refresh(true);
  else if (a === 'gps') locate();
  else if (a === 'place') setPlace(PLACES.find(p => p.id === el.dataset.id));
  else if (a === 'day') {
    state.detailDay = +el.dataset.day;
    render();
    if (el.dataset.scroll) document.getElementById('hourly')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (a === 'clear-cache') { clearCache(); state.entry = null; recompute(); render(); refresh(true); }
});

view.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'hourRange') { state.hourOffset = +t.value; updateHome(); }
  else if (t.id === 'placeSearch') {
    state.placeQuery = t.value;
    const tmp = document.createElement('div');
    tmp.innerHTML = renderPlace();
    $('#plist').innerHTML = tmp.querySelector('#plist').innerHTML;
  }
});

$('#refreshBtn').addEventListener('click', () => refresh(true));
window.addEventListener('online', () => { renderStatus(); refresh(); });
window.addEventListener('offline', renderStatus);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  state.days = state.series ? buildDays(state.series) : [];
  render();
  refresh();
});

// ——— Старт ———

try { localStorage.removeItem(LS.weights); } catch { /* ignore */ } // веса больше не настраиваются
loadEntryForPlace();
render();
refresh();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW', err)));
  // новая версия приложения установилась — перезагружаем страницу один раз
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) return;
    reloaded = true;
    location.reload();
  });
}
