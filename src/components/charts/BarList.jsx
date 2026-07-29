import { formatNumber } from '../../lib/format.js';
import { ChartFrame, EmptyChart } from './ChartFrame.jsx';

/**
 * Ranking en barras horizontales.
 *
 * Todas las barras van del MISMO color. Artistas y canciones son categorias
 * nominales: pintarlas mas oscuras cuanto mas grandes duplicaria en el color lo
 * que el largo de la barra ya dice, y gastaria el unico canal libre que queda.
 */
export function BarList({ title, subtitle, items, unitLabel = 'reproducciones', footer, nameHeader = 'Nombre' }) {
  if (!items?.length) {
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyChart />
      </ChartFrame>
    );
  }

  const max = Math.max(...items.map((item) => item.plays));

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      footer={footer}
      columns={['#', nameHeader, 'Reproducciones']}
      rows={items.map((item, index) => [
        String(index + 1),
        item.secondary ? `${item.name} — ${item.secondary}` : item.name,
        formatNumber(item.plays),
      ])}
    >
      <ol className="barlist">
        {items.map((item, index) => (
          <li key={item.key ?? item.name} className="barlist__row">
            <span className="barlist__rank" aria-hidden="true">
              {index + 1}
            </span>
            <span className="barlist__label">
              <span className="barlist__name" title={item.name}>
                {item.name}
              </span>
              {item.secondary ? (
                <span className="barlist__secondary muted">{item.secondary}</span>
              ) : null}
            </span>
            <span className="barlist__track">
              <span
                className="barlist__bar"
                style={{ width: `${Math.max((item.plays / max) * 100, 1.5)}%` }}
              />
            </span>
            <span className="barlist__value">
              {formatNumber(item.plays)}
              <span className="visually-hidden"> {unitLabel}</span>
            </span>
          </li>
        ))}
      </ol>
    </ChartFrame>
  );
}
