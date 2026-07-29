/**
 * Proyeccion del watch-history.json de Takeout a un dataset columnar.
 *
 * Por que columnar y no un array de objetos: un historial pesado tiene cientos
 * de miles de entradas. Guardar un objeto por reproduccion (con su titulo, su
 * canal y su artista repetidos miles de veces) desperdicia memoria y hace lento
 * cada recalculo. Aca cada atributo repetido se "internas" una sola vez en un
 * array de strings y las columnas guardan indices enteros. Las agregaciones
 * terminan siendo aritmetica sobre TypedArrays.
 *
 * Ademas se resuelve UNA vez lo caro (artista, tema, clasificacion) y se cachea.
 * Cambiar el rango de fechas o una correccion del usuario no vuelve a parsear.
 */

import { stripWatchPrefix, isSearchTitle, looksLikeAd } from './locales.js';
import { extractTrack, normalizeKey } from './normalize.js';
import { classifyEntry, MUSIC } from './classify.js';

export const FLAG_AD = 1 << 0;
export const FLAG_SEARCH = 1 << 1;
export const FLAG_UNAVAILABLE = 1 << 2;
export const FLAG_MUSIC_PRODUCT = 1 << 3;
export const FLAG_UNKNOWN_LOCALE = 1 << 4;

/** Entradas que nunca deberian contar como reproduccion. */
export const FLAG_EXCLUDED = FLAG_AD | FLAG_SEARCH;

export const CONFIDENCE = { baja: 0, media: 1, alta: 2 };
export const CONFIDENCE_LABEL = ['baja', 'media', 'alta'];

function extractVideoId(url) {
  if (!url) return null;
  const match = /[?&]v=([^&#]+)/.exec(url);
  return match ? match[1] : null;
}

function extractChannelId(url) {
  if (!url) return null;
  const match = /\/channel\/([^/?#]+)/.exec(url);
  return match ? match[1] : null;
}

function isAdEntry(entry, title) {
  if (Array.isArray(entry.details)) {
    for (const detail of entry.details) {
      if (typeof detail?.name === 'string' && /google\s*ads/i.test(detail.name)) return true;
    }
  }
  return looksLikeAd(title);
}

/**
 * Normaliza una entrada cruda. Devuelve null solo si la entrada no es
 * interpretable (sin fecha valida o sin titulo).
 */
export function parseEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const rawTitle = typeof entry.title === 'string' ? entry.title : '';
  if (!rawTitle) return null;

  const timestamp = Date.parse(entry.time);
  if (!Number.isFinite(timestamp)) return null;

  let flags = 0;

  if (isAdEntry(entry, rawTitle)) flags |= FLAG_AD;

  const titleUrl = typeof entry.titleUrl === 'string' ? entry.titleUrl : '';
  if (isSearchTitle(rawTitle) || titleUrl.includes('/results?search_query=')) {
    flags |= FLAG_SEARCH;
  }

  const stripped = stripWatchPrefix(rawTitle);
  if (!stripped.matched) flags |= FLAG_UNKNOWN_LOCALE;
  const title = stripped.title.trim();

  const subtitle = Array.isArray(entry.subtitles) ? entry.subtitles[0] : null;
  const channel = typeof subtitle?.name === 'string' ? subtitle.name.trim() : '';

  // Video borrado o privado: Takeout no puede resolver el titulo y deja la URL
  // pelada, sin bloque de canal. Se cuenta aparte en vez de descartarlo en
  // silencio, para que los totales le cierren al usuario.
  if (!channel && /^https?:\/\//i.test(title)) flags |= FLAG_UNAVAILABLE;

  const products = Array.isArray(entry.products) ? entry.products : [];
  const fromMusicProduct =
    entry.header === 'YouTube Music' || products.includes('YouTube Music');
  if (fromMusicProduct) flags |= FLAG_MUSIC_PRODUCT;

  return {
    videoId: extractVideoId(titleUrl),
    channelId: extractChannelId(subtitle?.url),
    timestamp,
    title,
    channel,
    flags,
    fromMusicProduct,
  };
}

class Interner {
  constructor() {
    this.values = [];
    this.index = new Map();
  }

  intern(value) {
    if (!value) return -1;
    const existing = this.index.get(value);
    if (existing !== undefined) return existing;
    const id = this.values.length;
    this.values.push(value);
    this.index.set(value, id);
    return id;
  }
}

/**
 * Construye el dataset columnar. `onProgress(ratio)` se llama de a bloques para
 * poder pintar una barra de progreso sin inundar de mensajes al hilo principal.
 */
export function buildDataset(rawEntries, onProgress) {
  if (!Array.isArray(rawEntries)) {
    throw new Error('El archivo no contiene un array de entradas. Revisa que sea watch-history.json.');
  }

  const total = rawEntries.length;
  const channels = new Interner();
  const artists = new Interner();
  const songs = new Interner();

  // Etiqueta visible por cancion: nos quedamos con la variante mas frecuente,
  // porque la misma cancion aparece con mayusculas y adornos distintos.
  const songLabelVotes = [];
  const songArtist = [];

  const rows = [];
  const chunk = Math.max(1, Math.floor(total / 100));

  for (let i = 0; i < total; i += 1) {
    const parsed = parseEntry(rawEntries[i]);

    if (onProgress && i % chunk === 0) onProgress(i / total);
    if (!parsed) continue;

    const chIdx = channels.intern(parsed.channel);

    let artistIdx = -1;
    let songIdx = -1;
    let verdict = 0;
    let confidence = 0;

    const usable = (parsed.flags & (FLAG_EXCLUDED | FLAG_UNAVAILABLE)) === 0;

    if (usable) {
      const track = extractTrack({ title: parsed.title, channel: parsed.channel });
      const classification = classifyEntry({
        title: parsed.title,
        channel: parsed.channel,
        fromMusicProduct: parsed.fromMusicProduct,
      });

      verdict = classification.verdict === MUSIC ? 1 : 0;
      confidence = CONFIDENCE[classification.confidence] ?? 0;

      artistIdx = artists.intern(track.primaryArtist);
      songIdx = songs.intern(track.songKey);

      if (songIdx >= 0) {
        if (!songLabelVotes[songIdx]) songLabelVotes[songIdx] = new Map();
        const votes = songLabelVotes[songIdx];
        votes.set(track.song, (votes.get(track.song) ?? 0) + 1);
        if (songArtist[songIdx] === undefined) songArtist[songIdx] = artistIdx;
      }
    }

    rows.push({
      t: parsed.timestamp,
      videoId: parsed.videoId ?? '',
      title: parsed.title,
      chIdx,
      artistIdx,
      songIdx,
      flags: parsed.flags,
      verdict,
      confidence,
    });
  }

  // Ordenar UNA sola vez por fecha. A partir de aca, filtrar por rango es una
  // busqueda binaria de los dos extremos en vez de recorrer todo el historial
  // cada vez que el usuario mueve una fecha.
  rows.sort((a, b) => a.t - b.t);

  const n = rows.length;
  const dataset = {
    n,
    t: new Float64Array(n),
    chIdx: new Int32Array(n),
    artistIdx: new Int32Array(n),
    songIdx: new Int32Array(n),
    flags: new Uint8Array(n),
    verdict: new Uint8Array(n),
    confidence: new Uint8Array(n),
    videoIds: new Array(n),
    titles: new Array(n),
    channels: channels.values,
    artists: artists.values,
    songKeys: songs.values,
    songLabels: songs.values.map((_, idx) => {
      const votes = songLabelVotes[idx];
      if (!votes) return '';
      let best = '';
      let bestCount = -1;
      for (const [label, count] of votes) {
        if (count > bestCount) {
          best = label;
          bestCount = count;
        }
      }
      return best;
    }),
    songArtistIdx: new Int32Array(songs.values.length),
  };

  for (let i = 0; i < songs.values.length; i += 1) {
    dataset.songArtistIdx[i] = songArtist[i] ?? -1;
  }

  for (let i = 0; i < n; i += 1) {
    const row = rows[i];
    dataset.t[i] = row.t;
    dataset.chIdx[i] = row.chIdx;
    dataset.artistIdx[i] = row.artistIdx;
    dataset.songIdx[i] = row.songIdx;
    dataset.flags[i] = row.flags;
    dataset.verdict[i] = row.verdict;
    dataset.confidence[i] = row.confidence;
    dataset.videoIds[i] = row.videoId;
    dataset.titles[i] = row.title;
  }

  if (onProgress) onProgress(1);

  return dataset;
}

/** Primer indice con t >= value. El dataset viene ordenado por fecha. */
export function lowerBound(t, n, value) {
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (t[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Primer indice con t > value. */
export function upperBound(t, n, value) {
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (t[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export const __testing = { extractVideoId, extractChannelId, Interner, normalizeKey };
