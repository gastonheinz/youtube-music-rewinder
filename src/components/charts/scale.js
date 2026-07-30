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
 *
 * El tope se redondea a un multiplo del paso, no al revez. Calculando el tope
 * primero salian ejes con el ultimo intervalo mas corto que el resto (con
 * max=5: 0, 2, 4, 5), y un eje donde los intervalos no miden lo mismo hace leer
 * mal las alturas de las barras.
 *
 * `minStep` es 1 porque todo lo que graficamos son reproducciones: un eje con
 * 0,5 reproducciones no significa nada.
 */
export function yTicks(max, count = 4, minStep = 1) {
  const step = Math.max(minStep, niceCeil(niceCeil(max) / count));
  const top = Math.ceil(Math.max(max, step) / step) * step;
  const ticks = [];
  for (let value = 0; value <= top + step / 1000; value += step) ticks.push(value);
  return { top, ticks };
}

/** Indice de bucket dentro de una rampa secuencial de `steps` pasos. */
export function rampIndex(value, max, steps) {
  if (value <= 0) return 0;
  if (max <= 0) return 0;
  const ratio = value / max;
  return Math.min(steps - 1, Math.max(1, Math.ceil(ratio * (steps - 1))));
}
