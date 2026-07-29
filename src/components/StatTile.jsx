/**
 * Tarjeta de una cifra. Cuando el dato es un solo numero, la forma correcta es
 * un numero, no un grafico de una barra.
 */
export function StatTile({ label, value, hint, delta }) {
  return (
    <div className="tile">
      <p className="tile__label muted">{label}</p>
      <p className="tile__value">{value}</p>
      {delta ? (
        <p className={`tile__delta tile__delta--${delta.direction}`}>
          {delta.text} <span className="muted">{delta.caption}</span>
        </p>
      ) : null}
      {hint ? <p className="tile__hint muted">{hint}</p> : null}
    </div>
  );
}

/** La unica cifra protagonista de la vista. */
export function HeroFigure({ value, label, caption }) {
  return (
    <div className="hero">
      <p className="hero__value">{value}</p>
      <p className="hero__label">{label}</p>
      {caption ? <p className="hero__caption muted">{caption}</p> : null}
    </div>
  );
}
