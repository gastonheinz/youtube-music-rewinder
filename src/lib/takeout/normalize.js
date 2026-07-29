/**
 * Extraccion de artista y tema a partir del titulo del video y del nombre del
 * canal, mas la clave canonica que agrupa la misma cancion subida N veces.
 *
 * Sin esta normalizacion el top de canciones sale fragmentado: el lyric video,
 * el video oficial y la re-subida de "traitor" cuentan como tres canciones
 * distintas y ninguna llega al podio.
 */

/** Guiones que YouTube usa como separador artista/tema. */
const DASH_SPLIT = /\s+[-–—‒―]\s+/;

/**
 * Contenido de parentesis/corchetes que es puro ruido de marketing y no forma
 * parte de la identidad de la cancion. Se compara contra el parentesis
 * COMPLETO: "(Official Video)" se va, "(feat. Drake)" y "(Live at Wembley)"
 * se quedan porque si distinguen una version de otra.
 */
const NOISE_PATTERNS = [
  /^official\s*(music\s*)?video$/,
  /^official\s*video\s*clip$/,
  /^video\s*oficial$/,
  /^videoclip\s*(oficial)?$/,
  /^clip\s*officiel$/,
  /^official\s*lyrics?\s*video$/,
  /^lyrics?\s*video$/,
  /^lyrics?$/,
  /^letra$/,
  /^con\s*letra$/,
  /^letra\s*\/\s*lyrics$/,
  /^official\s*audio$/,
  /^audio\s*oficial$/,
  /^audio$/,
  /^official$/,
  /^oficial$/,
  /^visuali[sz]er$/,
  /^official\s*visuali[sz]er$/,
  /^m\/?v$/,
  /^mv$/,
  /^hd$/,
  /^hq$/,
  /^4k$/,
  /^8k$/,
  /^full\s*hd$/,
  /^\d{3,4}p$/,
  /^remaster(ed)?(\s*\d{4})?$/,
  /^\d{4}\s*remaster(ed)?$/,
  /^explicit$/,
  /^clean$/,
  /^new$/,
  /^nuevo$/,
  /^estreno$/,
  /^sub\s*espa[nñ]ol$/,
  /^subtitulad[oa].*$/,
];

/** Separadores de artistas. Ver nota sobre "&" en splitArtists(). */
// Ojo: nada de `\b` despues de `\.?`. En "feat. Drake" el punto y el espacio son
// ambos caracteres no-palabra, asi que ahi no hay frontera y el corte no matchea.
// El `\s+` final ya hace de ancla.
const FEATURE_SPLIT =
  /\s*(?:,|;|\bfeat\.?|\bft\.?|\bfeaturing\b|\bcon\b|\bwith\b|\bvs\.?|\bx\b)\s+/i;

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu;

export function stripDiacritics(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Clave de agrupacion: minusculas, sin tildes, sin puntuacion, sin espacios
 * de mas. "Traitor" / "traitor" / "TRAITOR." colapsan en la misma cancion.
 */
export function normalizeKey(value) {
  return stripDiacritics(String(value))
    .toLowerCase()
    .replace(/['’`´]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isNoise(inner) {
  const probe = stripDiacritics(inner).toLowerCase().trim();
  return NOISE_PATTERNS.some((pattern) => pattern.test(probe));
}

/**
 * Convierte "OliviaRodrigoVEVO" en "Olivia Rodrigo": inserta un espacio en cada
 * transicion minuscula/digito -> mayuscula. Los acronimos quedan intactos
 * ("ACDC" no tiene transicion, asi que no se rompe).
 */
function decamel(value) {
  return value
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Saca parentesis y corchetes cuyo contenido completo es ruido. */
function stripNoiseGroups(value) {
  let out = value;
  let previous;
  do {
    previous = out;
    out = out
      .replace(/\(([^()]*)\)/g, (match, inner) => (isNoise(inner) ? ' ' : match))
      .replace(/\[([^[\]]*)\]/g, (match, inner) => (isNoise(inner) ? ' ' : match));
  } while (out !== previous);
  return out;
}

/**
 * Limpia el titulo para mostrarlo: saca ruido de marketing, el sufijo
 * "| Nombre del canal", emojis y espacios sobrantes.
 */
export function cleanSongTitle(raw) {
  let out = String(raw ?? '');

  out = stripNoiseGroups(out);
  // Sufijo "| Canal" o "｜Canal" (fullwidth, comun en canales asiaticos).
  out = out.replace(/\s*[|｜][^|｜]*$/, '');
  // Ruido pegado al final sin parentesis: "traitor - Official Video".
  // Vamos podando desde el final para cubrir "Tema - Live - Official Video".
  const segments = out.split(DASH_SPLIT);
  while (segments.length > 1 && isNoise(segments[segments.length - 1])) {
    segments.pop();
  }
  out = segments.join(' - ');
  out = out.replace(EMOJI, '');
  out = out.replace(/\s*[-–—_·•]+\s*$/, '');
  out = out.replace(/\s+/g, ' ').trim();

  // Si limpiamos de mas y quedo vacio, es mejor el titulo original.
  return out || String(raw ?? '').trim();
}

/**
 * Divide "Artista - Tema". Devuelve null si el titulo no tiene esa forma.
 * Exige espacios alrededor del guion para no partir "Spider-Man".
 */
export function splitArtistTitle(raw) {
  const value = String(raw ?? '').trim();
  const match = DASH_SPLIT.exec(value);
  if (!match) return null;

  const artist = value.slice(0, match.index).trim();
  const song = value.slice(match.index + match[0].length).trim();
  if (!artist || !song) return null;
  // Un "artista" larguisimo es casi siempre una frase, no un nombre.
  if (artist.length > 60) return null;

  return { artist, song };
}

/**
 * Artista a partir del nombre del canal.
 * `confident` marca los casos en que el canal es fuente autoritativa:
 * los canales "- Topic" los genera YouTube Music y siempre son del artista.
 */
export function channelToArtist(channel) {
  const value = String(channel ?? '').trim();
  if (!value) return null;

  const topic = /^(.+?)\s*[-–—]\s*Topic$/i.exec(value);
  if (topic) return { artist: topic[1].trim(), confident: true };

  const vevo = /^(.+?)\s*VEVO$/i.exec(value);
  if (vevo && vevo[1].trim()) return { artist: decamel(vevo[1].trim()), confident: true };

  return { artist: value, confident: false };
}

/**
 * Separa colaboraciones. El primero es el artista principal.
 *
 * A proposito NO cortamos por "&" ni "+": hay demasiadas bandas reales que los
 * llevan en el nombre (Simon & Garfunkel, Florence + The Machine) y partirlas
 * inventa artistas que el usuario nunca escucho. Perder un colaborador ocasional
 * es un error mucho menos visible que fabricar artistas falsos.
 */
export function splitArtists(value) {
  const parts = String(value ?? '')
    .split(FEATURE_SPLIT)
    .map((part) => part.replace(/[()[\]]/g, '').trim())
    .filter(Boolean);

  const seen = new Set();
  const unique = [];
  for (const part of parts) {
    const key = normalizeKey(part);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }
  return unique;
}

/**
 * Resuelve artista(s) y tema de una reproduccion.
 *
 * Orden de confianza:
 *  1. Canal "X - Topic" -> el artista es X y el titulo es solo el tema.
 *  2. Titulo con forma "Artista - Tema".
 *  3. Canal VEVO -> artista del canal, titulo entero como tema.
 *  4. Fallback: el canal es el artista.
 */
export function extractTrack({ title, channel }) {
  const rawTitle = String(title ?? '').trim();
  const fromChannel = channelToArtist(channel);

  let artistSource = null;
  let songSource = rawTitle;

  if (fromChannel?.confident && /[-–—]\s*Topic$/i.test(String(channel))) {
    // Los canales Topic titulan el video con el nombre del tema a secas, pero
    // algunas subidas igual traen "Artista - Tema".
    artistSource = fromChannel.artist;
    const split = splitArtistTitle(rawTitle);
    if (split && normalizeKey(split.artist) === normalizeKey(fromChannel.artist)) {
      songSource = split.song;
    }
  } else {
    const split = splitArtistTitle(rawTitle);
    if (split) {
      artistSource = split.artist;
      songSource = split.song;
    } else if (fromChannel) {
      artistSource = fromChannel.artist;
    }
  }

  const song = cleanSongTitle(songSource);
  const artists = splitArtists(artistSource ?? '');
  const primaryArtist = artists[0] ?? (fromChannel?.artist || 'Desconocido');
  const featured = artists.slice(1);

  return {
    primaryArtist,
    featured,
    artists: artists.length ? artists : [primaryArtist],
    song,
    songKey: `${normalizeKey(primaryArtist)}::${normalizeKey(song)}`,
    artistKey: normalizeKey(primaryArtist),
  };
}

export const __testing = { decamel, isNoise, stripNoiseGroups };
