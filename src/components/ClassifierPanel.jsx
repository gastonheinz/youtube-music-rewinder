import { MUSIC, NOT_MUSIC } from '../lib/takeout/classify.js';
import { formatNumber, pluralize } from '../lib/format.js';
import { Thumb } from './Thumb.jsx';

/**
 * Panel de ajuste del clasificador.
 *
 * La heuristica no puede saber si el soundtrack de un videojuego cuenta como
 * musica para vos. En vez de adivinar, junta los casos dudosos y te los ofrece.
 *
 * Se corrige POR CANAL: un canal con cientos de reproducciones se resuelve con
 * un click en lugar de video por video.
 */
export function ClassifierPanel({ stats, overrides, onChannelOverride, onReset, onClose }) {
  const decided = Object.entries(overrides.channels ?? {});
  const pending = stats.ambiguous.filter((row) => !(row.channel in (overrides.channels ?? {})));

  return (
    <section className="panel">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Ajustar qué cuenta como música</h2>
          <p className="secondary panel__lead">
            Estos canales no se pudieron clasificar con certeza. Lo que marques se guarda y se
            aplica a todas sus reproducciones.
          </p>
        </div>
        <button type="button" className="button button--ghost" onClick={onClose}>
          Volver al panel
        </button>
      </header>

      {pending.length === 0 ? (
        <p className="alert alert--soft">
          No quedan casos dudosos en este rango de fechas.
        </p>
      ) : (
        <ul className="reviewlist">
          {pending.map((row) => (
            <li key={row.channel} className="reviewlist__row">
              <Thumb
                videoId={row.exampleVideoId}
                name={row.channel}
                className="thumb--review"
              />
              <div className="reviewlist__info">
                <strong>{row.channel}</strong>
                <span className="muted reviewlist__example">«{row.exampleTitle}»</span>
                <span className="secondary">
                  {pluralize(row.plays, 'reproducción', 'reproducciones')} en el rango
                </span>
              </div>
              <div className="reviewlist__actions">
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => onChannelOverride(row.channel, MUSIC)}
                >
                  Es música
                </button>
                <button
                  type="button"
                  className="button button--small button--ghost"
                  onClick={() => onChannelOverride(row.channel, NOT_MUSIC)}
                >
                  No es música
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 ? (
        <div className="panel__decided">
          <div className="panel__decidedHead">
            <h3 className="chart__title">Ya decidiste ({formatNumber(decided.length)})</h3>
            <button type="button" className="linkbutton" onClick={onReset}>
              Borrar todas mis correcciones
            </button>
          </div>
          <ul className="decidedlist">
            {decided.map(([channel, value]) => (
              <li key={channel}>
                <span className="decidedlist__name">{channel}</span>
                <span className={`badge badge--${value === MUSIC ? 'music' : 'not'}`}>
                  {value === MUSIC ? 'Música' : 'No es música'}
                </span>
                <button
                  type="button"
                  className="linkbutton"
                  onClick={() => onChannelOverride(channel, null)}
                >
                  Deshacer
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
