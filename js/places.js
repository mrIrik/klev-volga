// Точки на Волге от Твери до Астрахани (координаты у русла, tz — смещение от UTC в часах)
export const PLACES = [
  { id: 'tver', name: 'Тверь', lat: 56.859, lon: 35.912, tz: 3, part: 'Верхняя Волга' },
  { id: 'konakovo', name: 'Конаково', lat: 56.708, lon: 36.763, tz: 3, part: 'Верхняя Волга' },
  { id: 'dubna', name: 'Дубна', lat: 56.737, lon: 37.169, tz: 3, part: 'Верхняя Волга' },
  { id: 'kimry', name: 'Кимры', lat: 56.873, lon: 37.355, tz: 3, part: 'Верхняя Волга' },
  { id: 'kalyazin', name: 'Калязин', lat: 57.240, lon: 37.856, tz: 3, part: 'Верхняя Волга' },
  { id: 'uglich', name: 'Углич', lat: 57.527, lon: 38.331, tz: 3, part: 'Верхняя Волга' },
  { id: 'myshkin', name: 'Мышкин', lat: 57.786, lon: 38.453, tz: 3, part: 'Верхняя Волга' },
  { id: 'rybinsk', name: 'Рыбинск', lat: 58.048, lon: 38.858, tz: 3, part: 'Верхняя Волга' },
  { id: 'yaroslavl', name: 'Ярославль', lat: 57.626, lon: 39.894, tz: 3, part: 'Верхняя Волга' },
  { id: 'kostroma', name: 'Кострома', lat: 57.767, lon: 40.926, tz: 3, part: 'Верхняя Волга' },
  { id: 'ples', name: 'Плёс', lat: 57.460, lon: 41.512, tz: 3, part: 'Верхняя Волга' },
  { id: 'kineshma', name: 'Кинешма', lat: 57.442, lon: 42.159, tz: 3, part: 'Верхняя Волга' },
  { id: 'yurievets', name: 'Юрьевец', lat: 57.317, lon: 43.111, tz: 3, part: 'Верхняя Волга' },
  { id: 'puchezh', name: 'Пучеж', lat: 56.982, lon: 43.168, tz: 3, part: 'Верхняя Волга' },
  { id: 'gorodets', name: 'Городец', lat: 56.645, lon: 43.473, tz: 3, part: 'Верхняя Волга' },
  { id: 'nnovgorod', name: 'Нижний Новгород', lat: 56.327, lon: 44.006, tz: 3, part: 'Средняя Волга' },
  { id: 'lyskovo', name: 'Лысково', lat: 56.026, lon: 45.035, tz: 3, part: 'Средняя Волга' },
  { id: 'vasilsursk', name: 'Васильсурск', lat: 56.133, lon: 45.990, tz: 3, part: 'Средняя Волга' },
  { id: 'kozmodemyansk', name: 'Козьмодемьянск', lat: 56.335, lon: 46.567, tz: 3, part: 'Средняя Волга' },
  { id: 'cheboksary', name: 'Чебоксары', lat: 56.146, lon: 47.251, tz: 3, part: 'Средняя Волга' },
  { id: 'kazan', name: 'Казань', lat: 55.785, lon: 49.100, tz: 3, part: 'Средняя Волга' },
  { id: 'bolgar', name: 'Болгар', lat: 54.970, lon: 49.050, tz: 3, part: 'Средняя Волга' },
  { id: 'ulyanovsk', name: 'Ульяновск', lat: 54.315, lon: 48.403, tz: 4, part: 'Средняя Волга' },
  { id: 'tolyatti', name: 'Тольятти', lat: 53.508, lon: 49.420, tz: 4, part: 'Средняя Волга' },
  { id: 'zhigulevsk', name: 'Жигулёвск', lat: 53.400, lon: 49.500, tz: 4, part: 'Средняя Волга' },
  { id: 'samara', name: 'Самара', lat: 53.195, lon: 50.106, tz: 4, part: 'Средняя Волга' },
  { id: 'syzran', name: 'Сызрань', lat: 53.155, lon: 48.475, tz: 4, part: 'Средняя Волга' },
  { id: 'khvalynsk', name: 'Хвалынск', lat: 52.495, lon: 48.104, tz: 4, part: 'Средняя Волга' },
  { id: 'volsk', name: 'Вольск', lat: 52.045, lon: 47.375, tz: 4, part: 'Средняя Волга' },
  { id: 'balakovo', name: 'Балаково', lat: 52.030, lon: 47.800, tz: 4, part: 'Средняя Волга' },
  { id: 'saratov', name: 'Саратов', lat: 51.533, lon: 46.034, tz: 4, part: 'Нижняя Волга' },
  { id: 'kamyshin', name: 'Камышин', lat: 50.083, lon: 45.407, tz: 3, part: 'Нижняя Волга' },
  { id: 'volgograd', name: 'Волгоград', lat: 48.708, lon: 44.513, tz: 3, part: 'Нижняя Волга' },
  { id: 'chyorny-yar', name: 'Чёрный Яр', lat: 48.060, lon: 46.110, tz: 4, part: 'Нижняя Волга' },
  { id: 'akhtubinsk', name: 'Ахтубинск', lat: 48.278, lon: 46.166, tz: 4, part: 'Нижняя Волга' },
  { id: 'enotaevka', name: 'Енотаевка', lat: 47.250, lon: 47.070, tz: 4, part: 'Нижняя Волга' },
  { id: 'narimanov', name: 'Нариманов', lat: 46.690, lon: 47.850, tz: 4, part: 'Нижняя Волга' },
  { id: 'astrakhan', name: 'Астрахань', lat: 46.348, lon: 48.033, tz: 4, part: 'Нижняя Волга' },
  { id: 'kamyzyak', name: 'Камызяк (дельта)', lat: 46.110, lon: 48.070, tz: 4, part: 'Нижняя Волга' },
];

export function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestPlace(pt) {
  let best = null, bestD = Infinity;
  for (const p of PLACES) {
    const d = distanceKm(pt, p);
    if (d < bestD) { bestD = d; best = p; }
  }
  return { place: best, km: bestD };
}
