/**
 * Ciclo de vida del historial: subir un archivo, procesarlo en el worker,
 * persistirlo y restaurarlo al recargar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  saveDataset,
  loadDataset,
  saveOverrides,
  loadOverrides,
  clearAll,
  EMPTY_OVERRIDES,
} from '../lib/storage.js';

export const STATUS = {
  IDLE: 'idle',
  RESTORING: 'restoring',
  PARSING: 'parsing',
  READY: 'ready',
  ERROR: 'error',
};

export function useHistoryData() {
  const [status, setStatus] = useState(STATUS.RESTORING);
  const [dataset, setDataset] = useState(null);
  const [meta, setMeta] = useState(null);
  const [overrides, setOverrides] = useState(EMPTY_OVERRIDES);
  const [progress, setProgress] = useState({ phase: '', ratio: 0 });
  const [error, setError] = useState(null);

  const workerRef = useRef(null);

  // Restaurar el ultimo import para no obligar a volver a subir el archivo.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [stored, storedOverrides] = await Promise.all([loadDataset(), loadOverrides()]);
      if (cancelled) return;

      setOverrides(storedOverrides);
      if (stored?.dataset) {
        setDataset(stored.dataset);
        setMeta(stored.meta);
        setStatus(STATUS.READY);
      } else {
        setStatus(STATUS.IDLE);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const importFile = useCallback((file) => {
    if (!file) return;

    workerRef.current?.terminate();
    setStatus(STATUS.PARSING);
    setError(null);
    setProgress({ phase: 'leyendo', ratio: 0 });

    const worker = new Worker(new URL('../workers/parseHistory.worker.js', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const message = event.data;

      if (message.type === 'progress') {
        setProgress({ phase: message.phase, ratio: message.ratio });
        return;
      }

      if (message.type === 'error') {
        setError(message.message);
        setStatus(STATUS.ERROR);
        worker.terminate();
        workerRef.current = null;
        return;
      }

      if (message.type === 'done') {
        setDataset(message.dataset);
        setMeta(message.meta);
        setStatus(STATUS.READY);
        worker.terminate();
        workerRef.current = null;
        // Persistir es best-effort: si la cuota no alcanza, la sesion sigue
        // funcionando igual, solo que habra que volver a subir el archivo.
        saveDataset(message.dataset, message.meta).catch(() => {});
      }
    };

    worker.onerror = () => {
      setError('No se pudo iniciar el procesamiento del archivo.');
      setStatus(STATUS.ERROR);
    };

    worker.postMessage({ file });
  }, []);

  const setChannelOverride = useCallback((channel, value) => {
    setOverrides((previous) => {
      const channels = { ...previous.channels };
      if (value === null) delete channels[channel];
      else channels[channel] = value;

      const next = { ...previous, channels };
      saveOverrides(next).catch(() => {});
      return next;
    });
  }, []);

  const setVideoOverride = useCallback((videoId, value) => {
    setOverrides((previous) => {
      const videos = { ...previous.videos };
      if (value === null) delete videos[videoId];
      else videos[videoId] = value;

      const next = { ...previous, videos };
      saveOverrides(next).catch(() => {});
      return next;
    });
  }, []);

  const resetOverrides = useCallback(() => {
    const next = { channels: {}, videos: {} };
    setOverrides(next);
    saveOverrides(next).catch(() => {});
  }, []);

  const reset = useCallback(async () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    await clearAll().catch(() => {});
    setDataset(null);
    setMeta(null);
    setOverrides({ channels: {}, videos: {} });
    setError(null);
    setProgress({ phase: '', ratio: 0 });
    setStatus(STATUS.IDLE);
  }, []);

  return {
    status,
    dataset,
    meta,
    overrides,
    progress,
    error,
    importFile,
    setChannelOverride,
    setVideoOverride,
    resetOverrides,
    reset,
  };
}
