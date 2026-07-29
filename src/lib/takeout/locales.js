/**
 * Takeout escribe el campo `title` en el idioma de la cuenta de Google:
 * "Has visto Olivia Rodrigo - traitor", "Watched ...", "Assistiu a ...".
 *
 * No podemos asumir espanol: el mismo archivo puede venir en cualquier idioma
 * segun donde se genero el Takeout. Matcheamos contra una tabla de prefijos
 * conocidos y, si ninguno aplica, devolvemos el titulo intacto. Preferimos un
 * titulo con prefijo de mas a un titulo mutilado.
 */

// Ordenados por longitud descendente al usarlos, para que "Has visto un anuncio
// de " gane sobre "Has visto ".
const WATCH_PREFIXES = [
  'Has visto ',
  'Viste ',
  'Watched ',
  'Assistiu a ',
  'Assistiu ',
  'Vous avez regardé ',
  'Hai guardato ',
  'Bekeken ',
  'Obejrzano ',
  'Ai vizionat ',
];

const SEARCH_PREFIXES = [
  'Has buscado ',
  'Buscaste ',
  'Searched for ',
  'Pesquisou por ',
  'Vous avez recherché ',
  'Hai cercato ',
  'Gezocht naar ',
];

/**
 * Fragmentos que delatan una entrada de anuncio cuando Google no adjunta el
 * bloque `details`. Se buscan como substring, en minusculas y sin tildes.
 */
const AD_MARKERS = [
  'has visto un anuncio',
  'viewed ads',
  'viewed an ad',
  'watched an ad',
  'anuncio de google',
  'from google ads',
];

const byLengthDesc = (a, b) => b.length - a.length;

const SORTED_WATCH = [...WATCH_PREFIXES].sort(byLengthDesc);
const SORTED_SEARCH = [...SEARCH_PREFIXES].sort(byLengthDesc);

function matchPrefix(title, prefixes) {
  for (const prefix of prefixes) {
    if (title.startsWith(prefix)) return prefix;
  }
  return null;
}

/**
 * Quita el prefijo "Has visto " y devuelve el titulo real del video.
 * `matched` indica si reconocimos el idioma, para poder avisar al usuario si
 * su Takeout viene en un idioma que todavia no soportamos.
 */
export function stripWatchPrefix(title) {
  const prefix = matchPrefix(title, SORTED_WATCH);
  if (!prefix) return { title, matched: false };
  return { title: title.slice(prefix.length), matched: true };
}

export function isSearchTitle(title) {
  return matchPrefix(title, SORTED_SEARCH) !== null;
}

export function looksLikeAd(title) {
  const haystack = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return AD_MARKERS.some((marker) => haystack.includes(marker));
}

export const __testing = { WATCH_PREFIXES, SEARCH_PREFIXES, AD_MARKERS };
