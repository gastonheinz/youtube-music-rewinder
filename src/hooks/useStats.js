/**
 * Recalculo de estadisticas al cambiar el rango, el filtro o las correcciones.
 *
 * Los veredictos se memoizan aparte de las estadisticas: mover una fecha no
 * tiene por que rehacer la resolucion de overrides sobre todo el historial.
 */

import { useMemo } from 'react';
import { computeStats, resolveVerdicts, DEFAULT_TRACK_MINUTES } from '../lib/stats/aggregate.js';

export function useStats(dataset, { from, to, musicOnly, overrides, trackMinutes, hiddenSongs }) {
  const verdicts = useMemo(
    () => (dataset ? resolveVerdicts(dataset, overrides) : null),
    [dataset, overrides],
  );

  return useMemo(() => {
    if (!dataset || !verdicts) return null;
    return computeStats(dataset, {
      from,
      to,
      musicOnly,
      verdicts,
      trackMinutes: trackMinutes ?? DEFAULT_TRACK_MINUTES,
      hiddenSongs,
    });
  }, [dataset, verdicts, from, to, musicOnly, trackMinutes, hiddenSongs]);
}
