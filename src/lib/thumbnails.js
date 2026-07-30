/**
 * Miniaturas de YouTube a partir del id de video que ya trae el historial.
 *
 * Takeout no guarda ninguna imagen, pero si guarda el `titleUrl` de cada
 * reproduccion, y de ahi parse.js ya extrae el videoId. Con ese id se arma la
 * URL de la miniatura publica, sin necesidad de API key ni de pedir nada al
 * usuario.
 *
 * Ojo con el tamano elegido: `hqdefault` viene en 4:3 y a los videos 16:9 les
 * agrega bandas negras arriba y abajo. `mqdefault` es 320x180 limpio, asi que es
 * el que sirve para recortar a cuadrado sin que aparezcan barras.
 */

const SIZES = {
  /** 120x90 (4:3, con bandas). Solo para miniaturas muy chicas. */
  small: 'default',
  /** 320x180 (16:9 limpio). El que usamos en listas. */
  medium: 'mqdefault',
  /** 480x360 (4:3, con bandas). Para destacados grandes. */
  large: 'hqdefault',
};

/**
 * Los ids de YouTube son 11 caracteres del alfabeto base64url. Validamos antes
 * de construir la URL para no disparar pedidos con basura si el historial trae
 * una `titleUrl` rara.
 */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function isVideoId(value) {
  return typeof value === 'string' && VIDEO_ID.test(value);
}

/** URL de la miniatura, o null si el id no sirve. */
export function thumbnailUrl(videoId, size = 'medium') {
  if (!isVideoId(videoId)) return null;
  return `https://i.ytimg.com/vi/${videoId}/${SIZES[size] ?? SIZES.medium}.jpg`;
}
