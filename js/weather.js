// Загрузка погоды из Open-Meteo, кэш и производные величины
import { moonInfo, sunTimes } from './astro.js';

const API = 'https://api.open-meteo.com/v1/forecast';
const HPA_TO_MM = 0.750062;
const CACHE_PREFIX = 'klev:weather:';

// Источники погоды по очереди: Open-Meteo (с историей за 7 дней) и MET Norway (запасной,
// если Open-Meteo недоступен из сети). Последний сработавший источник пробуем первым.
const SOURCE_KEY = 'klev:source';
export const SOURCE_NAMES = { om: 'Open-Meteo', met: 'MET Norway' };

export async function fetchWeather(lat, lon, tzOffset) {
  let preferred = 'om';
  try { preferred = localStorage.getItem(SOURCE_KEY) || 'om'; } catch { /* ignore */ }
  const order = preferred === 'met' ? ['met', 'om'] : ['om', 'met'];
  const errors = [];
  let firstErr = null;
  for (const src of order) {
    try {
      const raw = src === 'om' ? await fetchOpenMeteo(lat, lon) : await fetchMet(lat, lon, tzOffset);
      raw.source = src;
      try { localStorage.setItem(SOURCE_KEY, src); } catch { /* ignore */ }
      return raw;
    } catch (err) {
      errors.push(`${SOURCE_NAMES[src]}: ${err.message}`);
      firstErr = firstErr || err;
    }
  }
  throw weatherError(firstErr.kind, errors.join('; '), firstErr.status);
}

function fetchOpenMeteo(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: 'temperature_2m,surface_pressure,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code',
    daily: 'sunrise,sunset',
    timezone: 'auto',
    timeformat: 'unixtime',
    wind_speed_unit: 'ms',
    past_days: '7',
    forecast_days: '8',
  });
  return fetchJson(`${API}?${params}`, 15000, 'Open-Meteo').then(raw => {
    if (!raw || !raw.hourly || !raw.hourly.time || !raw.daily) throw weatherError('format', raw && raw.reason ? raw.reason : 'некорректный ответ');
    return raw;
  });
}

function weatherError(kind, message, status) {
  const e = new Error(message);
  e.kind = kind;
  e.status = status;
  return e;
}

async function fetchJson(url, timeoutMs, name) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, ctrl ? { signal: ctrl.signal } : {});
  } catch (err) {
    throw err && err.name === 'AbortError'
      ? weatherError('timeout', `нет ответа за ${timeoutMs / 1000} с`)
      : weatherError('network', `сетевая ошибка (${(err && err.message) || err})`);
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res.ok) throw weatherError('http', `${name} ответил ${res.status}`, res.status);
  try { return await res.json(); } catch { throw weatherError('format', 'ответ не читается'); }
}

// ——— MET Norway → формат Open-Meteo ———

const MET_API = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';

async function fetchMet(lat, lon, tzOffset) {
  const json = await fetchJson(`${MET_API}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, 15000, 'MET Norway');
  if (!json || !json.properties || !json.properties.timeseries || !json.properties.timeseries.length) throw weatherError('format', 'некорректный ответ');
  return metToRaw(json, lat, lon, tzOffset);
}

function metCode(sym) {
  const s = sym || '';
  if (s.includes('thunder')) return 95;
  if (s.includes('snow')) return s.includes('heavy') ? 75 : s.includes('light') ? 71 : 73;
  if (s.includes('sleet')) return 66;
  if (s.includes('rainshowers')) return s.includes('heavy') ? 82 : s.includes('light') ? 80 : 81;
  if (s.includes('rain')) return s.includes('heavy') ? 65 : s.includes('light') ? 61 : 63;
  if (s.includes('fog')) return 45;
  if (s.startsWith('cloudy')) return 3;
  if (s.startsWith('partlycloudy')) return 2;
  if (s.startsWith('fair')) return 1;
  return 0;
}

function metToRaw(json, lat, lon, off) {
  const elevation = (json.geometry && json.geometry.coordinates && json.geometry.coordinates[2]) || 0;
  const k = Math.exp(-elevation / 8400); // давление на уровне моря → у поверхности
  const pts = json.properties.timeseries.map(e => {
    const d = e.data.instant.details;
    const n1 = e.data.next_1_hours, n6 = e.data.next_6_hours;
    return {
      t: Date.parse(e.time) / 1000,
      temp: d.air_temperature, p: d.air_pressure_at_sea_level * k, cloud: d.cloud_area_fraction,
      wind: d.wind_speed, dir: d.wind_from_direction, gust: d.wind_speed_of_gust,
      precip: n1 ? n1.details.precipitation_amount : n6 ? n6.details.precipitation_amount / 6 : 0,
      code: metCode((n1 || n6 || e.data.next_12_hours || { summary: {} }).summary.symbol_code),
    };
  }).filter(x => x.temp != null && x.p > 0);
  const H = { time: [], temperature_2m: [], surface_pressure: [], cloud_cover: [], precipitation: [], wind_speed_10m: [], wind_direction_10m: [], wind_gusts_10m: [], weather_code: [] };
  let j = 0;
  for (let t = Math.ceil(pts[0].t / 3600) * 3600; t <= pts[pts.length - 1].t; t += 3600) {
    while (j < pts.length - 2 && pts[j + 1].t <= t) j++;
    const a = pts[j], b = pts[Math.min(j + 1, pts.length - 1)];
    const f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
    const lerp = key => a[key] + (b[key] - a[key]) * f;
    const near = f < 0.5 ? a : b;
    H.time.push(t);
    H.temperature_2m.push(lerp('temp'));
    H.surface_pressure.push(lerp('p'));
    H.cloud_cover.push(lerp('cloud'));
    H.precipitation.push(a.precip);
    H.wind_speed_10m.push(lerp('wind'));
    H.wind_direction_10m.push(near.dir);
    H.wind_gusts_10m.push(a.gust != null && b.gust != null ? lerp('gust') : lerp('wind') * 1.6);
    H.weather_code.push(near.code);
  }
  // восход и закат по каждой местной дате прогноза
  const daily = { time: [], sunrise: [], sunset: [] };
  const first = H.time[0] + off, last = H.time[H.time.length - 1] + off;
  for (let d = Math.floor(first / 86400) * 86400; d <= last; d += 86400) {
    const dt = new Date(d * 1000);
    const st = sunTimes(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), lat, lon);
    daily.time.push(d - off);
    daily.sunrise.push(st.rise);
    daily.sunset.push(st.set);
  }
  return { hourly: H, daily, utc_offset_seconds: off, elevation, timezone_abbreviation: `UTC+${off / 3600}` };
}

// Подставляет прошлые часы из прежнего прогноза (нужно для трендов давления у источника без истории)
export function mergeHistory(raw, prev) {
  if (!prev || !prev.hourly || !prev.hourly.time || !raw.hourly.time.length) return raw;
  const start = raw.hourly.time[0], from = start - 7 * 86400;
  const idx = prev.hourly.time.map((t, i) => (t >= from && t < start ? i : -1)).filter(i => i >= 0);
  if (!idx.length) return raw;
  if (Object.keys(raw.hourly).some(key => !prev.hourly[key])) return raw;
  // источники считают давление немного по-разному — выравниваем старые значения на стыке,
  // чтобы не получить ложный скачок давления
  const oldP = prev.hourly.surface_pressure, last = idx[idx.length - 1];
  const shift = raw.hourly.time[0] - prev.hourly.time[last] <= 3 * 3600 ? raw.hourly.surface_pressure[0] - oldP[last] : 0;
  for (const key of Object.keys(raw.hourly)) {
    const old = prev.hourly[key];
    raw.hourly[key] = idx.map(i => (key === 'surface_pressure' ? old[i] + shift : old[i])).concat(raw.hourly[key]);
  }
  const days = new Map();
  prev.daily.time.forEach((t, i) => days.set(t, [prev.daily.sunrise[i], prev.daily.sunset[i]]));
  raw.daily.time.forEach((t, i) => days.set(t, [raw.daily.sunrise[i], raw.daily.sunset[i]]));
  const keys = [...days.keys()].sort((a, b) => a - b);
  raw.daily = { time: keys, sunrise: keys.map(t => days.get(t)[0]), sunset: keys.map(t => days.get(t)[1]) };
  return raw;
}

export function loadCached(key) {
  try {
    const s = localStorage.getItem(CACHE_PREFIX + key);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function saveCache(key, entry) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry)); } catch { /* квота — не критично */ }
}

export function clearCache() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

// Средняя температура воды на середину месяца (средняя Волга, ~53° с. ш.)
const WATER_CLIM = [0.4, 0.4, 0.6, 3.5, 11.5, 18.5, 22.5, 21, 15.5, 9, 3.5, 1];

function waterClimate(localSec, lat) {
  const d = new Date(localSec * 1000);
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const len = new Date(Date.UTC(d.getUTCFullYear(), m + 1, 0)).getUTCDate();
  const pos = m + (day - 0.5) / len - 0.5; // 0 = середина января
  const i0 = Math.floor(pos), f = pos - i0;
  const a = WATER_CLIM[(i0 + 12) % 12], b = WATER_CLIM[(i0 + 13) % 12];
  const base = a + (b - a) * f;
  const warm = base > 5;
  return Math.max(0.3, base + (53 - lat) * (warm ? 0.4 : 0.15));
}

export function localParts(localSec) {
  const d = new Date(localSec * 1000);
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(),
    h: d.getUTCHours(), min: d.getUTCMinutes(), wd: d.getUTCDay(),
    dayKey: `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`,
  };
}

// Нормальное давление на высоте станции, мм рт. ст.
export function pressureNorm(elevation) {
  return 760 * Math.exp(-(elevation || 0) / 8400);
}

// Превращает ответ API в ряд часов с трендами и оценкой температуры воды
export function buildSeries(raw, lat) {
  const H = raw.hourly;
  const off = raw.utc_offset_seconds || 0;
  const n = H.time.length;
  const days = new Map();
  raw.daily.time.forEach((t, i) => {
    const key = localParts(t + off).dayKey;
    days.set(key, { start: t, sunrise: raw.daily.sunrise[i], sunset: raw.daily.sunset[i] });
  });

  const hours = [];
  let ema = null;
  const alpha = 1 / (24 * 4); // инерция воды ~4 суток
  for (let i = 0; i < n; i++) {
    const t = H.time[i];
    const air = H.temperature_2m[i];
    const p = H.surface_pressure[i];
    if (air == null || p == null) continue;
    const clim = waterClimate(t + off, lat);
    ema = ema == null ? clim : ema + alpha * (air - ema);
    const water = Math.max(0.3, Math.min(30, 0.55 * clim + 0.45 * Math.max(0.3, ema)));
    const lp = localParts(t + off);
    hours.push({
      t, lp,
      air,
      p: p * HPA_TO_MM,
      cloud: H.cloud_cover[i] ?? 0,
      precip: H.precipitation[i] ?? 0,
      wind: H.wind_speed_10m[i] ?? 0,
      gust: H.wind_gusts_10m[i] ?? 0,
      dir: H.wind_direction_10m[i] ?? 0,
      code: H.weather_code[i] ?? 0,
      water,
      day: days.get(lp.dayKey) || null,
      moon: moonInfo(t),
    });
  }
  // тренды: давление за 3 ч и 24 ч, температура воздуха за 24 ч
  for (let i = 0; i < hours.length; i++) {
    const h = hours[i];
    // без истории (начало ряда) берём изменение по прогнозу вперёд
    const diff = (k, key) => i >= k ? h[key] - hours[i - k][key] : hours[Math.min(hours.length - 1, k)][key] - hours[0][key];
    h.d3 = diff(3, 'p');
    h.d24 = diff(24, 'p');
    h.t24 = diff(24, 'air');
    h.hasHistory = i >= 24;
  }
  return {
    hours,
    offset: off,
    elevation: raw.elevation ?? 0,
    pNorm: pressureNorm(raw.elevation),
    tz: raw.timezone_abbreviation || raw.timezone || '',
    source: raw.source || 'om',
  };
}

export function nowIndex(series, unixNow = Date.now() / 1000) {
  const hs = series.hours;
  if (!hs.length) return -1;
  if (unixNow < hs[0].t) return 0;
  if (unixNow > hs[hs.length - 1].t + 3600) return -1;
  let idx = 0;
  for (let i = 0; i < hs.length; i++) { if (hs[i].t <= unixNow) idx = i; else break; }
  return idx;
}

const WMO = {
  0: 'Ясно', 1: 'Малооблачно', 2: 'Переменная облачность', 3: 'Пасмурно',
  45: 'Туман', 48: 'Изморозь', 51: 'Морось', 53: 'Морось', 55: 'Сильная морось',
  56: 'Ледяная морось', 57: 'Ледяная морось', 61: 'Небольшой дождь', 63: 'Дождь', 65: 'Ливень',
  66: 'Ледяной дождь', 67: 'Ледяной дождь', 71: 'Небольшой снег', 73: 'Снег', 75: 'Сильный снег',
  77: 'Снежная крупа', 80: 'Ливневый дождь', 81: 'Ливневый дождь', 82: 'Сильный ливень',
  85: 'Снегопад', 86: 'Сильный снегопад', 95: 'Гроза', 96: 'Гроза с градом', 99: 'Гроза с градом',
};
export const weatherText = code => WMO[code] || '—';

const DIRS = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
export const windDirText = deg => DIRS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
