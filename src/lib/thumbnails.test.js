import { describe, it, expect } from 'vitest';
import { thumbnailUrl, isVideoId } from './thumbnails.js';

describe('isVideoId', () => {
  it('acepta un id de YouTube bien formado', () => {
    expect(isVideoId('CRrf3h9vhp8')).toBe(true);
    expect(isVideoId('-ZDzky-Ytqk')).toBe(true);
    expect(isVideoId('a_b-c1D2E3F')).toBe(true);
  });

  it('rechaza lo que no tiene los 11 caracteres exactos', () => {
    expect(isVideoId('corto')).toBe(false);
    expect(isVideoId('demasiadolargoparaser')).toBe(false);
  });

  it('rechaza caracteres fuera del alfabeto base64url', () => {
    expect(isVideoId('CRrf3h9vhp!')).toBe(false);
    expect(isVideoId('CRrf3h9vhp/')).toBe(false);
  });

  it('rechaza vacios y valores que no son string', () => {
    expect(isVideoId('')).toBe(false);
    expect(isVideoId(null)).toBe(false);
    expect(isVideoId(undefined)).toBe(false);
    expect(isVideoId(12345678901)).toBe(false);
  });
});

describe('thumbnailUrl', () => {
  it('usa mqdefault por defecto, que es el 16:9 sin bandas negras', () => {
    expect(thumbnailUrl('CRrf3h9vhp8')).toBe('https://i.ytimg.com/vi/CRrf3h9vhp8/mqdefault.jpg');
  });

  it('respeta el tamano pedido', () => {
    expect(thumbnailUrl('CRrf3h9vhp8', 'large')).toBe(
      'https://i.ytimg.com/vi/CRrf3h9vhp8/hqdefault.jpg',
    );
    expect(thumbnailUrl('CRrf3h9vhp8', 'small')).toBe(
      'https://i.ytimg.com/vi/CRrf3h9vhp8/default.jpg',
    );
  });

  it('cae al tamano medio si le pasan uno que no existe', () => {
    expect(thumbnailUrl('CRrf3h9vhp8', 'gigante')).toBe(
      'https://i.ytimg.com/vi/CRrf3h9vhp8/mqdefault.jpg',
    );
  });

  // Sin esto un id invalido dispararia un pedido a i.ytimg.com que nunca puede
  // resolver, y encima filtraria basura del historial en la URL.
  it('devuelve null en vez de una URL rota', () => {
    expect(thumbnailUrl('')).toBeNull();
    expect(thumbnailUrl(null)).toBeNull();
    expect(thumbnailUrl('esto no es un id')).toBeNull();
    expect(thumbnailUrl('https://www.youtube.com/watch?v=CRrf3h9vhp8')).toBeNull();
  });
});
