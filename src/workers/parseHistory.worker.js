/**
 * Parseo del watch-history.json fuera del hilo principal.
 *
 * Un historial de varios años ronda los 100-300 MB. Hacer file.text() +
 * JSON.parse en el hilo de la UI congela la pestaña varios segundos y el
 * navegador llega a ofrecer cerrarla. Aca ese trabajo corre en el worker y el
 * hilo principal solo recibe el dataset ya comprimido a columnas.
 */

import { buildDataset } from '../lib/takeout/parse.js';

/** Los TypedArrays viajan por transferencia (sin copiar) si los declaramos. */
function transferListFor(dataset) {
  return [
    dataset.t.buffer,
    dataset.chIdx.buffer,
    dataset.artistIdx.buffer,
    dataset.songIdx.buffer,
    dataset.flags.buffer,
    dataset.verdict.buffer,
    dataset.confidence.buffer,
    dataset.songArtistIdx.buffer,
  ];
}

function describeParseFailure(error, size) {
  if (error instanceof RangeError || /string length|out of memory|Array buffer/i.test(error.message)) {
    return `El archivo es demasiado grande para el navegador (${(size / 1024 / 1024).toFixed(0)} MB). Probá con Chrome o Firefox de escritorio, o partí el historial en dos.`;
  }
  return 'El archivo no es un JSON válido. Asegurate de subir watch-history.json (no el .html) tal como viene de Takeout.';
}

self.onmessage = async (event) => {
  const { file } = event.data ?? {};

  if (!file) {
    self.postMessage({ type: 'error', message: 'No se recibió ningún archivo.' });
    return;
  }

  try {
    self.postMessage({ type: 'progress', phase: 'leyendo', ratio: 0 });
    const text = await file.text();

    self.postMessage({ type: 'progress', phase: 'parseando', ratio: 0 });
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (error) {
      self.postMessage({ type: 'error', message: describeParseFailure(error, file.size) });
      return;
    }

    // Notificamos de a saltos: un postMessage por entrada saturaria el canal.
    let lastSent = -1;
    const dataset = buildDataset(raw, (ratio) => {
      const step = Math.floor(ratio * 50);
      if (step !== lastSent) {
        lastSent = step;
        self.postMessage({ type: 'progress', phase: 'analizando', ratio });
      }
    });

    if (dataset.n === 0) {
      self.postMessage({
        type: 'error',
        message:
          'El archivo se leyó bien pero no tiene reproducciones. ¿Seguro que es watch-history.json y no otro archivo del Takeout?',
      });
      return;
    }

    self.postMessage(
      {
        type: 'done',
        dataset,
        meta: {
          fileName: file.name,
          fileSize: file.size,
          importedAt: Date.now(),
          entries: dataset.n,
        },
      },
      transferListFor(dataset),
    );
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error?.message ?? 'No se pudo procesar el archivo.',
    });
  }
};
