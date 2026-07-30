import { useEffect, useMemo, useState } from 'react';
import { useHistoryData, STATUS } from './hooks/useHistoryData.js';
import { useStats } from './hooks/useStats.js';
import { FileDrop, ImportSummary } from './components/FileDrop.jsx';
import { DateRangePicker } from './components/DateRangePicker.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { ClassifierPanel } from './components/ClassifierPanel.jsx';
import { StoriesPlayer } from './components/stories/StoriesPlayer.jsx';
import { DEFAULT_TRACK_MINUTES } from './lib/stats/aggregate.js';
import { formatNumber } from './lib/format.js';
import { buildSequentialRamp } from './lib/color.js';
import './styles/app.css';
import './components/charts/charts.css';

const HIDDEN_SONGS_KEY = 'yt-music-rewinder:hidden-songs';
const ACCENT_COLOR_KEY = 'yt-music-rewinder:accent-color';
const DEFAULT_ACCENT_COLOR = '#3987e5';

// Tinta sobre un relleno de acento. No son tokens de tema: el fondo es el color
// que elige el usuario, asi que la unica variable que importa es su luminancia.
const ON_ACCENT_LIGHT = '#ffffff';
const ON_ACCENT_DARK = '#0b0b0b';

function loadHiddenSongs() {
  try {
    const raw = localStorage.getItem(HIDDEN_SONGS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function loadAccentColor() {
  try {
    return localStorage.getItem(ACCENT_COLOR_KEY) || DEFAULT_ACCENT_COLOR;
  } catch {
    return DEFAULT_ACCENT_COLOR;
  }
}

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return match.slice(1).map((part) => parseInt(part, 16));
}

function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/*
  El acento lo elige el usuario y puede ser un amarillo: blanco encima de eso no
  se lee. La tinta se elige por contraste real contra el propio acento en vez de
  quedar fija en blanco.
*/
function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/*
  No buscamos el maximo contraste sino el minimo aceptable: el umbral es 3:1, el
  de texto grande y componentes de interfaz, que es lo que hay encima de un
  relleno de acento (rotulos de boton, la perilla del toggle). Mientras el blanco
  llegue a 3:1 se queda, porque es la lectura de siempre del boton primario; solo
  con acentos claros (amarillos, cianes) pasamos a tinta oscura.
*/
function pickOnAccent(hex) {
  const accent = relativeLuminance(hex);
  if (accent === null) return ON_ACCENT_LIGHT;
  const white = relativeLuminance(ON_ACCENT_LIGHT);
  const contrastWithWhite = (white + 0.05) / (accent + 0.05);
  return contrastWithWhite >= 3 ? ON_ACCENT_LIGHT : ON_ACCENT_DARK;
}

export default function App() {
  const history = useHistoryData();
  const { dataset, status } = history;

  const [range, setRange] = useState(null);
  const [musicOnly, setMusicOnly] = useState(true);
  const [trackMinutes, setTrackMinutes] = useState(DEFAULT_TRACK_MINUTES);
  const [view, setView] = useState('dashboard');
  const [storiesOpen, setStoriesOpen] = useState(false);
  const [theme, setTheme] = useState(null);
  const [accentColor, setAccentColor] = useState(loadAccentColor);
  const [hiddenSongs, setHiddenSongs] = useState(loadHiddenSongs);

  const hideSong = (hideKey) => {
    setHiddenSongs((current) => {
      const next = new Set(current);
      next.add(hideKey);
      localStorage.setItem(HIDDEN_SONGS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const unhideAllSongs = () => {
    setHiddenSongs(new Set());
    localStorage.removeItem(HIDDEN_SONGS_KEY);
  };

  const bounds = useMemo(() => {
    if (!dataset || !dataset.n) return null;
    return { min: dataset.t[0], max: dataset.t[dataset.n - 1] };
  }, [dataset]);

  // Al cargar un historial nuevo, arrancamos mostrando todo el rango disponible.
  useEffect(() => {
    if (bounds) setRange({ from: bounds.min, to: bounds.max });
    else setRange(null);
  }, [bounds]);

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--series-1', accentColor);
    const soft = hexToRgba(accentColor, 0.16);
    if (soft) document.documentElement.style.setProperty('--series-1-soft', soft);
    document.documentElement.style.setProperty('--on-accent', pickOnAccent(accentColor));
    localStorage.setItem(ACCENT_COLOR_KEY, accentColor);
  }, [accentColor]);

  // La rampa del heatmap sale del mismo color de acento; su direccion depende
  // del tema (oscuro: mas es mas claro, claro: mas es mas oscuro), asi que
  // tambien seguimos los cambios de preferencia de sistema cuando el tema es 'auto'.
  useEffect(() => {
    const applyRamp = () => {
      const isDark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const ramp = buildSequentialRamp(accentColor, isDark);
      if (!ramp) return;
      ramp.forEach((color, index) => document.documentElement.style.setProperty(`--seq-${index + 1}`, color));
    };

    applyRamp();
    if (theme) return undefined;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', applyRamp);
    return () => mql.removeEventListener('change', applyRamp);
  }, [accentColor, theme]);

  const stats = useStats(dataset, {
    from: range?.from ?? -Infinity,
    to: range?.to ?? Infinity,
    musicOnly,
    overrides: history.overrides,
    trackMinutes,
    hiddenSongs,
  });

  const showLanding = status === STATUS.IDLE || status === STATUS.PARSING || status === STATUS.ERROR;

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">
          <span className="topbar__dot" aria-hidden="true" />
          YouTube Music Rewinder
        </span>
        <div className="topbar__actions">
          <label className="control colorpicker" title="Cambiar color principal">
            <span className="colorpicker__swatch" style={{ background: accentColor }} aria-hidden="true" />
            Color
            <input
              type="color"
              className="colorpicker__input"
              value={accentColor}
              onChange={(event) => setAccentColor(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="control"
            onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
          >
            Cambiar tema
          </button>
        </div>
      </header>

      {status === STATUS.RESTORING ? <p className="muted">Cargando…</p> : null}

      {showLanding ? (
        <FileDrop
          onFile={history.importFile}
          error={history.error}
          parsing={status === STATUS.PARSING}
          progress={history.progress}
        />
      ) : null}

      {status === STATUS.READY && stats && range && bounds ? (
        <>
          <div className="toolbar">
            <ImportSummary meta={history.meta} onReset={history.reset} />
            <div className="toolbar__actions">
              <button
                type="button"
                className="control"
                onClick={() => setView(view === 'classifier' ? 'dashboard' : 'classifier')}
              >
                Ajustar clasificación
                {stats.ambiguous.length ? ` (${formatNumber(stats.ambiguous.length)})` : ''}
              </button>
              <button type="button" className="button" onClick={() => setStoriesOpen(true)}>
                ▶ Ver mi Rewind
              </button>
            </div>
          </div>

          <DateRangePicker
            range={range}
            bounds={bounds}
            onChange={setRange}
            musicOnly={musicOnly}
            onMusicOnlyChange={setMusicOnly}
          />

          {view === 'classifier' ? (
            <ClassifierPanel
              stats={stats}
              overrides={history.overrides}
              onChannelOverride={history.setChannelOverride}
              onReset={history.resetOverrides}
              onClose={() => setView('dashboard')}
            />
          ) : (
            <Dashboard
              stats={stats}
              musicOnly={musicOnly}
              trackMinutes={trackMinutes}
              hiddenSongsCount={hiddenSongs.size}
              onHideSong={hideSong}
              onUnhideAllSongs={unhideAllSongs}
            />
          )}

          <footer className="footer">
            <label className="field field--inline">
              <span className="field__label muted">Duración media por tema (min)</span>
              <input
                type="number"
                min="1"
                max="15"
                step="0.5"
                value={trackMinutes}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next) && next > 0) setTrackMinutes(next);
                }}
              />
            </label>
            <p className="muted footer__note">
              Tu historial se procesa entero dentro de tu navegador y se guarda solo en este
              dispositivo. No se sube a ningún servidor. Las miniaturas son lo único que se pide
              afuera: se bajan de i.ytimg.com por el id de los videos que ya están en tu historial.
            </p>
          </footer>
        </>
      ) : null}

      {storiesOpen && stats ? (
        <StoriesPlayer stats={stats} musicOnly={musicOnly} onClose={() => setStoriesOpen(false)} />
      ) : null}
    </div>
  );
}
