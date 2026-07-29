import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  parseEntry,
  buildDataset,
  lowerBound,
  upperBound,
  FLAG_AD,
  FLAG_SEARCH,
  FLAG_UNAVAILABLE,
  FLAG_MUSIC_PRODUCT,
  FLAG_EXCLUDED,
} from './parse.js';

const samplePath = fileURLToPath(new URL('../../../data/sample/watch-history.sample.json', import.meta.url));
const sample = JSON.parse(readFileSync(samplePath, 'utf8'));

describe('parseEntry', () => {
  it('saca el prefijo de idioma y el id del video', () => {
    const parsed = parseEntry(sample[3]);
    expect(parsed.title).toBe('Olivia Rodrigo - traitor (Official Video)');
    expect(parsed.videoId).toBe('CRrf3h9vhp8');
    expect(parsed.channel).toBe('OliviaRodrigoVEVO');
  });

  it('acepta ids que arrancan con guion', () => {
    expect(parseEntry(sample[0]).videoId).toBe('-ZDzky-Ytqk');
  });

  it('marca anuncios, busquedas y videos caidos', () => {
    const ad = sample.find((e) => e.details);
    const search = sample.find((e) => e.title.startsWith('Has buscado'));
    const gone = sample.find((e) => !e.subtitles && !e.details && e.title.includes('watch?v='));

    expect(parseEntry(ad).flags & FLAG_AD).toBeTruthy();
    expect(parseEntry(search).flags & FLAG_SEARCH).toBeTruthy();
    expect(parseEntry(gone).flags & FLAG_UNAVAILABLE).toBeTruthy();
  });

  it('marca lo reproducido desde YouTube Music', () => {
    const entry = sample.find((e) => e.header === 'YouTube Music');
    expect(parseEntry(entry).flags & FLAG_MUSIC_PRODUCT).toBeTruthy();
  });

  it('descarta entradas sin fecha valida', () => {
    expect(parseEntry({ title: 'Has visto algo', time: 'no-es-fecha' })).toBeNull();
    expect(parseEntry(null)).toBeNull();
  });
});

describe('buildDataset', () => {
  const dataset = buildDataset(sample);

  it('conserva todas las entradas interpretables', () => {
    expect(dataset.n).toBe(sample.length);
  });

  it('deja el historial ordenado por fecha ascendente', () => {
    for (let i = 1; i < dataset.n; i += 1) {
      expect(dataset.t[i]).toBeGreaterThanOrEqual(dataset.t[i - 1]);
    }
  });

  it('unifica las tres subidas de traitor en una sola cancion', () => {
    const traitor = dataset.songLabels.findIndex((label) => label === 'traitor');
    expect(traitor).toBeGreaterThanOrEqual(0);
    let plays = 0;
    for (let i = 0; i < dataset.n; i += 1) {
      if (dataset.songIdx[i] === traitor) plays += 1;
    }
    expect(plays).toBe(3);
  });

  it('no le asigna artista ni cancion a lo excluido', () => {
    for (let i = 0; i < dataset.n; i += 1) {
      if (dataset.flags[i] & (FLAG_EXCLUDED | FLAG_UNAVAILABLE)) {
        expect(dataset.songIdx[i]).toBe(-1);
        expect(dataset.verdict[i]).toBe(0);
      }
    }
  });

  it('cuenta 17 reproducciones de musica con la heuristica por defecto', () => {
    let music = 0;
    for (let i = 0; i < dataset.n; i += 1) {
      if (dataset.verdict[i] === 1) music += 1;
    }
    // 15 con senal fuerte + las 2 de "Bully - Soundtrack Walking Theme" (dudosas).
    expect(music).toBe(17);
  });

  it('reporta progreso de 0 a 1', () => {
    const seen = [];
    buildDataset(sample, (ratio) => seen.push(ratio));
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(1);
  });

  it('rechaza un JSON que no sea un array', () => {
    expect(() => buildDataset({ foo: 'bar' })).toThrow(/array/i);
  });
});

describe('busqueda binaria de rango', () => {
  const t = new Float64Array([10, 20, 20, 30, 40]);

  it('encuentra los bordes del rango', () => {
    expect(lowerBound(t, 5, 20)).toBe(1);
    expect(upperBound(t, 5, 20)).toBe(3);
    expect(lowerBound(t, 5, 0)).toBe(0);
    expect(upperBound(t, 5, 99)).toBe(5);
  });

  it('devuelve un rango vacio cuando no hay nada', () => {
    expect(upperBound(t, 5, 25) - lowerBound(t, 5, 25)).toBe(0);
  });
});
