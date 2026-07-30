/**
 * Tarjeta para compartir, dibujada en un canvas y bajada como PNG.
 *
 * Se dibuja a mano en vez de rasterizar el DOM para no depender de librerias
 * externas y para poder fijar un tamaño de historia (1080x1920) sin importar
 * como se vea la pantalla del usuario.
 *
 * Los colores van fijos (los pasos oscuros de la paleta): la imagen sale del
 * navegador y tiene que verse igual en cualquier lado.
 */

const WIDTH = 1080;
const HEIGHT = 1920;

/** Linea de base del pie y el limite que el contenido no puede cruzar. */
const FOOTER_BASELINE = HEIGHT - 90;
const FOOTER_SAFE_TOP = FOOTER_BASELINE - 52;

const COLORS = {
  background: '#101014',
  backgroundAccent: '#16233a',
  primary: '#ffffff',
  secondary: '#c3c2b7',
  muted: '#898781',
  series: '#3987e5',
  track: '#252529',
};

const FONT = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
const font = (size, weight = 400) => `${weight} ${size}px ${FONT}`;

function truncate(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && context.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, height / 2, width / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
  context.fill();
}

/** Lista rankeada con barra de fondo proporcional. */
function drawRankedList(context, items, { x, y, width, rowHeight, gap }) {
  if (!items.length) return y;
  const max = Math.max(...items.map((item) => item.plays));
  let cursor = y;

  items.forEach((item, index) => {
    context.fillStyle = COLORS.track;
    roundedRect(context, x, cursor, width, rowHeight, 12);

    context.fillStyle = COLORS.series;
    const barWidth = Math.max(rowHeight, (item.plays / max) * width);
    context.globalAlpha = 0.28;
    roundedRect(context, x, cursor, barWidth, rowHeight, 12);
    context.globalAlpha = 1;

    context.fillStyle = COLORS.muted;
    context.font = font(30, 600);
    context.textBaseline = 'middle';
    context.fillText(String(index + 1), x + 28, cursor + rowHeight / 2);

    context.fillStyle = COLORS.primary;
    context.font = font(34, 600);
    const labelX = x + 80;
    const valueText = `${item.plays}`;
    context.font = font(30, 500);
    const valueWidth = context.measureText(valueText).width;

    context.font = font(34, 600);
    const available = width - 80 - valueWidth - 60;
    const hasSecondary = Boolean(item.secondary);
    context.fillText(
      truncate(context, item.name, available),
      labelX,
      cursor + rowHeight / 2 - (hasSecondary ? 16 : 0),
    );

    if (hasSecondary) {
      context.fillStyle = COLORS.muted;
      context.font = font(26, 400);
      context.fillText(truncate(context, item.secondary, available), labelX, cursor + rowHeight / 2 + 20);
    }

    context.fillStyle = COLORS.secondary;
    context.font = font(30, 500);
    context.textAlign = 'right';
    context.fillText(valueText, x + width - 30, cursor + rowHeight / 2);
    context.textAlign = 'left';

    cursor += rowHeight + gap;
  });

  return cursor;
}

export function renderShareCard(stats, { rangeLabel, musicOnly, durationLabel }) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');

  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, COLORS.backgroundAccent);
  gradient.addColorStop(0.55, COLORS.background);
  gradient.addColorStop(1, COLORS.background);
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const margin = 80;
  const contentWidth = WIDTH - margin * 2;

  context.textBaseline = 'alphabetic';
  context.fillStyle = COLORS.series;
  context.font = font(30, 600);
  context.fillText('MI REWIND MUSICAL', margin, 150);

  context.fillStyle = COLORS.secondary;
  context.font = font(32, 400);
  context.fillText(rangeLabel, margin, 200);

  context.fillStyle = COLORS.primary;
  context.font = font(140, 700);
  context.fillText(stats.totals.plays.toLocaleString('es-AR'), margin, 350);

  context.fillStyle = COLORS.secondary;
  context.font = font(36, 400);
  context.fillText(musicOnly ? 'reproducciones de música' : 'reproducciones', margin, 400);

  context.fillStyle = COLORS.muted;
  context.font = font(28, 400);
  context.fillText(
    `${stats.totals.songs.toLocaleString('es-AR')} canciones · ${stats.totals.artists.toLocaleString('es-AR')} artistas · ${durationLabel} (estimado)`,
    margin,
    450,
  );

  const artists = stats.topArtists.slice(0, 5).map((artist) => ({
    name: artist.name,
    plays: artist.plays,
  }));
  const songs = stats.topSongs.slice(0, 5).map((song) => ({
    name: song.name,
    secondary: song.artist,
    plays: song.plays,
  }));

  const gap = 14;

  context.fillStyle = COLORS.primary;
  context.font = font(40, 600);
  context.fillText('Top artistas', margin, 560);
  let cursor = drawRankedList(context, artists, {
    x: margin,
    y: 600,
    width: contentWidth,
    rowHeight: 92,
    gap,
  });

  context.fillStyle = COLORS.primary;
  context.font = font(40, 600);
  context.textBaseline = 'alphabetic';
  context.fillText('Top canciones', margin, cursor + 52);

  // La altura de las filas de canciones sale del espacio que queda hasta el
  // pie, no de un numero fijo: con las 5 canciones y alturas fijas el ultimo
  // renglon se montaba encima del texto del pie.
  const songsTop = cursor + 92;
  const songRowHeight = songs.length
    ? Math.min(108, Math.floor((FOOTER_SAFE_TOP - songsTop) / songs.length) - gap)
    : 0;
  drawRankedList(context, songs, {
    x: margin,
    y: songsTop,
    width: contentWidth,
    rowHeight: songRowHeight,
    gap,
  });

  context.textBaseline = 'alphabetic';
  context.fillStyle = COLORS.muted;
  context.font = font(26, 400);
  context.fillText('Generado con YouTube Music Rewinder · datos de Google Takeout', margin, FOOTER_BASELINE);

  return canvas;
}

export function downloadShareCard(stats, options) {
  const canvas = renderShareCard(stats, options);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar la imagen.'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mi-rewind-musical.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Se revoca en el siguiente tick: revocar antes cancela la descarga en Safari.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}
