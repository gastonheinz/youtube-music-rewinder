/**
 * Agregacion de estadisticas sobre el dataset columnar.
 *
 * Todo se resuelve en una sola pasada sobre el rango pedido. Como el dataset
 * viene ordenado por fecha, acotar el rango son dos busquedas binarias y las
 * agrupaciones "por dia" y "por mes" pueden ir reseteando un acumulador chico
 * cuando cambia el bucket, sin necesidad de mapas gigantes con clave compuesta.
 */

import { lowerBound, upperBound, FLAG_EXCLUDED, FLAG_UNAVAILABLE } from '../takeout/parse.js';
import { MUSIC } from '../takeout/classify.js';
import { localDayNumber, localMonthKey, daysInRange, dayNumberToKey } from './time.js';

/** Duracion media asumida de un tema, en minutos. Takeout no trae duracion. */
export const DEFAULT_TRACK_MINUTES = 3.5;

/**
 * Identidad estable de una cancion para "ocultar del top", independiente del
 * indice interno del dataset (que puede cambiar entre re-importaciones).
 */
export function songHideKey(name, artist) {
  return `${name}::${artist}`;
}

/**
 * Aplica las correcciones del usuario sobre la heuristica y devuelve el
 * veredicto efectivo de cada reproduccion.
 *
 * Los overrides por canal se resuelven a nivel de indice de canal (una vez por
 * canal, no una vez por reproduccion), que es lo que hace que marcar un canal
 * con miles de plays sea instantaneo.
 */
export function resolveVerdicts(dataset, overrides) {
  const out = Uint8Array.from(dataset.verdict);
  if (!overrides) return out;

  const channelOverride = new Int8Array(dataset.channels.length).fill(-1);
  let hasChannelOverride = false;
  const entries = Object.entries(overrides.channels ?? {});
  if (entries.length) {
    const channelIndex = new Map(dataset.channels.map((name, idx) => [name, idx]));
    for (const [name, value] of entries) {
      const idx = channelIndex.get(name);
      if (idx !== undefined) {
        channelOverride[idx] = value === MUSIC ? 1 : 0;
        hasChannelOverride = true;
      }
    }
  }

  const videoOverrides = overrides.videos ?? {};
  const hasVideoOverride = Object.keys(videoOverrides).length > 0;

  if (!hasChannelOverride && !hasVideoOverride) return out;

  for (let i = 0; i < dataset.n; i += 1) {
    if (dataset.flags[i] & (FLAG_EXCLUDED | FLAG_UNAVAILABLE)) continue;

    if (hasChannelOverride) {
      const ch = dataset.chIdx[i];
      if (ch >= 0 && channelOverride[ch] !== -1) out[i] = channelOverride[ch];
    }
    // El override de video tiene la ultima palabra sobre el de canal.
    if (hasVideoOverride) {
      const value = videoOverrides[dataset.videoIds[i]];
      if (value !== undefined) out[i] = value === MUSIC ? 1 : 0;
    }
  }

  return out;
}

function topFromMap(map, limit, decorate) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, plays]) => decorate(key, plays));
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Reproducciones dentro del rango, respetando el filtro de musica. */
function countPlays(dataset, verdicts, start, end, musicOnly) {
  let plays = 0;
  for (let i = start; i < end; i += 1) {
    if (dataset.flags[i] & (FLAG_EXCLUDED | FLAG_UNAVAILABLE)) continue;
    if (musicOnly && verdicts[i] !== 1) continue;
    plays += 1;
  }
  return plays;
}

/**
 * Primera aparicion de cada artista en TODO el historial. Sirve para separar
 * "descubrimiento del periodo" de "artista que ya venias escuchando": si su
 * primera escucha absoluta cae dentro del rango, es un descubrimiento.
 */
function firstSeenByArtist(dataset, verdicts, musicOnly) {
  const first = new Map();
  for (let i = 0; i < dataset.n; i += 1) {
    if (dataset.flags[i] & (FLAG_EXCLUDED | FLAG_UNAVAILABLE)) continue;
    if (musicOnly && verdicts[i] !== 1) continue;
    const artist = dataset.artistIdx[i];
    if (artist < 0 || first.has(artist)) continue;
    first.set(artist, dataset.t[i]);
  }
  return first;
}

export function computeStats(dataset, options = {}) {
  const {
    from = -Infinity,
    to = Infinity,
    musicOnly = true,
    overrides = null,
    trackMinutes = DEFAULT_TRACK_MINUTES,
    topLimit = 20,
    verdicts: providedVerdicts = null,
    hiddenSongs = null,
  } = options;

  const verdicts = providedVerdicts ?? resolveVerdicts(dataset, overrides);

  const start = lowerBound(dataset.t, dataset.n, from);
  const end = upperBound(dataset.t, dataset.n, to);

  const artistPlays = new Map();
  const songPlays = new Map();
  const channelPlays = new Map();
  const artistSongs = new Map();
  const dayPlays = new Map();
  const monthArtists = new Map();

  const byHour = new Array(24).fill(0);
  const byWeekday = new Array(7).fill(0);
  const heatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));

  // Acumuladores que se resetean al cambiar de bucket. Solo funcionan porque el
  // dataset esta ordenado por fecha.
  let currentDay = null;
  let daySongCounts = new Map();
  let obsession = null;

  let plays = 0;
  let excluded = 0;
  let unavailable = 0;
  let filteredOut = 0;

  const ambiguousByChannel = new Map();

  const flushDay = () => {
    if (currentDay === null) return;
    for (const [songIdx, count] of daySongCounts) {
      if (!obsession || count > obsession.plays) {
        obsession = { songIdx, plays: count, day: currentDay };
      }
    }
  };

  for (let i = start; i < end; i += 1) {
    const flags = dataset.flags[i];

    if (flags & FLAG_UNAVAILABLE) {
      unavailable += 1;
      continue;
    }
    if (flags & FLAG_EXCLUDED) {
      excluded += 1;
      continue;
    }

    const isMusic = verdicts[i] === 1;

    // Los dudosos se juntan aunque esten filtrados: el panel de ajuste tiene que
    // poder ofrecer al usuario lo que la heuristica no supo resolver.
    if (dataset.confidence[i] === 1) {
      const channelIdx = dataset.chIdx[i];
      const channel = channelIdx >= 0 ? dataset.channels[channelIdx] : '(sin canal)';
      let bucket = ambiguousByChannel.get(channel);
      if (!bucket) {
        bucket = { channel, plays: 0, exampleTitle: dataset.titles[i], exampleVideoId: dataset.videoIds[i] };
        ambiguousByChannel.set(channel, bucket);
      }
      bucket.plays += 1;
    }

    if (musicOnly && !isMusic) {
      filteredOut += 1;
      continue;
    }

    plays += 1;

    const timestamp = dataset.t[i];
    const date = new Date(timestamp);
    const hour = date.getHours();
    const weekday = date.getDay();

    byHour[hour] += 1;
    byWeekday[weekday] += 1;
    heatmap[weekday][hour] += 1;

    const day = localDayNumber(timestamp);
    if (day !== currentDay) {
      flushDay();
      currentDay = day;
      daySongCounts = new Map();
    }
    increment(dayPlays, day);

    const artistIdx = dataset.artistIdx[i];
    const songIdx = dataset.songIdx[i];
    const channelIdx = dataset.chIdx[i];

    if (artistIdx >= 0) {
      increment(artistPlays, artistIdx);

      const monthKey = localMonthKey(timestamp);
      let monthBucket = monthArtists.get(monthKey);
      if (!monthBucket) {
        monthBucket = new Map();
        monthArtists.set(monthKey, monthBucket);
      }
      increment(monthBucket, artistIdx);
    }

    if (songIdx >= 0) {
      increment(songPlays, songIdx);
      increment(daySongCounts, songIdx);
      if (artistIdx >= 0) {
        let set = artistSongs.get(artistIdx);
        if (!set) {
          set = new Set();
          artistSongs.set(artistIdx, set);
        }
        set.add(songIdx);
      }
    }

    if (channelIdx >= 0) increment(channelPlays, channelIdx);
  }

  flushDay();

  const rangeFrom = Number.isFinite(from) ? from : (dataset.t[0] ?? Date.now());
  const rangeTo = Number.isFinite(to) ? to : (dataset.t[dataset.n - 1] ?? Date.now());
  const spanDays = daysInRange(rangeFrom, rangeTo);

  const topArtists = topFromMap(artistPlays, topLimit, (idx, count) => ({
    key: idx,
    name: dataset.artists[idx],
    plays: count,
    songs: artistSongs.get(idx)?.size ?? 0,
  }));

  const topSongs = [...songPlays.entries()]
    .map(([idx, count]) => {
      const artistIdx = dataset.songArtistIdx[idx];
      const name = dataset.songLabels[idx] || '(sin titulo)';
      const artist = artistIdx >= 0 ? dataset.artists[artistIdx] : '';
      return { key: idx, name, artist, plays: count, hideKey: songHideKey(name, artist) };
    })
    .filter((song) => !hiddenSongs?.has(song.hideKey))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, topLimit);

  const topChannels = topFromMap(channelPlays, topLimit, (idx, count) => ({
    key: idx,
    name: dataset.channels[idx],
    plays: count,
  }));

  const activeDaysSorted = [...dayPlays.keys()].sort((a, b) => a - b);

  // Timeline: un punto por dia del rango, incluidos los dias en cero, para que
  // los huecos de inactividad se vean como huecos y no se compriman.
  const timeline = [];
  if (activeDaysSorted.length) {
    const firstDay = activeDaysSorted[0];
    const lastDay = activeDaysSorted[activeDaysSorted.length - 1];
    for (let day = firstDay; day <= lastDay; day += 1) {
      timeline.push({ day, date: dayNumberToKey(day), plays: dayPlays.get(day) ?? 0 });
    }
  }

  // Racha: dias consecutivos con al menos una reproduccion.
  let streak = { days: 0, from: null, to: null };
  let runStart = null;
  let previous = null;
  for (const day of activeDaysSorted) {
    if (previous === null || day !== previous + 1) runStart = day;
    const length = day - runStart + 1;
    if (length > streak.days) {
      streak = { days: length, from: dayNumberToKey(runStart), to: dayNumberToKey(day) };
    }
    previous = day;
  }

  let peakDay = null;
  for (const [day, count] of dayPlays) {
    if (!peakDay || count > peakDay.plays) {
      peakDay = { day, date: dayNumberToKey(day), plays: count };
    }
  }

  const monthlyTopArtist = [...monthArtists.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, bucket]) => {
      let bestIdx = -1;
      let bestPlays = 0;
      for (const [idx, count] of bucket) {
        if (count > bestPlays) {
          bestIdx = idx;
          bestPlays = count;
        }
      }
      return { month, artist: bestIdx >= 0 ? dataset.artists[bestIdx] : '', plays: bestPlays };
    });

  const firstSeen = firstSeenByArtist(dataset, verdicts, musicOnly);
  const discoveries = [...artistPlays.entries()]
    .filter(([idx]) => {
      const first = firstSeen.get(idx);
      return first !== undefined && first >= rangeFrom && first <= rangeTo;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, topLimit)
    .map(([idx, count]) => ({
      key: idx,
      name: dataset.artists[idx],
      plays: count,
      firstPlay: firstSeen.get(idx),
    }));

  // Periodo anterior de igual duracion, para el delta.
  const spanMs = rangeTo - rangeFrom;
  const previousStart = lowerBound(dataset.t, dataset.n, rangeFrom - spanMs);
  const previousEnd = lowerBound(dataset.t, dataset.n, rangeFrom);
  const previousPlays = countPlays(dataset, verdicts, previousStart, previousEnd, musicOnly);

  const activeDays = dayPlays.size;

  return {
    range: { from: rangeFrom, to: rangeTo, days: spanDays },
    totals: {
      plays,
      songs: songPlays.size,
      artists: artistPlays.size,
      channels: channelPlays.size,
      activeDays,
      unavailable,
      excluded,
      filteredOut,
      estimatedMinutes: plays * trackMinutes,
      avgPerActiveDay: activeDays ? plays / activeDays : 0,
      avgPerDay: plays / spanDays,
    },
    topArtists,
    topSongs,
    topChannels,
    byHour,
    byWeekday,
    heatmap,
    timeline,
    streak,
    peakDay,
    obsession: obsession
      ? {
          name: dataset.songLabels[obsession.songIdx] || '(sin titulo)',
          artist:
            dataset.songArtistIdx[obsession.songIdx] >= 0
              ? dataset.artists[dataset.songArtistIdx[obsession.songIdx]]
              : '',
          plays: obsession.plays,
          date: dayNumberToKey(obsession.day),
        }
      : null,
    monthlyTopArtist,
    discoveries,
    comparison: {
      previousPlays,
      delta: plays - previousPlays,
      deltaPct: previousPlays > 0 ? ((plays - previousPlays) / previousPlays) * 100 : null,
    },
    ambiguous: [...ambiguousByChannel.values()].sort((a, b) => b.plays - a.plays),
  };
}
