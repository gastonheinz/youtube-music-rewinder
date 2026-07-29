import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildSlides } from './slides.jsx';
import { downloadShareCard } from '../../lib/shareCard.js';
import { formatDate, formatDurationShort } from '../../lib/format.js';

const AUTO_ADVANCE_MS = 6000;

/**
 * Reproductor de historias a pantalla completa.
 *
 * Avanza solo, pero se puede pausar y navegar a mano. Con
 * prefers-reduced-motion el avance automatico queda desactivado de entrada:
 * un carrusel que se mueve solo es justo lo que esa preferencia pide evitar.
 */
export function StoriesPlayer({ stats, musicOnly, onClose }) {
  const slides = useMemo(() => buildSlides(stats, musicOnly), [stats, musicOnly]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(Boolean(prefersReducedMotion));
  const [downloading, setDownloading] = useState(false);

  const goNext = useCallback(() => {
    setIndex((current) => (current < slides.length - 1 ? current + 1 : current));
  }, [slides.length]);

  const goPrevious = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') goNext();
      else if (event.key === 'ArrowLeft') goPrevious();
      else if (event.key === ' ') {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrevious, onClose]);

  useEffect(() => {
    if (paused || index >= slides.length - 1) return undefined;
    const timer = setTimeout(goNext, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [paused, index, slides.length, goNext]);

  // Bloquear el scroll del fondo mientras las historias estan abiertas.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadShareCard(stats, {
        rangeLabel: `${formatDate(stats.range.from)} – ${formatDate(stats.range.to)}`,
        musicOnly,
        durationLabel: formatDurationShort(stats.totals.estimatedMinutes),
      });
    } finally {
      setDownloading(false);
    }
  };

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div className="stories" role="dialog" aria-modal="true" aria-label="Tu Rewind">
      <div className="stories__progress">
        {slides.map((item, slideIndex) => (
          <span key={item.id} className="stories__progressTrack">
            <span
              className="stories__progressFill"
              style={{ width: slideIndex <= index ? '100%' : '0%' }}
            />
          </span>
        ))}
      </div>

      <div className="stories__toolbar">
        <button
          type="button"
          className="stories__control"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
        >
          {paused ? 'Reanudar' : 'Pausar'}
        </button>
        <button type="button" className="stories__control" onClick={onClose}>
          Cerrar
        </button>
      </div>

      {/* Zonas de toque a los costados, como en cualquier visor de historias. */}
      <button
        type="button"
        className="stories__zone stories__zone--prev"
        onClick={goPrevious}
        disabled={index === 0}
        aria-label="Anterior"
      />
      <button
        type="button"
        className="stories__zone stories__zone--next"
        onClick={goNext}
        disabled={isLast}
        aria-label="Siguiente"
      />

      <div className="stories__stage" key={slide.id}>
        <div className="stories__slide">{slide.content}</div>

        {isLast ? (
          <div className="stories__actions">
            <button type="button" className="button" onClick={handleDownload} disabled={downloading}>
              {downloading ? 'Generando…' : 'Descargar imagen'}
            </button>
            <button type="button" className="button button--ghost" onClick={onClose}>
              Volver al panel
            </button>
          </div>
        ) : null}
      </div>

      <p className="stories__hint muted">
        {index + 1} de {slides.length} · usá las flechas ← → para moverte, Esc para salir
      </p>
    </div>
  );
}
