/** Utilidades de escala compartidas por los graficos SVG. */

/** Redondea hacia arriba a un numero "lindo" (1, 2, 5, 10, 20, 50...). */
export function niceCeil(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const normalized = value / base;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * base;
}

/**
 * Ticks del eje Y en numeros redondos. El eje carga los valores que no
 * etiquetamos directamente sobre las marcas.
 */
export function yTicks(max, count = 4) {
  const top = niceCeil(max);
  const step = niceCeil(top / count);
  const ticks = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  if (ticks[ticks.length - 1] !== top) ticks.push(top);
  return { top: ticks[ticks.length - 1], ticks };
}

/** Indice de bucket dentro de una rampa secuencial de `steps` pasos. */
export function rampIndex(value, max, steps) {
  if (value <= 0) return 0;
  if (max <= 0) return 0;
  const ratio = value / max;
  return Math.min(steps - 1, Math.max(1, Math.ceil(ratio * (steps - 1))));
}
