import { useState } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth.js';
import { formatNumber, formatHour } from '../../lib/format.js';
import { WEEKDAYS, WEEKDAYS_SHORT } from '../../lib/stats/time.js';
import { ChartFrame, ChartTooltip, EmptyChart } from './ChartFrame.jsx';
import { rampIndex } from './scale.js';

const PAD = { top: 8, right: 8, bottom: 26, left: 40 };
const GAP = 2; // separacion en color de superficie entre celdas
const RAMP = ['var(--seq-0)', 'var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)', 'var(--seq-6)'];

/**
 * Cuadricula dia de la semana x hora del dia.
 *
 * Es el caso legitimo de rampa secuencial: un solo tono, mas oscuro (o mas
 * claro en tema oscuro) cuanto mayor la magnitud. Las horas son locales.
 */
export function Heatmap({ title, subtitle, matrix, footer }) {
  const [containerRef, width] = useElementWidth(680);
  const [tip, setTip] = useState(null);

  const max = Math.max(...matrix.flat());
  if (!max) {
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyChart />
      </ChartFrame>
    );
  }

  const plotWidth = Math.max(240, width - PAD.left - PAD.right);
  const cellWidth = plotWidth / 24;
  const cellHeight = Math.max(14, Math.min(26, cellWidth));
  const height = PAD.top + cellHeight * 7 + PAD.bottom;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      footer={footer}
      columns={['Día', ...Array.from({ length: 24 }, (_, hour) => formatHour(hour))]}
      rows={matrix.map((row, day) => [WEEKDAYS[day], ...row.map((value) => formatNumber(value))])}
    >
      <div className="chart__plot" ref={containerRef}>
        <svg width={width} height={height} role="img" aria-label={`${title}. ${subtitle ?? ''}`}>
          {matrix.map((row, day) =>
            row.map((value, hour) => (
              <rect
                key={`${day}-${hour}`}
                x={PAD.left + hour * cellWidth + GAP / 2}
                y={PAD.top + day * cellHeight + GAP / 2}
                width={Math.max(1, cellWidth - GAP)}
                height={Math.max(1, cellHeight - GAP)}
                rx="2"
                fill={RAMP[rampIndex(value, max, RAMP.length)]}
                onMouseEnter={() =>
                  setTip({
                    x: PAD.left + hour * cellWidth + cellWidth / 2,
                    y: PAD.top + day * cellHeight - 6,
                    title: `${WEEKDAYS[day]} ${formatHour(hour)}`,
                    value: `${formatNumber(value)} reproducciones`,
                  })
                }
                onMouseLeave={() => setTip(null)}
              />
            )),
          )}

          {WEEKDAYS_SHORT.map((label, day) => (
            <text
              key={label}
              x={PAD.left - 8}
              y={PAD.top + day * cellHeight + cellHeight / 2 + 4}
              textAnchor="end"
              className="chart__tick"
            >
              {label}
            </text>
          ))}

          {[0, 6, 12, 18, 23].map((hour) => (
            <text
              key={hour}
              x={PAD.left + hour * cellWidth + cellWidth / 2}
              y={height - 8}
              textAnchor="middle"
              className="chart__tick"
            >
              {formatHour(hour)}
            </text>
          ))}
        </svg>
        <ChartTooltip tip={tip} />
      </div>

      {/* Leyenda de escala: sin ella una rampa continua no se puede leer. */}
      <div className="heatmap__legend">
        <span className="muted">Menos</span>
        {RAMP.map((color) => (
          <span key={color} className="heatmap__swatch" style={{ background: color }} />
        ))}
        <span className="muted">Más ({formatNumber(max)})</span>
      </div>
    </ChartFrame>
  );
}
