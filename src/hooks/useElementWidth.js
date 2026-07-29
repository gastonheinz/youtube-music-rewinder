import { useCallback, useEffect, useState } from 'react';

/**
 * Ancho real del contenedor, para dibujar SVG a escala 1:1.
 *
 * Alternativa descartada: un viewBox fijo escalado por CSS. Escala tambien el
 * texto, asi que en pantallas angostas las etiquetas de los ejes quedan
 * ilegibles. Midiendo el contenedor, el texto conserva su tamaño real.
 */
export function useElementWidth(fallback = 640) {
  const [width, setWidth] = useState(fallback);
  const [node, setNode] = useState(null);

  const ref = useCallback((element) => setNode(element), []);

  useEffect(() => {
    if (!node) return undefined;

    const update = () => setWidth(node.clientWidth || fallback);
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, fallback]);

  return [ref, width];
}
