// Загрузка погоды из Open-Meteo, кэш и производные величины
import { moonInfo } from './astro.js';

const API = 'https://api.open-meteo.com/v1/forecast';
const HPA_TO_MM = 0.750062;
const CACHE_PREFIX = 'klev:weather:';

export async function fetchWeather(lat, lon) {
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
  const url = `${API}?${params}`;
  let lastErr;
  // две попытки: мобильная сеть часто теряет первый запрос
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchOnce(url, attempt === 0 ? 20000 : 30000);
    } catch (err) {
      lastErr = err;
      if (err.kind === 'http' && err.status !== 429 && err.status < 500) break;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

function weatherError(kind, message, status) {
  const e = new Error(message);
  e.kind = kind;
  e.status = status;
  return e;
}

async function fetchOnce(url, timeoutMs) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, ctrl ? { signal: ctrl.signal } : {});
  } catch (err) {
    throw err && err.name === 'AbortError'
      ? weatherError('timeout', `Нет ответа от Open-Meteo за ${timeoutMs / 1000} с`)
      : weatherError('network', `Сетевая ошибка: ${(err && err.message) || err}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res.ok) throw weatherError('http', `Open-Meteo ответил ${res.status}`, res.status);
  let raw;
  try { raw = await res.json(); } catch { throw weatherError('format', 'Ответ Open-Meteo не читается'); }
  if (!raw || !raw.hourly || !raw.hourly.time || !raw.daily) throw weatherError('format', raw && raw.reason ? `Open-Meteo: ${raw.reason}` : 'Некорректный ответ Open-Meteo');
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
    const back = k => hours[Math.max(0, i - k)];
    h.d3 = h.p - back(3).p;
    h.d24 = h.p - back(24).p;
    h.t24 = h.air - back(24).air;
    h.hasHistory = i >= 24;
  }
  return {
    hours,
    offset: off,
    elevation: raw.elevation ?? 0,
    pNorm: pressureNorm(raw.elevation),
    tz: raw.timezone_abbreviation || raw.timezone || '',
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
