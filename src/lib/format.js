/** Formateo de numeros, duraciones y fechas para la UI (en español). */

const numberFormatter = new Intl.NumberFormat('es-AR');
const decimalFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const longDateFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const formatNumber = (value) => numberFormatter.format(Math.round(value ?? 0));
export const formatDecimal = (value) => decimalFormatter.format(value ?? 0);

/** Minutos -> "12 h 30 min". Siempre se muestra junto a la palabra "estimado". */
export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(minutes ?? 0));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;

  if (days > 0) return `${formatNumber(days)} d ${hours} h`;
  if (hours > 0) return `${formatNumber(hours)} h ${mins} min`;
  return `${mins} min`;
}

/** Version compacta para las tarjetas: "74 h". */
export function formatDurationShort(minutes) {
  const hours = (minutes ?? 0) / 60;
  if (hours >= 100) return `${formatNumber(hours)} h`;
  if (hours >= 1) return `${formatDecimal(hours)} h`;
  return `${Math.round(minutes ?? 0)} min`;
}

export const formatDate = (value) => dateFormatter.format(new Date(value));
export const formatLongDate = (value) => longDateFormatter.format(new Date(value));

/** "2026-07-29" viene sin hora: se interpreta como fecha local, no UTC. */
export function formatDayKey(key) {
  const [year, month, day] = String(key).split('-').map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
}

export function formatLongDayKey(key) {
  const [year, month, day] = String(key).split('-').map(Number);
  return longDateFormatter.format(new Date(year, month - 1, day));
}

/** 14 -> "14:00". */
export const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`;

export function formatPercent(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${decimalFormatter.format(value)}%`;
}

export function formatFileSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${decimalFormatter.format(mb)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Etiqueta del habito segun la hora pico. Es una lectura del dato, no un dato:
 * se muestra como comentario, nunca como metrica.
 */
export function describePeakHour(hour) {
  if (hour >= 5 && hour < 12) return 'Sos de escuchar a la mañana';
  if (hour >= 12 && hour < 19) return 'Tu música va de tarde';
  if (hour >= 19 && hour < 24) return 'Le das a la noche';
  return 'Sos de madrugada';
}

export const pluralize = (count, singular, plural) =>
  `${formatNumber(count)} ${count === 1 ? singular : plural}`;
