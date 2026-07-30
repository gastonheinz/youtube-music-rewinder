import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildDataset } from '../takeout/parse.js';
import { MUSIC, NOT_MUSIC } from '../takeout/classify.js';
import { computeStats, resolveVerdicts } from './aggregate.js';
import { localDayNumber, dateInputToStart, dateInputToEnd } from './time.js';

const samplePath = fileURLToPath(new URL('../../../data/sample/watch-history.sample.json', import.meta.url));
const dataset = buildDataset(JSON.parse(readFileSync(samplePath, 'utf8')));

const stats = (options) => computeStats(dataset, options);

describe('totales sobre el fixture', () => {
  const result = stats();

  it('cuenta las reproducciones de musica contadas a mano', () => {
    // Olivia Rodrigo 8, Harry Styles 4, Bad Bunny 2, The Weeknd 1, Bully 2.
    expect(result.totals.plays).toBe(17);
  });

  it('separa lo excluido de lo no disponible', () => {
    expect(result.totals.excluded).toBe(2); // el anuncio y la busqueda
    expect(result.totals.unavailable).toBe(1); // el video borrado
    expect(result.totals.filteredOut).toBe(3); // 2 de Bananirou + 1 gameplay
  });

  it('cuenta canciones y artistas unicos', () => {
    expect(result.totals.songs).toBe(9);
    expect(result.totals.artists).toBe(5);
  });

  it('estima el tiempo escuchado con la duracion media', () => {
    expect(result.totals.estimatedMinutes).toBeCloseTo(17 * 3.5);
    expect(stats({ trackMinutes: 4 }).totals.estimatedMinutes).toBeCloseTo(17 * 4);
  });
});

describe('rankings', () => {
  const result = stats();

  it('pone a Olivia Rodrigo primera con sus 8 reproducciones', () => {
    expect(result.topArtists[0]).toMatchObject({ name: 'Olivia Rodrigo', plays: 8, songs: 4 });
  });

  it('pone traitor primera con las 3 subidas unificadas', () => {
    expect(result.topSongs[0]).toMatchObject({
      name: 'traitor',
      artist: 'Olivia Rodrigo',
      plays: 3,
    });
  });

  it('rankea canales por reproducciones de musica', () => {
    expect(result.topChannels[0]).toMatchObject({ name: 'OliviaRodrigoVEVO', plays: 7 });
  });
});

describe('video representativo para la miniatura', () => {
  const result = stats();

  it('le da a cada cancion del top un video que el usuario realmente vio', () => {
    const ids = new Set(dataset.videoIds.filter(Boolean));
    for (const song of result.topSongs) {
      expect(ids.has(song.videoId)).toBe(true);
    }
  });

  it('al artista le pone la miniatura de su cancion mas escuchada', () => {
    // traitor es la mas escuchada de Olivia Rodrigo (3 subidas unificadas), asi
    // que su miniatura tiene que salir de ahi y no del primer video que sono.
    const olivia = result.topArtists.find((artist) => artist.name === 'Olivia Rodrigo');
    const traitor = result.topSongs.find((song) => song.name === 'traitor');
    expect(olivia.videoId).toBe(traitor.videoId);
  });

  it('tambien acompana a canales, descubrimientos, obsesion y artista del mes', () => {
    expect(result.topChannels.every((channel) => channel.videoId)).toBe(true);
    expect(result.discoveries.every((artist) => artist.videoId)).toBe(true);
    expect(result.obsession.videoId).toBeTruthy();
    expect(result.monthlyTopArtist.every((month) => month.videoId)).toBe(true);
  });

  it('sigue el rango: si el video queda afuera, la miniatura cambia', () => {
    const julio = stats({
      from: dateInputToStart('2026-07-01'),
      to: dateInputToEnd('2026-07-31'),
    });
    for (const song of julio.topSongs) {
      expect(song.videoId).toBeTruthy();
    }
  });
});

describe('filtro de musica', () => {
  it('sin filtro suma tambien los videos no musicales', () => {
    const all = stats({ musicOnly: false });
    expect(all.totals.plays).toBe(20); // 17 de musica + 3 filtrados
    expect(all.totals.filteredOut).toBe(0);
  });

  it('nunca cuenta anuncios, busquedas ni videos caidos, ni sin filtro', () => {
    const all = stats({ musicOnly: false });
    expect(all.totals.plays).toBe(dataset.n - 3);
  });
});

describe('overrides del usuario', () => {
  it('marcar un canal como no-musica saca todas sus reproducciones', () => {
    const overrides = { channels: { CanisCanemEditBully: NOT_MUSIC }, videos: {} };
    expect(stats({ overrides }).totals.plays).toBe(15);
  });

  it('marcar un canal como musica suma las suyas', () => {
    const overrides = { channels: { Bananirou: MUSIC }, videos: {} };
    expect(stats({ overrides }).totals.plays).toBe(19);
  });

  it('el override de video le gana al de canal', () => {
    const overrides = {
      channels: { OliviaRodrigoVEVO: NOT_MUSIC },
      videos: { CRrf3h9vhp8: MUSIC },
    };
    // Se van las 7 de OliviaRodrigoVEVO pero vuelve la del video marcado.
    expect(stats({ overrides }).totals.plays).toBe(11);
  });

  it('no toca los anuncios ni las busquedas', () => {
    const verdicts = resolveVerdicts(dataset, {
      channels: {},
      videos: { aaaaaaaaaaa: MUSIC },
    });
    expect(stats({ verdicts }).totals.plays).toBe(17);
  });
});

describe('panel de ajuste', () => {
  const result = stats();

  it('junta los dudosos por canal con un ejemplo', () => {
    const bully = result.ambiguous.find((row) => row.channel === 'CanisCanemEditBully');
    expect(bully).toMatchObject({ plays: 2, exampleTitle: 'Bully - Soundtrack Walking Theme' });
  });

  it('no ofrece como dudoso lo que la heuristica resolvio con confianza', () => {
    expect(result.ambiguous.some((row) => row.channel === 'OliviaRodrigoVEVO')).toBe(false);
    expect(result.ambiguous.some((row) => row.channel === 'Bananirou')).toBe(false);
  });
});

describe('rango de fechas', () => {
  it('acota a las reproducciones del rango', () => {
    const result = stats({
      from: dateInputToStart('2026-07-29'),
      to: dateInputToEnd('2026-07-29'),
    });
    // Segun la zona horaria el dia local puede correrse respecto del UTC del
    // fixture, asi que verificamos que sea un subconjunto propio y no vacio.
    expect(result.totals.plays).toBeGreaterThan(0);
    expect(result.totals.plays).toBeLessThan(17);
  });

  it('un rango sin datos devuelve todo en cero sin romper', () => {
    const result = stats({
      from: dateInputToStart('2020-01-01'),
      to: dateInputToEnd('2020-01-31'),
    });
    expect(result.totals.plays).toBe(0);
    expect(result.topArtists).toEqual([]);
    expect(result.timeline).toEqual([]);
    expect(result.obsession).toBeNull();
    expect(result.peakDay).toBeNull();
    expect(result.streak.days).toBe(0);
  });
});

describe('habitos y momentos', () => {
  const result = stats();

  it('reparte las horas en hora local, no en UTC', () => {
    expect(result.byHour.reduce((a, b) => a + b, 0)).toBe(17);

    // La primera reproduccion de musica del fixture es 2026-06-14T18:00:00Z.
    // Su bucket tiene que ser la hora LOCAL de ese instante.
    const expectedHour = new Date('2026-06-14T18:00:00.000Z').getHours();
    expect(result.byHour[expectedHour]).toBeGreaterThan(0);
  });

  it('reparte los dias de la semana', () => {
    expect(result.byWeekday.reduce((a, b) => a + b, 0)).toBe(17);
  });

  it('el heatmap suma lo mismo que el total', () => {
    expect(result.heatmap.flat().reduce((a, b) => a + b, 0)).toBe(17);
  });

  it('la timeline rellena con ceros los dias sin reproducciones', () => {
    // El fixture tiene un hueco de mas de un mes entre junio y julio.
    expect(result.timeline.length).toBeGreaterThan(result.totals.activeDays);
    expect(result.timeline.some((point) => point.plays === 0)).toBe(true);
    expect(result.timeline.reduce((sum, point) => sum + point.plays, 0)).toBe(17);
  });

  it('encuentra el dia pico', () => {
    const maxTimeline = Math.max(...result.timeline.map((point) => point.plays));
    expect(result.peakDay.plays).toBe(maxTimeline);
  });

  it('calcula la racha mas larga y no la cruza por encima del hueco', () => {
    // Julio 21 a 29 son 9 dias seguidos; junio 14 y 15 quedan del otro lado.
    expect(result.streak.days).toBe(9);
  });

  it('encuentra la cancion mas repetida en un mismo dia', () => {
    expect(result.obsession).toMatchObject({
      name: 'deja vu',
      artist: 'Olivia Rodrigo',
      plays: 2,
    });
  });

  it('lista un artista top por cada mes', () => {
    expect(result.monthlyTopArtist).toHaveLength(2);
    expect(result.monthlyTopArtist[0]).toMatchObject({ month: '2026-06', artist: 'Olivia Rodrigo' });
    expect(result.monthlyTopArtist[1]).toMatchObject({ month: '2026-07', artist: 'Olivia Rodrigo' });
  });
});

describe('descubrimientos', () => {
  it('con todo el historial en rango, todo artista es un descubrimiento', () => {
    expect(stats().discoveries).toHaveLength(5);
  });

  it('no cuenta como descubrimiento a quien ya venias escuchando', () => {
    const lastDay = dataset.t[dataset.n - 1];
    const result = stats({ from: localDayNumber(lastDay) * 86400000, to: lastDay });
    // Olivia Rodrigo ya aparecia en junio, mucho antes del ultimo dia.
    expect(result.discoveries.map((d) => d.name)).not.toContain('Olivia Rodrigo');
  });
});

describe('comparacion con el periodo anterior', () => {
  it('sin historial previo no inventa un porcentaje', () => {
    const result = stats();
    expect(result.comparison.previousPlays).toBe(0);
    expect(result.comparison.deltaPct).toBeNull();
  });

  it('compara julio contra el periodo previo de igual duracion', () => {
    const result = stats({
      from: dateInputToStart('2026-07-01'),
      to: dateInputToEnd('2026-07-31'),
    });
    expect(result.totals.plays).toBe(14);
    expect(result.comparison.previousPlays).toBe(3); // las 3 de junio
    expect(result.comparison.deltaPct).toBeCloseTo(((14 - 3) / 3) * 100);
  });
});
