/**
 * Tarjeta de una cifra. Cuando el dato es un solo numero, la forma correcta es
 * un numero, no un grafico de una barra.
 *
 * El orden rotulo -> cifra -> nota no es casual: el rotulo dice que se mide, la
 * cifra es lo que se viene a leer y la nota es la letra chica. Cada nivel baja
 * de tamano y de tinta para que la lectura sea en ese orden y no al reves.
 */
export function StatTile({ label, value, hint, delta }) {
  return (
    <div className="tile">
      <p className="tile__label">{label}</p>
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

/**
 * La unica cifra protagonista de la vista.
 *
 * El rotulo y el pie van al costado del numero, no debajo: apilados dejaban la
 * cifra sola arriba a la izquierda de una caja ancha y vacia.
 */
export function HeroFigure({ value, label, caption }) {
  return (
    <div className="hero">
      <p className="hero__value">{value}</p>
      <div className="hero__text">
        <p className="hero__label">{label}</p>
        {caption ? <p className="hero__caption muted">{caption}</p> : null}
      </div>
    </div>
  );
}
