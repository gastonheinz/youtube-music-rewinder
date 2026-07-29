import { describe, it, expect } from 'vitest';
import { classifyEntry, resolveVerdict, MUSIC, NOT_MUSIC } from './classify.js';

describe('classifyEntry', () => {
  it('acepta con confianza alta lo que viene de YouTube Music', () => {
    const result = classifyEntry({
      title: 'Blinding Lights',
      channel: 'The Weeknd - Topic',
      fromMusicProduct: true,
    });
    expect(result.verdict).toBe(MUSIC);
    expect(result.confidence).toBe('alta');
  });

  it('reconoce canales Topic y VEVO', () => {
    expect(classifyEntry({ title: 'traitor', channel: 'Olivia Rodrigo - Topic' })).toMatchObject({
      verdict: MUSIC,
      confidence: 'alta',
    });
    expect(
      classifyEntry({ title: 'Sign of the Times', channel: 'HarryStylesVEVO' }),
    ).toMatchObject({ verdict: MUSIC, confidence: 'alta' });
  });

  it('reconoce titulos de videoclip aunque el canal no diga nada', () => {
    expect(
      classifyEntry({ title: 'Artista - Tema (Official Music Video)', channel: 'CanalX' }),
    ).toMatchObject({ verdict: MUSIC, confidence: 'alta' });
  });

  it('descarta formatos claramente no musicales', () => {
    expect(
      classifyEntry({ title: 'GTA V - Gameplay épico capítulo 3', channel: 'ElRubiusOMG' }),
    ).toMatchObject({ verdict: NOT_MUSIC, confidence: 'alta' });
    expect(
      classifyEntry({ title: 'momo te cruzaste con viruzz gil?', channel: 'Bananirou' }),
    ).toMatchObject({ verdict: NOT_MUSIC });
  });

  it('manda los ambiguos a revision en vez de adivinar', () => {
    const result = classifyEntry({
      title: 'Bully - Soundtrack Walking Theme',
      channel: 'CanisCanemEditBully',
    });
    expect(result.confidence).toBe('media');
  });

  it('no confia en un titulo de clip dentro de un video de reaccion', () => {
    const result = classifyEntry({
      title: 'REACCIÓN a Olivia Rodrigo - traitor (Official Video)',
      channel: 'CanalDeReacciones',
    });
    expect(result.confidence).toBe('media');
  });
});

describe('resolveVerdict', () => {
  const heuristic = { verdict: NOT_MUSIC, confidence: 'baja', reason: 'Sin senales' };

  it('el override de video le gana al de canal', () => {
    const result = resolveVerdict({
      classification: heuristic,
      videoId: 'abc',
      channel: 'CanalX',
      overrides: { videos: { abc: MUSIC }, channels: { CanalX: NOT_MUSIC } },
    });
    expect(result.verdict).toBe(MUSIC);
    expect(result.source).toBe('video');
  });

  it('el override de canal le gana a la heuristica', () => {
    const result = resolveVerdict({
      classification: heuristic,
      videoId: 'abc',
      channel: 'CanalX',
      overrides: { videos: {}, channels: { CanalX: MUSIC } },
    });
    expect(result.verdict).toBe(MUSIC);
    expect(result.source).toBe('canal');
  });

  it('sin overrides manda la heuristica', () => {
    const result = resolveVerdict({
      classification: heuristic,
      videoId: 'abc',
      channel: 'CanalX',
      overrides: { videos: {}, channels: {} },
    });
    expect(result.verdict).toBe(NOT_MUSIC);
    expect(result.source).toBe('heuristica');
  });
});
