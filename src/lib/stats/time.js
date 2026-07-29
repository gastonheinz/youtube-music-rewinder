/**
 * Helpers de fecha para las estadisticas.
 *
 * Importante: Takeout guarda `time` en UTC ("2026-07-29T08:17:07.389Z"), pero
 * el usuario escucho musica en SU hora local. Si contamos las horas en UTC, un
 * tema de las 5 de la mañana en Buenos Aires aparece como si fueran las 8 y todo
 * el analisis de habitos ("sos nocturno") queda mal. Todo lo que sea hora del
 * dia, dia de la semana o agrupacion diaria usa hora local.
 */

export const MS_PER_DAY = 86_400_000;

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Numero de dia local, contado desde epoch. Se construye via Date.UTC sobre los
 * componentes LOCALES para que el resultado no se corra en los cambios de
 * horario de verano (restar un offset fijo si fallaria).
 */
export function localDayNumber(ms) {
  const date = new Date(ms);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

/** Convierte un numero de dia local de vuelta a "YYYY-MM-DD". */
export function dayNumberToKey(dayNumber) {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

export function dayNumberToDate(dayNumber) {
  const date = new Date(dayNumber * MS_PER_DAY);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Clave de mes local, "2026-07". */
export function localMonthKey(ms) {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKeyToLabel(key) {
  const [year, month] = key.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** Inicio del dia local, en epoch ms. */
export function startOfLocalDay(ms) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Fin del dia local (inclusive), en epoch ms. */
export function endOfLocalDay(ms) {
  const date = new Date(ms);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

/** "2026-07-29" (input date) -> epoch ms del arranque de ese dia local. */
export function dateInputToStart(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return NaN;
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

export function dateInputToEnd(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return NaN;
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

/** epoch ms -> "2026-07-29", el formato que espera <input type="date">. */
export function toDateInput(ms) {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Cantidad de dias que abarca el rango, contando ambos extremos. */
export function daysInRange(from, to) {
  return Math.max(1, localDayNumber(to) - localDayNumber(from) + 1);
}
