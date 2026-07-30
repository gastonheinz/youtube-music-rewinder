import { describe, expect, it } from 'vitest';
import { niceCeil, rampIndex, yTicks } from './scale.js';

describe('niceCeil', () => {
  it('redondea a 1, 2, 5 o 10 por decada', () => {
    expect(niceCeil(1)).toBe(1);
    expect(niceCeil(1.4)).toBe(2);
    expect(niceCeil(3)).toBe(5);
    expect(niceCeil(7)).toBe(10);
    expect(niceCeil(17)).toBe(20);
    expect(niceCeil(230)).toBe(500);
  });

  it('nunca devuelve 0, para no dividir por cero en las escalas', () => {
    expect(niceCeil(0)).toBe(1);
    expect(niceCeil(-5)).toBe(1);
    expect(niceCeil(NaN)).toBe(1);
  });
});

describe('yTicks', () => {
  // Es la propiedad que importa: si los intervalos no miden lo mismo, las
  // alturas del grafico se leen mal.
  const spacings = (ticks) => ticks.slice(1).map((tick, index) => tick - ticks[index]);

  it('reparte los ticks en intervalos iguales', () => {
    for (const max of [1, 2, 3, 5, 7, 8, 11, 17, 42, 99, 100, 1234]) {
      const { ticks } = yTicks(max);
      const gaps = spacings(ticks);
      expect(new Set(gaps).size, `max=${max} dio ticks ${ticks}`).toBe(1);
    }
  });

  it('el tope llega al maximo o lo supera, y arranca en cero', () => {
    for (const max of [1, 3, 5, 17, 42, 1234]) {
      const { top, ticks } = yTicks(max);
      expect(ticks[0]).toBe(0);
      expect(top).toBeGreaterThanOrEqual(max);
      expect(ticks[ticks.length - 1]).toBe(top);
    }
  });

  it('usa solo enteros: no existe media reproduccion', () => {
    for (const max of [1, 2, 3, 4, 5]) {
      const { ticks } = yTicks(max);
      ticks.forEach((tick) => expect(Number.isInteger(tick)).toBe(true));
    }
  });

  it('con max=5 da 0-2-4-6 y no el 0-2-4-5 desparejo de antes', () => {
    expect(yTicks(5).ticks).toEqual([0, 2, 4, 6]);
  });

  it('sobrevive a un rango sin datos', () => {
    const { top, ticks } = yTicks(0);
    expect(top).toBeGreaterThan(0);
    expect(ticks[0]).toBe(0);
  });
});

describe('rampIndex', () => {
  it('el cero se va al primer paso de la rampa', () => {
    expect(rampIndex(0, 10, 7)).toBe(0);
  });

  it('cualquier valor mayor que cero sale del paso cero', () => {
    expect(rampIndex(1, 100, 7)).toBeGreaterThanOrEqual(1);
  });

  it('el maximo cae en el ultimo paso', () => {
    expect(rampIndex(10, 10, 7)).toBe(6);
  });

  it('no se pasa del ultimo paso ni con max en cero', () => {
    expect(rampIndex(5, 0, 7)).toBe(0);
    expect(rampIndex(20, 10, 7)).toBe(6);
  });
});
