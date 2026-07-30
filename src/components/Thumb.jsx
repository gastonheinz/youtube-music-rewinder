import { useState } from 'react';
import { thumbnailUrl } from '../lib/thumbnails.js';

/**
 * Miniatura del video, con reserva por si no carga.
 *
 * Siempre ocupa el mismo espacio: si la imagen falla (video borrado, bloqueo de
 * red) se pinta la inicial en su lugar en vez de dejar el hueco roto, asi la
 * lista no salta.
 *
 * La imagen es decorativa a proposito (`alt=""`): el nombre de la cancion o del
 * artista esta justo al lado, y un lector de pantalla leyendo dos veces lo mismo
 * es peor que no leer la miniatura.
 */

/** Primer caracter visible del nombre. Sirve de reserva cuando no hay imagen. */
function initial(name) {
  const trimmed = String(name ?? '').trim();
  return trimmed ? [...trimmed][0].toUpperCase() : '♪';
}

/**
 * Ancho maximo del placeholder gris de YouTube.
 *
 * Para un video borrado o inexistente, i.ytimg.com NO responde 404: devuelve un
 * 200 con una imagen gris de camarita de 120x90. Como la carga es "exitosa",
 * onError nunca dispara y la reserva no se activaria sola. La unica senal es el
 * tamano: un mqdefault de verdad mide 320x180 y un hqdefault 480x360.
 */
const PLACEHOLDER_MAX_WIDTH = 120;

export function Thumb({ videoId, name, size = 'medium', className = '' }) {
  const src = thumbnailUrl(videoId, size);
  // Guardamos QUE src fallo, no un booleano: al cambiar el rango de fechas el
  // mismo componente se reusa con otro video y ese si puede existir.
  const [failedSrc, setFailedSrc] = useState(null);

  // Con `small` pedimos justo 120x90, asi que ahi el ancho no distingue nada y
  // no tiene sentido mirarlo.
  const detectsPlaceholder = size !== 'small';

  const classes = ['thumb', className].filter(Boolean).join(' ');

  if (!src || failedSrc === src) {
    return (
      <span className={`${classes} thumb--fallback`} aria-hidden="true">
        {initial(name)}
      </span>
    );
  }

  return (
    <img
      className={classes}
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      onLoad={(event) => {
        if (detectsPlaceholder && event.currentTarget.naturalWidth <= PLACEHOLDER_MAX_WIDTH) {
          setFailedSrc(src);
        }
      }}
    />
  );
}
