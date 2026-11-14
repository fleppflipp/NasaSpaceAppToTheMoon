import { useId, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useYearStats } from '../hooks/useYearStats'
import type { Period } from '../services/period'
import { relativeChange } from '../services/stats'
import type { BiggestFire } from '../services/stats'
import { createStatsFormats, utcDate } from '../services/statsFormat'
import type { StatsFormats } from '../services/statsFormat'
import { buildStatsView } from '../services/statsView'
import StatsDays from './StatsDays'
import StatsSeasonChart from './StatsSeasonChart'
import StatsSplitBar from './StatsSplitBar'
import './StatsPanel.css'

interface StatsPanelProps {
  /** The panel is slid out. */
  open: boolean
  onToggle: () => void
  /** Every month that has fire data. */
  periods: readonly Period[]
  /** The month the numbers are for (the app delays it while the slider is dragged). */
  period: Period | null
  /** The day picked on the map, if any (not delayed, so its bar lights up at once). */
  selectedDay: number | undefined
  onSelectDay: (day: number | null) => void
  onShowFire: (fire: BiggestFire) => void
}

function ToggleIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`stats-toggle__icon${open ? ' stats-toggle__icon--open' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="stats-section">
      <h3 className="stats-section__title">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="stats-row">
      <span className="stats-row__label">{label}</span>
      <span>{children}</span>
    </p>
  )
}

/** A change as a percentage with an arrow, like "▲ 52.1 %"; nothing without a base to compare with. */
function Change({
  value,
  formats,
}: {
  value: number | null
  formats: StatsFormats
}) {
  if (value === null) {
    return null
  }
  return (
    <span className={`stats-change${value < 0 ? ' stats-change--down' : ''}`}>
      <span aria-hidden="true">{value < 0 ? '▼' : value > 0 ? '▲' : ''} </span>
      {formats.share.format(Math.abs(value))}
    </span>
  )
}

/**
 * The statistics of the shown month, in a panel that slides out from the right
 * edge. The tab on its left edge opens and closes it; the map stays where it is.
 */
export default function StatsPanel({
  open,
  onToggle,
  periods,
  period,
  selectedDay,
  onSelectDay,
  onShowFire,
}: StatsPanelProps) {
  const { t, i18n } = useTranslation()
  const panelId = useId()
  const formats = useMemo(
    () => createStatsFormats(i18n.language),
    [i18n.language],
  )
  const years = useMemo(
    () => [...new Set(periods.map((p) => p.year))],
    [periods],
  )
  const { stats, status } = useYearStats(years)
  const view = useMemo(
    () => (period === null ? null : buildStatsView(stats, years, period)),
    [stats, years, period],
  )
  const current = view?.current
  const monthName = (p: Period) =>
    formats.monthName.format(utcDate(p.year, p.month))
  const periodLabel = (p: Period) =>
    new Intl.DateTimeFormat(i18n.language, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(utcDate(p.year, p.month))

  let body: ReactNode
  if (period === null || status === 'error') {
    body = <p className="stats-note">{t('stats.unavailable')}</p>
  } else if (status === 'loading') {
    body = <p className="stats-note">{t('stats.loading')}</p>
  } else if (view === null || current === undefined) {
    body = <p className="stats-note">{t('stats.unavailable')}</p>
  } else {
    const { previous, lastYear, earlier } = view
    const earlierAverage =
      earlier.length === 0
        ? undefined
        : earlier.reduce((sum, e) => sum + e.stats.fires, 0) / earlier.length
    const firstEarlier = earlier[0]
    const lastEarlier = earlier[earlier.length - 1]
    const peak = current.days.indexOf(Math.max(...current.days)) + 1
    const quiet = current.days.indexOf(Math.min(...current.days)) + 1
    const date = (day: number) =>
      formats.shortDate.format(utcDate(period.year, period.month, day))
    const biggest = current.biggest
    const [low = 0, mid = 0, high = 0, extreme = 0] = current.strength
    const [modis = 0, both = 0, viirs = 0] = current.sensors
    body = (
      <>
        <div className="stats-tiles">
          <div className="stats-tile">
            <p className="stats-tile__label">{t('stats.firesDetected')}</p>
            <p className="stats-tile__value">
              {formats.int.format(current.fires)}
            </p>
            <p className="stats-tile__change">
              <Change
                value={relativeChange(current.fires, previous?.stats.fires)}
                formats={formats}
              />{' '}
              {previous === undefined
                ? null
                : t('stats.vsMonth', { month: monthName(previous.period) })}
            </p>
          </div>
          <div className="stats-tile">
            <p className="stats-tile__label">{t('stats.totalPower')}</p>
            <p className="stats-tile__value">
              {t('stats.megawatts', {
                value: formats.compact.format(current.frp),
              })}
            </p>
            <p className="stats-tile__change">
              <Change
                value={relativeChange(current.frp, previous?.stats.frp)}
                formats={formats}
              />{' '}
              {previous === undefined
                ? null
                : t('stats.vsMonth', { month: monthName(previous.period) })}
            </p>
          </div>
        </div>
        {lastYear === undefined ? null : (
          <Row
            label={t('stats.vsLastYear', {
              period: periodLabel(lastYear.period),
              fires: formats.int.format(lastYear.stats.fires),
            })}
          >
            <Change
              value={relativeChange(current.fires, lastYear.stats.fires)}
              formats={formats}
            />
          </Row>
        )}
        {firstEarlier === undefined || lastEarlier === undefined ? null : (
          <Row
            label={t('stats.vsAverage', {
              month: monthName(period),
              years:
                firstEarlier.period.year === lastEarlier.period.year
                  ? String(firstEarlier.period.year)
                  : `${String(firstEarlier.period.year)}–${String(lastEarlier.period.year)}`,
            })}
          >
            <Change
              value={relativeChange(current.fires, earlierAverage)}
              formats={formats}
            />
          </Row>
        )}

        <Section title={t('stats.seasonTitle')}>
          <StatsSeasonChart
            year={period.year}
            month={period.month}
            values={view.yearSeries}
            average={view.averageSeries}
            formats={formats}
          />
          <ul className="stats-legend">
            <li>
              <i className="stats-legend__line stats-legend__line--year" />
              {period.year}
            </li>
            <li>
              <i className="stats-legend__line stats-legend__line--average" />
              {t('stats.seasonAverage')}
            </li>
          </ul>
        </Section>

        <Section title={t('stats.daysTitle')}>
          <StatsDays
            year={period.year}
            month={period.month}
            days={current.days}
            selectedDay={selectedDay}
            onSelect={onSelectDay}
            formats={formats}
          />
          <Row label={t('stats.peakDay')}>
            {t('stats.dayValue', {
              date: date(peak),
              fires: formats.int.format(current.days[peak - 1] ?? 0),
            })}
          </Row>
          <Row label={t('stats.quietestDay')}>
            {t('stats.dayValue', {
              date: date(quiet),
              fires: formats.int.format(current.days[quiet - 1] ?? 0),
            })}
          </Row>
          <p className="stats-note">{t('stats.dayHint')}</p>
          {selectedDay === undefined ? null : (
            <button
              type="button"
              className="stats-action"
              onClick={() => {
                onSelectDay(null)
              }}
            >
              {t('stats.showMonth')}
            </button>
          )}
        </Section>

        {biggest === null ? null : (
          <Section title={t('stats.biggestTitle')}>
            <Row label={t('stats.where')}>
              {biggest.place ??
                t('stats.coordinates', {
                  lat: formats.degrees.format(biggest.lat),
                  lng: formats.degrees.format(biggest.lng),
                })}
            </Row>
            <Row label={t('stats.when')}>{date(biggest.day)}</Row>
            <Row label={t('stats.power')}>
              {t('stats.megawatts', { value: formats.int.format(biggest.frp) })}
            </Row>
            <Row label={t('stats.radius')}>
              {formats.kilometres.format(biggest.radiusKm)}
            </Row>
            <button
              type="button"
              className="stats-action"
              onClick={() => {
                onShowFire(biggest)
              }}
            >
              {t('stats.showOnMap')}
            </button>
          </Section>
        )}

        <Section title={t('stats.strengthTitle')}>
          <StatsSplitBar
            formats={formats}
            parts={[
              {
                label: t('stats.strengthLow'),
                count: low,
                color: 'var(--color-fire-low)',
              },
              {
                label: t('stats.strengthMid'),
                count: mid,
                color: 'var(--color-fire-mid)',
              },
              {
                label: t('stats.strengthHigh'),
                count: high,
                color: 'var(--color-fire-high)',
              },
              {
                label: t('stats.strengthExtreme'),
                count: extreme,
                color: 'var(--color-fire-extreme)',
              },
            ]}
          />
        </Section>

        <Section title={t('stats.sensorsTitle')}>
          <StatsSplitBar
            formats={formats}
            parts={[
              {
                label: t('stats.sensorModis'),
                count: modis,
                color: 'var(--color-sand)',
              },
              {
                label: t('stats.sensorBoth'),
                count: both,
                color: 'var(--color-olive)',
              },
              {
                label: t('stats.sensorViirs'),
                count: viirs,
                color: 'var(--color-forest)',
              },
            ]}
          />
          <p className="stats-note">{t('stats.sensorsNote')}</p>
        </Section>
      </>
    )
  }

  return (
    <div className={`stats-dock${open ? ' stats-dock--open' : ''}`}>
      <button
        type="button"
        className="stats-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t('stats.close') : t('stats.open')}
        title={open ? t('stats.close') : t('stats.open')}
        onClick={onToggle}
      >
        <ToggleIcon open={open} />
      </button>
      <aside
        id={panelId}
        className="stats-panel"
        aria-label={t('stats.title')}
        inert={!open}
      >
        <h2 className="stats-panel__title">{t('stats.title')}</h2>
        {period === null ? null : (
          <p className="stats-panel__month">{periodLabel(period)}</p>
        )}
        {body}
      </aside>
    </div>
  )
}
