import { toDateInput, dateInputToStart, dateInputToEnd, startOfLocalDay, endOfLocalDay, MS_PER_DAY } from '../lib/stats/time.js';

/**
 * Una sola fila de filtros arriba de todo, que alcanza a todos los graficos.
 * Nunca filtros por tarjeta: si cada grafico filtrara distinto, dejarian de ser
 * comparables entre si.
 */
export function DateRangePicker({ range, bounds, onChange, musicOnly, onMusicOnlyChange }) {
  const presets = [
    { id: '7d', label: '7 días', days: 7 },
    { id: '30d', label: '30 días', days: 30 },
    { id: '90d', label: '90 días', days: 90 },
    { id: '365d', label: '1 año', days: 365 },
    { id: 'year', label: 'Este año' },
    { id: 'all', label: 'Todo' },
  ];

  const applyPreset = (preset) => {
    if (preset.id === 'all') {
      onChange({ from: bounds.min, to: bounds.max });
      return;
    }
    if (preset.id === 'year') {
      const now = new Date(bounds.max);
      onChange({
        from: new Date(now.getFullYear(), 0, 1).getTime(),
        to: bounds.max,
      });
      return;
    }
    onChange({
      from: startOfLocalDay(bounds.max - (preset.days - 1) * MS_PER_DAY),
      to: bounds.max,
    });
  };

  const isActive = (preset) => {
    if (preset.id === 'all') return range.from <= bounds.min && range.to >= bounds.max;
    if (preset.id === 'year') {
      const start = new Date(new Date(bounds.max).getFullYear(), 0, 1).getTime();
      return range.from === start && range.to >= bounds.max;
    }
    return range.from === startOfLocalDay(bounds.max - (preset.days - 1) * MS_PER_DAY) && range.to >= bounds.max;
  };

  return (
    <div className="filters">
      {/*
        Los presets son opciones excluyentes del mismo eje, asi que van en un
        solo riel: seis pastillas sueltas hacian leer seis controles distintos.
      */}
      <div className="segmented" role="group" aria-label="Rango de fechas">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`segmented__item${isActive(preset) ? ' segmented__item--active' : ''}`}
            aria-pressed={isActive(preset)}
            onClick={() => applyPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <span className="filters__sep" aria-hidden="true" />

      <div className="filters__dates">
        <label className="field">
          <span className="field__label muted">Desde</span>
          <input
            type="date"
            value={toDateInput(range.from)}
            min={toDateInput(bounds.min)}
            max={toDateInput(range.to)}
            onChange={(event) => {
              const next = dateInputToStart(event.target.value);
              if (Number.isFinite(next)) onChange({ ...range, from: next });
            }}
          />
        </label>
        <label className="field">
          <span className="field__label muted">Hasta</span>
          <input
            type="date"
            value={toDateInput(range.to)}
            min={toDateInput(range.from)}
            max={toDateInput(bounds.max)}
            onChange={(event) => {
              const next = dateInputToEnd(event.target.value);
              if (Number.isFinite(next)) onChange({ ...range, to: Math.min(next, endOfLocalDay(bounds.max)) });
            }}
          />
        </label>
      </div>

      {/*
        Sigue siendo un checkbox real dentro de su label: lo sacamos de la pintura
        pero no del arbol de accesibilidad, y el foco se dibuja sobre el riel.
      */}
      <label className="switch">
        <input
          type="checkbox"
          className="switch__input"
          checked={musicOnly}
          onChange={(event) => onMusicOnlyChange(event.target.checked)}
        />
        <span className="switch__track" aria-hidden="true" />
        <span className="switch__text">Solo música</span>
      </label>
    </div>
  );
}
