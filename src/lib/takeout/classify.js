/**
 * Deteccion de "esto es musica" sobre el historial de YouTube.
 *
 * Takeout no marca que video es musica: el historial mezcla clips, gameplays,
 * vlogs y tutoriales. Sin API externa lo unico disponible son senales del
 * titulo y del canal, asi que trabajamos con un puntaje y admitimos que hay
 * una zona gris.
 *
 * Los casos ambiguos NO se adivinan: se marcan como 'media' y el usuario los
 * resuelve desde el panel de ajuste. Una banda de soundtrack de videojuego es
 * musica o no segun a quien le preguntes; esa decision es del usuario.
 */

import { stripDiacritics } from './normalize.js';

export const MUSIC = 'music';
export const NOT_MUSIC = 'notmusic';

/** Senales fuertes en el titulo: si aparecen, es musica casi seguro. */
const STRONG_TITLE = [
  /\bofficial\s*(music\s*)?video\b/,
  /\bvideo\s*oficial\b/,
  /\bvideoclip\b/,
  /\bclip\s*officiel\b/,
  /\blyrics?\s*video\b/,
  /\bofficial\s*audio\b/,
  /\baudio\s*oficial\b/,
  /\bvisuali[sz]er\b/,
  /\bofficial\s*lyrics?\b/,
  /\bcon\s*letra\b/,
  /\bfull\s*album\b/,
  /\balbum\s*completo\b/,
  /\bremix\b/,
  /\bacoustic\s*(version|session)\b/,
  /\bsesi[oó]n\s*ac[uú]stica\b/,
  /\bbso\b/,
  /\bost\b/,
];

/** Senales medias: sugieren musica pero solas no alcanzan. */
const MEDIUM_TITLE = [
  /\bcover\b/,
  /\blive\s*(session|at|in)\b/,
  /\ben\s*vivo\b/,
  /\bunplugged\b/,
  /\bmashup\b/,
  /\bnightcore\b/,
  /\bslowed\b/,
  /\bsped\s*up\b/,
  /\bsoundtrack\b/,
  /\btheme\b/,
];

/** Marcadores de canal que casi garantizan musica. */
const STRONG_CHANNEL = [/\s[-–—]\s*topic$/, /vevo$/];

/** Marcadores de canal mas debiles. */
const MEDIUM_CHANNEL = [
  /\brecords\b/,
  /\bmusic\b/,
  /\bm[uú]sica\b/,
  /\brecordings\b/,
  /\bsounds?\b/,
  /\blabel\b/,
];

/** Senales que descartan musica aunque el titulo tenga forma "A - B". */
const NEGATIVE = [
  /\bgameplay\b/,
  /\bwalkthrough\b/,
  /\bvlog\b/,
  /\breacci[oó]n\b/,
  /\breaction\b/,
  /\breacciona\b/,
  /\bpodcast\b/,
  /\bentrevista\b/,
  /\binterview\b/,
  /\btutorial\b/,
  /\bc[oó]mo\s+hacer\b/,
  /\bhow\s+to\b/,
  /\breview\b/,
  /\brese[nñ]a\b/,
  /\bunboxing\b/,
  /\bcap[ií]tulo\s*\d/,
  /\bepisodio\s*\d/,
  /\bepisode\s*\d/,
  /\btemporada\s*\d/,
  /\bnoticias\b/,
  /\bhighlights\b/,
  /\bresumen\b/,
  /\btr[aá]iler\b/,
  /\btrailer\b/,
  /\bdocumental\b/,
  /\bdocumentary\b/,
  /#shorts\b/,
  /\bspeedrun\b/,
  /\bdirecto\b/,
  /\btier\s*list\b/,
  /\bmemes?\b/,
];

const probe = (value) => stripDiacritics(String(value ?? '')).toLowerCase();

const anyMatch = (patterns, value) => patterns.some((pattern) => pattern.test(value));

/**
 * Clasifica una reproduccion.
 *
 * @returns {{verdict: 'music'|'notmusic', confidence: 'alta'|'media'|'baja', reason: string}}
 *   'media' significa "no me consta": va al panel para que decida el usuario.
 */
export function classifyEntry({ title, channel, fromMusicProduct = false }) {
  const t = probe(title);
  const c = probe(channel);

  if (fromMusicProduct) {
    return { verdict: MUSIC, confidence: 'alta', reason: 'Reproducido en YouTube Music' };
  }

  if (c && anyMatch(STRONG_CHANNEL, c)) {
    const reason = /topic$/.test(c)
      ? 'Canal "- Topic" generado por YouTube Music'
      : 'Canal VEVO';
    return { verdict: MUSIC, confidence: 'alta', reason };
  }

  const negative = anyMatch(NEGATIVE, t) || anyMatch(NEGATIVE, c);

  if (anyMatch(STRONG_TITLE, t)) {
    // Un "official video" dentro de un vlog de reacciones sigue siendo dudoso.
    return negative
      ? { verdict: MUSIC, confidence: 'media', reason: 'Titulo de musica pero con senales de otro formato' }
      : { verdict: MUSIC, confidence: 'alta', reason: 'Titulo de videoclip o audio oficial' };
  }

  if (negative) {
    return { verdict: NOT_MUSIC, confidence: 'alta', reason: 'Formato de video no musical' };
  }

  const mediumSignals =
    (anyMatch(MEDIUM_CHANNEL, c) ? 1 : 0) +
    (anyMatch(MEDIUM_TITLE, t) ? 1 : 0) +
    // "Artista - Tema" es la forma canonica de un titulo de musica, pero
    // tambien la de muchisimos videos que no lo son.
    (/\s[-–—]\s/.test(t) ? 1 : 0);

  if (mediumSignals >= 2) {
    return { verdict: MUSIC, confidence: 'media', reason: 'Varias senales debiles de musica' };
  }
  if (mediumSignals === 1) {
    return { verdict: MUSIC, confidence: 'media', reason: 'Una sola senal debil de musica' };
  }

  return { verdict: NOT_MUSIC, confidence: 'baja', reason: 'Sin senales de musica' };
}

/**
 * Resuelve el veredicto final combinando heuristica y correcciones del usuario.
 * Prioridad: override de video > override de canal > heuristica.
 *
 * El override por canal es el que hace usable el panel: marcar un canal resuelve
 * de una todas sus reproducciones en vez de ir video por video.
 */
export function resolveVerdict({ classification, videoId, channel, overrides }) {
  if (!overrides) return { ...classification, source: 'heuristica' };

  const byVideo = videoId ? overrides.videos?.[videoId] : undefined;
  if (byVideo) {
    return { verdict: byVideo, confidence: 'alta', reason: 'Marcado por vos', source: 'video' };
  }

  const byChannel = channel ? overrides.channels?.[channel] : undefined;
  if (byChannel) {
    return { verdict: byChannel, confidence: 'alta', reason: 'Canal marcado por vos', source: 'canal' };
  }

  return { ...classification, source: 'heuristica' };
}

export const __testing = { STRONG_TITLE, MEDIUM_TITLE, NEGATIVE, STRONG_CHANNEL };
