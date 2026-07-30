import { HeroFigure, StatTile } from './StatTile.jsx';
import { BarList } from './charts/BarList.jsx';
import { ColumnChart } from './charts/ColumnChart.jsx';
import { Heatmap } from './charts/Heatmap.jsx';
import { TimelineChart } from './charts/TimelineChart.jsx';
import { WEEKDAYS, WEEKDAYS_SHORT, monthKeyToLabel } from '../lib/stats/time.js';
import {
  formatNumber,
  formatDecimal,
  formatDurationShort,
  formatHour,
  formatPercent,
  formatDate,
  formatLongDayKey,
  formatDayKey,
  describePeakHour,
  pluralize,
} from '../lib/format.js';

export function Dashboard({
  stats,
  musicOnly,
  trackMinutes,
  hiddenSongsCount = 0,
  onHideSong,
  onUnhideAllSongs,
}) {
  const { totals, comparison } = stats;

  if (!totals.plays) {
    return (
      <p className="alert alert--soft">
        No hay reproducciones en este rango. Probá ampliando las fechas o desactivando «Solo música».
      </p>
    );
  }

  const peakHour = stats.byHour.indexOf(Math.max(...stats.byHour));
  const peakWeekday = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));

  const delta =
    comparison.deltaPct === null
      ? null
      : {
          direction: comparison.delta >= 0 ? 'up' : 'down',
          text: formatPercent(comparison.deltaPct),
          caption: 'vs. período anterior',
        };

  return (
    <div className="dashboard">
      <section className="dashboard__hero card">
        <HeroFigure
          value={formatNumber(totals.plays)}
          label={musicOnly ? 'reproducciones de música' : 'reproducciones'}
          caption={`${formatDate(stats.range.from)} – ${formatDate(stats.range.to)} · ${pluralize(stats.range.days, 'día', 'días')}`}
        />
        {delta ? (
          <p className={`hero__delta hero__delta--${delta.direction}`}>
            {delta.text} <span className="muted">{delta.caption}</span>
          </p>
        ) : null}
      </section>

      <section className="tiles">
        <StatTile label="Canciones distintas" value={formatNumber(totals.songs)} />
        <StatTile label="Artistas distintos" value={formatNumber(totals.artists)} />
        <StatTile
          label="Tiempo escuchado"
          value={formatDurationShort(totals.estimatedMinutes)}
          hint={`Estimado: Takeout no guarda la duración de los videos. Calculado a ${formatDecimal(trackMinutes)} min por tema.`}
        />
        <StatTile
          label="Días con música"
          value={formatNumber(totals.activeDays)}
          hint={`de ${pluralize(stats.range.days, 'día', 'días')} en el rango`}
        />
        <StatTile
          label="Promedio por día activo"
          value={formatDecimal(totals.avgPerActiveDay)}
          hint="reproducciones"
        />
        <StatTile
          label="Racha más larga"
          value={pluralize(stats.streak.days, 'día', 'días')}
          hint={
            stats.streak.from
              ? `${formatDayKey(stats.streak.from)} – ${formatDayKey(stats.streak.to)}`
              : undefined
          }
        />
      </section>

      <section className="grid grid--2">
        <BarList
          title="Artistas más escuchados"
          subtitle={`Top ${Math.min(stats.topArtists.length, 20)} del período`}
          nameHeader="Artista"
          items={stats.topArtists.map((artist) => ({
            key: artist.key,
            name: artist.name,
            secondary: pluralize(artist.songs, 'canción', 'canciones'),
            plays: artist.plays,
          }))}
        />
        <BarList
          title="Canciones más escuchadas"
          subtitle="Las subidas repetidas del mismo tema cuentan juntas"
          nameHeader="Canción"
          items={stats.topSongs.map((song) => ({
            key: song.key,
            name: song.name,
            secondary: song.artist,
            plays: song.plays,
            hideKey: song.hideKey,
          }))}
          onHideItem={onHideSong ? (item) => onHideSong(item.hideKey) : undefined}
          footer={
            hiddenSongsCount ? (
              <>
                {pluralize(hiddenSongsCount, 'canción oculta', 'canciones ocultas')} del top ·{' '}
                <button type="button" className="linkbutton" onClick={onUnhideAllSongs}>
                  mostrar todas
                </button>
              </>
            ) : undefined
          }
        />
      </section>

      <section className="grid">
        <TimelineChart
          title="Tu actividad día a día"
          subtitle="El punto marca el día que más escuchaste"
          points={stats.timeline}
        />
      </section>

      <section className="grid grid--2">
        <ColumnChart
          title="A qué hora escuchás"
          subtitle={describePeakHour(peakHour)}
          categoryHeader="Hora"
          highlightIndex={peakHour}
          footer="Horas en tu zona horaria local, no en UTC."
          data={stats.byHour.map((value, hour) => ({
            label: formatHour(hour),
            value,
            tick: hour % 3 === 0 ? String(hour).padStart(2, '0') : null,
          }))}
        />
        <ColumnChart
          title="Qué días escuchás"
          subtitle={`Tu día fuerte es el ${WEEKDAYS[peakWeekday].toLowerCase()}`}
          categoryHeader="Día"
          highlightIndex={peakWeekday}
          data={stats.byWeekday.map((value, day) => ({
            label: WEEKDAYS[day],
            value,
            tick: WEEKDAYS_SHORT[day],
          }))}
        />
      </section>

      <section className="grid">
        <Heatmap
          title="Tu semana, hora por hora"
          subtitle="Dónde se concentra tu escucha"
          matrix={stats.heatmap}
          footer="Horas en tu zona horaria local."
        />
      </section>

      <section className="grid grid--2">
        <div className="chart">
          <h3 className="chart__title">Momentos</h3>
          <ul className="moments">
            {stats.peakDay ? (
              <li>
                <span className="muted">Tu día récord</span>
                <strong>{formatLongDayKey(stats.peakDay.date)}</strong>
                <span className="secondary">
                  {pluralize(stats.peakDay.plays, 'reproducción', 'reproducciones')}
                </span>
              </li>
            ) : null}
            {stats.obsession ? (
              <li>
                <span className="muted">Tu obsesión</span>
                <strong>{stats.obsession.name}</strong>
                <span className="secondary">
                  {stats.obsession.artist ? `${stats.obsession.artist} · ` : ''}
                  {stats.obsession.plays} veces el {formatDayKey(stats.obsession.date)}
                </span>
              </li>
            ) : null}
            {stats.monthlyTopArtist.length > 1 ? (
              <li>
                <span className="muted">Artista de cada mes</span>
                <ul className="moments__months">
                  {stats.monthlyTopArtist.map((month) => (
                    <li key={month.month}>
                      <span className="secondary">{monthKeyToLabel(month.month)}</span>
                      <strong>{month.artist}</strong>
                      <span className="muted">{formatNumber(month.plays)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ) : null}
          </ul>
        </div>

        <BarList
          title="Descubrimientos"
          subtitle="Artistas que escuchaste por primera vez en este período"
          nameHeader="Artista"
          items={stats.discoveries.map((artist) => ({
            key: artist.key,
            name: artist.name,
            secondary: `desde el ${formatDate(artist.firstPlay)}`,
            plays: artist.plays,
          }))}
          footer="Se compara contra todo tu historial, no solo contra el rango elegido."
        />
      </section>

      <section className="grid">
        <BarList
          title="Canales más reproducidos"
          subtitle={musicOnly ? 'Solo canales con reproducciones de música' : 'Todos los canales'}
          nameHeader="Canal"
          items={stats.topChannels.map((channel) => ({
            key: channel.key,
            name: channel.name,
            plays: channel.plays,
          }))}
        />
      </section>

      <p className="dashboard__note muted">
        {formatNumber(totals.excluded)} entradas descartadas por ser anuncios o búsquedas ·{' '}
        {formatNumber(totals.unavailable)} de videos borrados o privados
        {musicOnly ? ` · ${formatNumber(totals.filteredOut)} clasificadas como no-música` : ''}
      </p>
    </div>
  );
}
