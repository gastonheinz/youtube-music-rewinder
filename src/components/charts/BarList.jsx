import { formatNumber } from '../../lib/format.js';
import { Thumb } from '../Thumb.jsx';
import { ChartFrame, EmptyChart } from './ChartFrame.jsx';

/**
 * Ranking en barras horizontales.
 *
 * Todas las barras van del MISMO color. Artistas y canciones son categorias
 * nominales: pintarlas mas oscuras cuanto mas grandes duplicaria en el color lo
 * que el largo de la barra ya dice, y gastaria el unico canal libre que queda.
 *
 * Si los items traen `videoId` aparece la miniatura del video. La columna se
 * agrega o no para TODA la lista, no fila por fila, porque una grilla con
 * imagenes intercaladas desalinea los nombres.
 */
export function BarList({
  title,
  subtitle,
  items,
  unitLabel = 'reproducciones',
  footer,
  nameHeader = 'Nombre',
  onHideItem,
}) {
  if (!items?.length) {
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <EmptyChart />
      </ChartFrame>
    );
  }

  const max = Math.max(...items.map((item) => item.plays));
  const withThumbs = items.some((item) => item.videoId);

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
      <ol
        className={`barlist${onHideItem ? ' barlist--hideable' : ''}${
          withThumbs ? ' barlist--thumbs' : ''
        }`}
      >
        {items.map((item, index) => (
          <li key={item.key ?? item.name} className="barlist__row">
            <span className="barlist__rank" aria-hidden="true">
              {index + 1}
            </span>
            {withThumbs ? (
              <Thumb videoId={item.videoId} name={item.name} className="thumb--row" />
            ) : null}
            <span className="barlist__label">
              {item.nameHref ? (
                <a
                  className="barlist__name barlist__name--link"
                  title={item.name}
                  href={item.nameHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  {item.name}
                </a>
              ) : (
                <span className="barlist__name" title={item.name}>
                  {item.name}
                </span>
              )}
              {item.secondary ? (
                item.secondaryHref ? (
                  <a
                    className="barlist__secondary barlist__secondary--link muted"
                    href={item.secondaryHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {item.secondary}
                  </a>
                ) : (
                  <span className="barlist__secondary muted">{item.secondary}</span>
                )
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
            {onHideItem ? (
              <button
                type="button"
                className="barlist__hide"
                title={`Ocultar «${item.name}» del top`}
                aria-label={`Ocultar «${item.name}» del top`}
                onClick={() => onHideItem(item)}
              >
                ✕
              </button>
            ) : null}
          </li>
        ))}
      </ol>
    </ChartFrame>
  );
}
