import {
  formatNumber,
  formatDate,
  formatDurationShort,
  formatHour,
  formatLongDayKey,
  formatDayKey,
  describePeakHour,
  pluralize,
} from '../../lib/format.js';
import { WEEKDAYS } from '../../lib/stats/time.js';
import { Thumb } from '../Thumb.jsx';

/** Lista escalonada que usan varias slides. */
function RankedList({ items, showArtist }) {
  return (
    <ol className="storylist storylist--thumbs">
      {items.map((item, index) => (
        <li key={item.key ?? item.name} style={{ animationDelay: `${index * 90}ms` }}>
          <span className="storylist__rank">{index + 1}</span>
          <Thumb videoId={item.videoId} name={item.name} className="thumb--story" />
          <span className="storylist__label">
            <strong>{item.name}</strong>
            {showArtist && item.artist ? <span className="muted">{item.artist}</span> : null}
          </span>
          <span className="storylist__value">{formatNumber(item.plays)}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Arma las slides a partir de las estadisticas. Solo se incluyen las que tienen
 * dato: si no hubo descubrimientos, no aparece una slide vacia diciendolo.
 */
export function buildSlides(stats, musicOnly) {
  const slides = [];
  const { totals } = stats;

  slides.push({
    id: 'intro',
    content: (
      <>
        <p className="story__kicker">Tu Rewind</p>
        <h2 className="story__headline">
          {formatDate(stats.range.from)}
          <br />— {formatDate(stats.range.to)}
        </h2>
        <p className="story__lead">
          {pluralize(stats.range.days, 'día', 'días')} de música, contados uno por uno.
        </p>
      </>
    ),
  });

  slides.push({
    id: 'totales',
    content: (
      <>
        <p className="story__kicker">Escuchaste</p>
        <p className="story__figure">{formatNumber(totals.plays)}</p>
        <p className="story__lead">{musicOnly ? 'reproducciones de música' : 'reproducciones'}</p>
        <p className="story__note muted">
          Son unas {formatDurationShort(totals.estimatedMinutes)} estimadas — Takeout no guarda
          cuánto dura cada video, así que se calcula por promedio.
        </p>
      </>
    ),
  });

  if (stats.topSongs.length) {
    slides.push({
      id: 'canciones',
      content: (
        <>
          <p className="story__kicker">Tus canciones</p>
          <RankedList items={stats.topSongs.slice(0, 5)} showArtist />
        </>
      ),
    });
  }

  if (stats.topArtists.length) {
    slides.push({
      id: 'artistas',
      content: (
        <>
          <p className="story__kicker">Tus artistas</p>
          <RankedList items={stats.topArtists.slice(0, 5)} />
        </>
      ),
    });

    const top = stats.topArtists[0];
    const share = totals.plays ? Math.round((top.plays / totals.plays) * 100) : 0;
    slides.push({
      id: 'artista-1',
      content: (
        <>
          <p className="story__kicker">Tu artista número uno</p>
          <Thumb
            videoId={top.videoId}
            name={top.name}
            size="large"
            className="thumb--hero"
          />
          <h2 className="story__headline story__headline--big">{top.name}</h2>
          <p className="story__lead">
            {pluralize(top.plays, 'reproducción', 'reproducciones')} · {share}% de todo lo que
            escuchaste
          </p>
          <p className="story__note muted">
            {pluralize(top.songs, 'canción distinta', 'canciones distintas')}
          </p>
        </>
      ),
    });
  }

  const peakHour = stats.byHour.indexOf(Math.max(...stats.byHour));
  const peakWeekday = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));
  if (totals.plays > 0) {
    slides.push({
      id: 'hora',
      content: (
        <>
          <p className="story__kicker">{describePeakHour(peakHour)}</p>
          <p className="story__figure">{formatHour(peakHour)}</p>
          <p className="story__lead">es tu hora pico</p>
          <p className="story__note muted">
            Y los {WEEKDAYS[peakWeekday].toLowerCase()}s son tu día fuerte.
          </p>
        </>
      ),
    });
  }

  if (stats.obsession && stats.obsession.plays > 1) {
    slides.push({
      id: 'obsesion',
      content: (
        <>
          <p className="story__kicker">Tu obsesión</p>
          <Thumb
            videoId={stats.obsession.videoId}
            name={stats.obsession.name}
            size="large"
            className="thumb--hero"
          />
          <h2 className="story__headline">{stats.obsession.name}</h2>
          <p className="story__lead">
            {stats.obsession.plays} veces en un solo día
            {stats.obsession.artist ? ` · ${stats.obsession.artist}` : ''}
          </p>
          <p className="story__note muted">Fue el {formatDayKey(stats.obsession.date)}.</p>
        </>
      ),
    });
  }

  if (stats.streak.days > 1 || stats.peakDay) {
    slides.push({
      id: 'racha',
      content: (
        <>
          <p className="story__kicker">Tu mejor momento</p>
          {stats.streak.days > 1 ? (
            <>
              <p className="story__figure">{stats.streak.days}</p>
              <p className="story__lead">días seguidos con música</p>
              <p className="story__note muted">
                Del {formatDayKey(stats.streak.from)} al {formatDayKey(stats.streak.to)}.
              </p>
            </>
          ) : null}
          {stats.peakDay ? (
            <p className="story__note muted">
              Tu día récord fue el {formatLongDayKey(stats.peakDay.date)}, con{' '}
              {pluralize(stats.peakDay.plays, 'reproducción', 'reproducciones')}.
            </p>
          ) : null}
        </>
      ),
    });
  }

  if (stats.discoveries.length) {
    slides.push({
      id: 'descubrimientos',
      content: (
        <>
          <p className="story__kicker">Descubriste</p>
          <RankedList items={stats.discoveries.slice(0, 5)} />
          <p className="story__note muted">
            Artistas que sonaron por primera vez en este período.
          </p>
        </>
      ),
    });
  }

  slides.push({
    id: 'cierre',
    content: (
      <>
        <p className="story__kicker">Y eso fue todo</p>
        <h2 className="story__headline">
          {formatNumber(totals.plays)} reproducciones,
          <br />
          {formatNumber(totals.artists)} artistas,
          <br />
          {formatNumber(totals.songs)} canciones.
        </h2>
        <p className="story__lead">Llevátelo en una imagen.</p>
      </>
    ),
  });

  return slides;
}
