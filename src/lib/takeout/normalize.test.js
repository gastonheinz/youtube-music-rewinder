import { describe, it, expect } from 'vitest';
import {
  cleanSongTitle,
  splitArtistTitle,
  channelToArtist,
  splitArtists,
  extractTrack,
  normalizeKey,
  __testing,
} from './normalize.js';

describe('normalizeKey', () => {
  it('colapsa mayusculas, tildes y puntuacion', () => {
    expect(normalizeKey('Tití Me Preguntó')).toBe('titi me pregunto');
    expect(normalizeKey('TRAITOR.')).toBe('traitor');
    expect(normalizeKey("what's wrong with me")).toBe('whats wrong with me');
  });
});

describe('cleanSongTitle', () => {
  it('saca el ruido de marketing entre parentesis', () => {
    expect(cleanSongTitle('traitor (Official Video)')).toBe('traitor');
    expect(cleanSongTitle('traitor (Lyric Video)')).toBe('traitor');
    expect(cleanSongTitle('stupid song (Official Music Video)')).toBe('stupid song');
    expect(cleanSongTitle('Song [Official Audio]')).toBe('Song');
    expect(cleanSongTitle('Song (HD) (4K)')).toBe('Song');
  });

  it('conserva lo que si distingue una version de otra', () => {
    expect(cleanSongTitle('Song (feat. Drake)')).toBe('Song (feat. Drake)');
    expect(cleanSongTitle('Song (Live at Wembley)')).toBe('Song (Live at Wembley)');
    expect(cleanSongTitle('Song (Remix)')).toBe('Song (Remix)');
  });

  it('saca el sufijo de canal y el ruido colgado de un guion', () => {
    expect(cleanSongTitle('Song | Canal Oficial')).toBe('Song');
    expect(cleanSongTitle('traitor - Official Video')).toBe('traitor');
    expect(cleanSongTitle('Song - Live - Official Video')).toBe('Song - Live');
  });

  it('nunca devuelve vacio', () => {
    expect(cleanSongTitle('(Official Video)')).toBe('(Official Video)');
  });
});

describe('splitArtistTitle', () => {
  it('parte en el primer guion rodeado de espacios', () => {
    expect(splitArtistTitle('Olivia Rodrigo - traitor')).toEqual({
      artist: 'Olivia Rodrigo',
      song: 'traitor',
    });
  });

  it('no parte palabras con guion pegado', () => {
    expect(splitArtistTitle('Spider-Man Theme')).toBeNull();
  });

  it('devuelve null cuando no hay guion', () => {
    expect(splitArtistTitle('momo te cruzaste con viruzz gil?')).toBeNull();
  });
});

describe('channelToArtist', () => {
  it('trata los canales Topic como fuente autoritativa', () => {
    expect(channelToArtist('Olivia Rodrigo - Topic')).toEqual({
      artist: 'Olivia Rodrigo',
      confident: true,
    });
  });

  it('separa el camelCase de los canales VEVO', () => {
    expect(channelToArtist('OliviaRodrigoVEVO').artist).toBe('Olivia Rodrigo');
    expect(channelToArtist('HarryStylesVEVO').artist).toBe('Harry Styles');
  });

  it('no rompe acronimos', () => {
    expect(__testing.decamel('ACDC')).toBe('ACDC');
  });

  it('deja el canal comun tal cual, sin marcarlo confiable', () => {
    expect(channelToArtist('Bananirou')).toEqual({ artist: 'Bananirou', confident: false });
  });
});

describe('splitArtists', () => {
  it('separa colaboraciones por coma y por feat', () => {
    expect(splitArtists('Olivia Rodrigo, Robert Smith')).toEqual([
      'Olivia Rodrigo',
      'Robert Smith',
    ]);
    expect(splitArtists('Bad Bunny feat. Chencho Corleone')).toEqual([
      'Bad Bunny',
      'Chencho Corleone',
    ]);
  });

  it('NO parte nombres de banda con & o +', () => {
    expect(splitArtists('Simon & Garfunkel')).toEqual(['Simon & Garfunkel']);
    expect(splitArtists('Florence + The Machine')).toEqual(['Florence + The Machine']);
  });
});

describe('extractTrack', () => {
  it('unifica la misma cancion subida con adornos distintos', () => {
    const a = extractTrack({
      title: 'Olivia Rodrigo - traitor (Official Video)',
      channel: 'OliviaRodrigoVEVO',
    });
    const b = extractTrack({
      title: 'Olivia Rodrigo - traitor (Lyric Video)',
      channel: 'OliviaRodrigoVEVO',
    });
    const c = extractTrack({ title: 'traitor', channel: 'Olivia Rodrigo - Topic' });

    expect(a.songKey).toBe(b.songKey);
    expect(a.songKey).toBe(c.songKey);
    expect(a.primaryArtist).toBe('Olivia Rodrigo');
    expect(c.primaryArtist).toBe('Olivia Rodrigo');
    expect(a.song).toBe('traitor');
  });

  it('toma el primer artista como principal y el resto como colaboracion', () => {
    const track = extractTrack({
      title: "Olivia Rodrigo, Robert Smith - what's wrong with me (Lyric Video)",
      channel: 'OliviaRodrigoVEVO',
    });
    expect(track.primaryArtist).toBe('Olivia Rodrigo');
    expect(track.featured).toEqual(['Robert Smith']);
    expect(track.song).toBe("what's wrong with me");
  });

  it('cae al nombre del canal cuando el titulo no tiene forma Artista - Tema', () => {
    const track = extractTrack({
      title: 'momo te cruzaste con viruzz gil?',
      channel: 'Bananirou',
    });
    expect(track.primaryArtist).toBe('Bananirou');
  });
});
