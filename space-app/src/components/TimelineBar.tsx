import { useTranslation } from 'react-i18next'
import type { PeriodsStatus } from '../hooks/useFirePeriods'
import { formatPeriod, isSamePeriod } from '../services/period'
import type { Period } from '../services/period'
import './TimelineBar.css'

/** How many years are labeled under the slider: every year, or only some when there are many. */
function yearLabelStep(yearCount: number): number {
  if (yearCount <= 8) {
    return 1
  }
  return yearCount <= 16 ? 2 : 5
}

interface TimelineBarProps {
  /** Every month that has fire data, earliest first. */
  periods: readonly Period[]
  /** The month shown, one of `periods` (null when there are none). */
  period: Period | null
  status: PeriodsStatus
  onChange: (period: Period) => void
}

/**
 * Time period picker under the header: one slider over all months that have
 * fire data. The map always shows exactly one month.
 */
export default function TimelineBar({
  periods,
  period,
  status,
  onChange,
}: TimelineBarProps) {
  const { t, i18n } = useTranslation()
  const index =
    period === null ? 0 : periods.findIndex((p) => isSamePeriod(p, period))
  const last = Math.max(periods.length - 1, 1)
  const summary =
    period !== null
      ? formatPeriod(period, i18n.language)
      : status === 'loading'
        ? t('timeline.loading')
        : status === 'error'
          ? t('fires.unavailable')
          : t('timeline.empty')

  // A mark at the first month of every year.
  const yearStarts = periods.flatMap((p, i) =>
    i === 0 || periods[i - 1]?.year !== p.year
      ? [{ year: p.year, position: (i / last) * 100 }]
      : [],
  )
  const step = yearLabelStep(yearStarts.length)

  return (
    <div className="timeline" role="group" aria-label={t('timeline.label')}>
      <p className="timeline__summary" role="status">
        {summary}
      </p>
      <div className="timeline__slider">
        <div className="timeline__track" aria-hidden="true">
          {yearStarts.map((mark) => (
            <span
              key={mark.year}
              className="timeline__tick"
              style={{ insetInlineStart: `${String(mark.position)}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          className="timeline__range"
          min={0}
          max={last}
          step={1}
          value={Math.max(index, 0)}
          disabled={periods.length < 2}
          aria-label={t('timeline.month')}
          aria-valuetext={summary}
          onChange={(event) => {
            const picked = periods[Number(event.target.value)]
            if (picked !== undefined) {
              onChange(picked)
            }
          }}
        />
      </div>
      <div className="timeline__years" aria-hidden="true">
        {yearStarts.map((mark, i) =>
          i === 0 || mark.year % step === 0 ? (
            <span
              key={mark.year}
              className="timeline__year-label"
              style={{ insetInlineStart: `${String(mark.position)}%` }}
            >
              {mark.year}
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}
