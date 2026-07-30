import { useId, useState } from 'react';

/**
 * Marco comun de todos los graficos.
 *
 * Se encarga de dos cosas que ningun grafico puede no tener: el titulo que dice
 * que se esta mirando, y la tabla equivalente. La tabla siempre esta en el DOM
 * (los lectores de pantalla la leen aunque este oculta) y el boton solo la
 * vuelve visible: asi ningun valor queda accesible unicamente por el tooltip.
 */
export function ChartFrame({ title, subtitle, columns, rows, children, footer }) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    <figure className="chart">
      <figcaption className="chart__head">
        <div>
          <h3 className="chart__title">{title}</h3>
          {subtitle ? <p className="chart__subtitle muted">{subtitle}</p> : null}
        </div>
        {rows?.length ? (
          <button
            type="button"
            className="chart__toggle"
            aria-expanded={showTable}
            aria-controls={tableId}
            onClick={() => setShowTable((value) => !value)}
          >
            {showTable ? 'Ocultar datos' : 'Ver datos'}
          </button>
        ) : null}
      </figcaption>

      <div className="chart__body">{children}</div>

      {footer ? <p className="chart__footer muted">{footer}</p> : null}

      {/*
        La tabla va SIEMPRE envuelta en un div. Un <table> ignora width:1px
        (nunca baja de su ancho minimo de contenido), asi que .visually-hidden
        aplicada directo sobre ella no la recorta y la tabla del heatmap, con
        sus 25 columnas, terminaba generando scroll horizontal en toda la pagina.
      */}
      {rows?.length ? (
        <div id={tableId} className={showTable ? 'chart__tableWrap' : 'visually-hidden'}>
          <table className="chart__table">
            <caption className="visually-hidden">{title}</caption>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th key={cellIndex} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={cellIndex}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </figure>
  );
}

/** Tooltip flotante compartido. Se posiciona sobre el contenedor del grafico. */
export function ChartTooltip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="chart__tooltip"
      role="status"
      style={{ left: `${tip.x}px`, top: `${tip.y}px` }}
    >
      <strong>{tip.title}</strong>
      <span>{tip.value}</span>
    </div>
  );
}

export function EmptyChart({ message = 'No hay datos en este rango.' }) {
  return <p className="chart__empty muted">{message}</p>;
}
