import { useState } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth.js';
import { formatNumber, formatDayKey } from '../../lib/format.js';
import { ChartFrame, ChartTooltip, EmptyChart } from './ChartFrame.jsx';
import { yTicks } from './scale.js';

const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 30, left: 44 };

/**
 * Evolucion diaria. Serie unica -> area de un solo tono al 10% con la linea de
 * 2px encima. Los dias sin escuchas vienen con valor 0 desde las estadisticas,
 * asi que los huecos de inactividad se ven como huecos y no se comprimen.
 */
export function TimelineChart({ title, subtitle, points, footer }) {
  const [containerRef, width] = useElementWidth(680);
  const [tip, setTip] = useState(null);

  if (!points?.length) {
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyChart />
      </ChartFrame>
    );
  }

  const plotWidth = Math.max(120, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const { top, ticks } = yTicks(Math.max(...points.map((point) => point.plays)));

  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const toX = (index) => PAD.left + index * stepX;
  const toY = (value) => PAD.top + plotHeight - (value / top) * plotHeight;

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.plays)}`).join(' ');
  const area = `${line} L ${toX(points.length - 1)} ${PAD.top + plotHeight} L ${toX(0)} ${PAD.top + plotHeight} Z`;

  const peakIndex = points.reduce(
    (best, point, index) => (point.plays > points[best].plays ? index : best),
    0,
  );

  // Como maximo 6 fechas en el eje, para que no se pisen.
  const tickEvery = Math.max(1, Math.ceil(points.length / 6));

  const handlePointer = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const index = Math.round((x - PAD.left) / (stepX || 1));
    const point = points[Math.min(points.length - 1, Math.max(0, index))];
    if (!point) return;
    setTip({
      x: toX(points.indexOf(point)),
      y: Math.max(toY(point.plays) - 12, 0),
      title: formatDayKey(point.date),
      value: `${formatNumber(point.plays)} reproducciones`,
    });
  };

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      footer={footer}
      columns={['Fecha', 'Reproducciones']}
      rows={points.map((point) => [formatDayKey(point.date), formatNumber(point.plays)])}
    >
      <div className="chart__plot" ref={containerRef}>
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${title}. ${subtitle ?? ''}`}
          onMouseMove={handlePointer}
          onMouseLeave={() => setTip(null)}
        >
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

          <path d={area} fill="var(--series-1)" opacity="0.1" />
          <path
            d={line}
            fill="none"
            stroke="var(--series-1)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Unica etiqueta directa: el pico. El resto lo cargan el eje y el tooltip. */}
          <circle
            cx={toX(peakIndex)}
            cy={toY(points[peakIndex].plays)}
            r="4.5"
            fill="var(--series-1)"
            stroke="var(--surface-1)"
            strokeWidth="2"
          />

          {tip ? (
            <line
              x1={tip.x}
              x2={tip.x}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
              stroke="var(--axis)"
              strokeWidth="1"
              shapeRendering="crispEdges"
            />
          ) : null}

          <line
            x1={PAD.left}
            x2={PAD.left + plotWidth}
            y1={PAD.top + plotHeight}
            y2={PAD.top + plotHeight}
            stroke="var(--axis)"
            strokeWidth="1"
            shapeRendering="crispEdges"
          />

          {points.map((point, index) =>
            index % tickEvery === 0 ? (
              <text
                key={point.date}
                x={toX(index)}
                y={HEIGHT - 10}
                textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
                className="chart__tick"
              >
                {formatDayKey(point.date)}
              </text>
            ) : null,
          )}
        </svg>
        <ChartTooltip tip={tip} />
      </div>
    </ChartFrame>
  );
}
