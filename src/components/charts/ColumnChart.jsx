import { useState } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth.js';
import { formatNumber } from '../../lib/format.js';
import { ChartFrame, ChartTooltip, EmptyChart } from './ChartFrame.jsx';
import { yTicks } from './scale.js';

const HEIGHT = 200;
const PAD = { top: 12, right: 8, bottom: 30, left: 44 };
const MAX_BAR = 24;

/**
 * Columnas para una serie unica sobre un eje discreto (horas del dia, dias de
 * la semana). Una sola serie, un solo color: el largo ya codifica la magnitud.
 */
export function ColumnChart({ title, subtitle, data, categoryHeader, footer, highlightIndex = -1 }) {
  const [containerRef, width] = useElementWidth(680);
  const [tip, setTip] = useState(null);

  const total = data.reduce((sum, point) => sum + point.value, 0);
  if (!total) {
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyChart />
      </ChartFrame>
    );
  }

  const plotWidth = Math.max(120, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const band = plotWidth / data.length;
  const barWidth = Math.min(MAX_BAR, Math.max(3, band - 4));

  const { top, ticks } = yTicks(Math.max(...data.map((point) => point.value)));
  const toY = (value) => PAD.top + plotHeight - (value / top) * plotHeight;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      footer={footer}
      columns={[categoryHeader, 'Reproducciones']}
      rows={data.map((point) => [point.label, formatNumber(point.value)])}
    >
      <div className="chart__plot" ref={containerRef}>
        <svg width={width} height={HEIGHT} role="img" aria-label={`${title}. ${subtitle ?? ''}`}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={toY(tick)}
                y2={toY(tick)}
                stroke="var(--grid)"
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <text x={PAD.left - 8} y={toY(tick) + 4} textAnchor="end" className="chart__tick">
                {formatNumber(tick)}
              </text>
            </g>
          ))}

          {data.map((point, index) => {
            const x = PAD.left + index * band + (band - barWidth) / 2;
            const y = toY(point.value);
            const height = PAD.top + plotHeight - y;
            const isHighlight = index === highlightIndex;

            return (
              <g key={point.label}>
                {point.value > 0 ? (
                  /* Punta redondeada arriba (fin del dato), cuadrada en la base. */
                  <path
                    d={roundedTopBar(x, y, barWidth, height, 4)}
                    fill="var(--series-1)"
                    opacity={highlightIndex >= 0 && !isHighlight ? 0.45 : 1}
                  />
                ) : null}

                {/* Zona sensible generosa: cubre toda la altura de la banda. */}
                <rect
                  x={PAD.left + index * band}
                  y={PAD.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.label}: ${formatNumber(point.value)} reproducciones`}
                  onMouseEnter={() =>
                    setTip({
                      x: PAD.left + index * band + band / 2,
                      y: Math.max(y - 12, 0),
                      title: point.label,
                      value: `${formatNumber(point.value)} reproducciones`,
                    })
                  }
                  onFocus={() =>
                    setTip({
                      x: PAD.left + index * band + band / 2,
                      y: Math.max(y - 12, 0),
                      title: point.label,
                      value: `${formatNumber(point.value)} reproducciones`,
                    })
                  }
                  onMouseLeave={() => setTip(null)}
                  onBlur={() => setTip(null)}
                />
              </g>
            );
          })}

          <line
            x1={PAD.left}
            x2={PAD.left + plotWidth}
            y1={PAD.top + plotHeight}
            y2={PAD.top + plotHeight}
            stroke="var(--axis)"
            strokeWidth="1"
            shapeRendering="crispEdges"
          />

          {data.map((point, index) =>
            point.tick ? (
              <text
                key={`tick-${point.label}`}
                x={PAD.left + index * band + band / 2}
                y={HEIGHT - 10}
                textAnchor="middle"
                className="chart__tick"
              >
                {point.tick}
              </text>
            ) : null,
          )}
        </svg>
        <ChartTooltip tip={tip} />
      </div>
    </ChartFrame>
  );
}

/** Rectangulo con las dos esquinas superiores redondeadas. */
function roundedTopBar(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height);
  return [
    `M ${x} ${y + height}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height}`,
    'Z',
  ].join(' ');
}
