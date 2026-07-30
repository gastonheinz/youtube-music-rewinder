import { useRef, useState } from 'react';
import { formatFileSize } from '../lib/format.js';

/**
 * Pantalla de entrada: subir el watch-history.json.
 *
 * El archivo se lee con la File API y se procesa en un worker del propio
 * navegador. No hay subida a ningun servidor porque no hay servidor.
 */
export function FileDrop({ onFile, error, parsing, progress }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="landing">
      <header className="landing__header">
        <h1 className="landing__title">Tu Rewind musical, cuando quieras</h1>
        <p className="landing__lead secondary">
          Subí el <code>watch-history.json</code> de tu Google Takeout y armá tus estadísticas de
          escucha para el rango de fechas que se te cante. No hace falta esperar a fin de año.
        </p>
      </header>

      <div
        className={`dropzone${dragging ? ' dropzone--active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />

        {parsing ? (
          <div className="dropzone__progress">
            <p>Procesando tu historial…</p>
            <div className="progressbar">
              <div
                className="progressbar__fill"
                style={{ width: `${Math.round((progress?.ratio ?? 0) * 100)}%` }}
              />
            </div>
            <p className="muted">{progress?.phase}</p>
          </div>
        ) : (
          <>
            <p className="dropzone__hint">Arrastrá el archivo acá</p>
            <button type="button" className="button" onClick={() => inputRef.current?.click()}>
              Elegir archivo
            </button>
            <p className="muted dropzone__note">
              Archivos de varios cientos de MB funcionan: el análisis corre en segundo plano.
            </p>
          </>
        )}
      </div>

      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      <section className="landing__help">
        <h2 className="landing__helpTitle">¿Cómo consigo el archivo?</h2>
        <ol className="landing__steps secondary">
          <li>
            Entrá a{' '}
            <a href="https://takeout.google.com" target="_blank" rel="noreferrer noopener">
              takeout.google.com
            </a>{' '}
            con tu cuenta.
          </li>
          <li>Tocá «Anular la selección» y marcá solo <strong>YouTube y YouTube Music</strong>.</li>
          <li>
            En «Todos los datos de YouTube incluidos» dejá únicamente <strong>historial</strong>, y en
            «Varios formatos» elegí <strong>JSON</strong> para el historial.
          </li>
          <li>
            Exportá y esperá el mail. Dentro del ZIP, el archivo está en{' '}
            <code>Takeout/YouTube y YouTube Music/historial/</code>.
          </li>
        </ol>
      </section>
    </div>
  );
}

/*
 * El origen de los datos va en su propia pastilla y no como texto suelto: es un
 * dato de estado ("esto es lo que estas mirando"), no una accion. Por eso la
 * accion destructiva queda afuera de la pastilla.
 */
export function ImportSummary({ meta, onReset }) {
  if (!meta) return null;
  return (
    <div className="importsummary">
      <p className="importsummary__source">
        <span className="importsummary__file">{meta.fileName}</span>
        <span className="importsummary__meta muted">
          {' · '}
          {meta.entries.toLocaleString('es-AR')} entradas
          {meta.fileSize ? ` · ${formatFileSize(meta.fileSize)}` : ''}
        </span>
      </p>
      <button type="button" className="linkbutton" onClick={onReset}>
        Borrar mis datos
      </button>
    </div>
  );
}
