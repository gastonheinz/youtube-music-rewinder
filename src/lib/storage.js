/**
 * Persistencia local en IndexedDB.
 *
 * Guardamos el dataset ya procesado para que recargar la pagina no obligue a
 * volver a subir un archivo de cientos de MB. IndexedDB (y no localStorage)
 * porque localStorage guarda solo strings y tiene un tope de ~5 MB.
 *
 * Todo vive en el navegador del usuario: no hay servidor al que mandar nada.
 */

const DB_NAME = 'yt-music-rewinder';
const DB_VERSION = 1;
const STORE_DATASET = 'dataset';
const STORE_OVERRIDES = 'overrides';
const DATASET_KEY = 'current';
const OVERRIDES_KEY = 'current';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no soporta IndexedDB.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DATASET)) db.createObjectStore(STORE_DATASET);
      if (!db.objectStoreNames.contains(STORE_OVERRIDES)) db.createObjectStore(STORE_OVERRIDES);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(storeName, mode, action) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = action(store);

        transaction.oncomplete = () => {
          db.close();
          resolve(request?.result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error);
        };
      }),
  );
}

export async function saveDataset(dataset, meta) {
  return runTransaction(STORE_DATASET, 'readwrite', (store) =>
    store.put({ dataset, meta }, DATASET_KEY),
  );
}

export async function loadDataset() {
  try {
    return (await runTransaction(STORE_DATASET, 'readonly', (store) => store.get(DATASET_KEY))) ?? null;
  } catch {
    // Un fallo al restaurar no puede impedir usar la app: se arranca vacio.
    return null;
  }
}

export const EMPTY_OVERRIDES = { channels: {}, videos: {} };

export async function saveOverrides(overrides) {
  return runTransaction(STORE_OVERRIDES, 'readwrite', (store) => store.put(overrides, OVERRIDES_KEY));
}

export async function loadOverrides() {
  try {
    const stored = await runTransaction(STORE_OVERRIDES, 'readonly', (store) =>
      store.get(OVERRIDES_KEY),
    );
    return stored ? { channels: {}, videos: {}, ...stored } : { ...EMPTY_OVERRIDES };
  } catch {
    return { ...EMPTY_OVERRIDES };
  }
}

/** Borra todo rastro del historial del usuario en este navegador. */
export async function clearAll() {
  await runTransaction(STORE_DATASET, 'readwrite', (store) => store.clear());
  await runTransaction(STORE_OVERRIDES, 'readwrite', (store) => store.clear());
}
