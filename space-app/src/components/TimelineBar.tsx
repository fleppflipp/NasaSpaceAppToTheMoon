import { useTranslation } from 'react-i18next'
import { FIRE_TILE_YEARS } from '../constants/fires.constants'
import { LAST_WEEK } from '../constants/period.constants'
import { formatDate, periodDateRange } from '../services/period'
import type { Period } from '../services/period'
import './TimelineBar.css'

// A mark where each month starts (week = day of the year / 7, in a common year).
const MONTH_START_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
const MONTH_TICKS = MONTH_START_DAYS.map((day) => ({
  month: day,
  position: (Math.floor(day / 7) / LAST_WEEK) * 100,
}))

interface TimelineBarProps {
  period: Period
  onChange: (period: Period) => void
}

/**
 * Time period picker under the header: a year, and one slider over the weeks
 * of that year. The map always shows exactly one week.
 */
export default function TimelineBar({ period, onChange }: TimelineBarProps) {
  const { t, i18n } = useTranslation()
  const { startDate, endDate } = periodDateRange(period)
  const summary = t('timeline.range', {
    start: formatDate(startDate, i18n.language),
    end: formatDate(endDate, i18n.language),
  })

  return (
    <div className="timeline" role="group" aria-label={t('timeline.label')}>
      <div className="timeline__top">
        <p className="timeline__summary" role="status">
          {summary}
        </p>
        <select
          className="form-control timeline__year"
          aria-label={t('timeline.year')}
          value={period.year}
          onChange={(event) => {
            onChange({ year: Number(event.target.value), week: period.week })
          }}
        >
          {FIRE_TILE_YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <div className="timeline__slider">
        <div className="timeline__track" aria-hidden="true">
          {MONTH_TICKS.map((tick) => (
            <span
              key={tick.month}
              className="timeline__tick"
              style={{ insetInlineStart: `${String(tick.position)}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          className="timeline__range"
          min={0}
          max={LAST_WEEK}
          step={1}
          value={period.week}
          aria-label={t('timeline.week')}
          aria-valuetext={summary}
          onChange={(event) => {
            onChange({ year: period.year, week: Number(event.target.value) })
          }}
        />
      </div>
    </div>
  )
}
