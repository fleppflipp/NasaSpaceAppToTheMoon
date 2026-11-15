import { useTranslation } from 'react-i18next'
import type { StatsFormats } from '../services/statsFormat'
import { utcDate } from '../services/statsFormat'

interface StatsDaysProps {
  year: number
  month: number
  /** Fires per day of the month, day 1 first. */
  days: readonly number[]
  /** The day that is shown on the map, if one is picked. */
  selectedDay: number | undefined
  /** A click on a bar picks that day; a click on the picked day goes back to the month. */
  onSelect: (day: number | null) => void
  formats: StatsFormats
}

/** Bars of the fires per day; they are buttons, so a day can be picked from the keyboard too. */
export default function StatsDays({
  year,
  month,
  days,
  selectedDay,
  onSelect,
  formats,
}: StatsDaysProps) {
  const { t } = useTranslation()
  const max = Math.max(1, ...days)
  const labelled = new Set([1, 10, 20, days.length])
  return (
    <div
      className="stats-days"
      style={{ gridTemplateColumns: `repeat(${String(days.length)}, 1fr)` }}
    >
      {days.map((count, index) => {
        const day = index + 1
        const selected = selectedDay === day
        return (
          <button
            key={day}
            type="button"
            className="stats-days__bar"
            aria-pressed={selected}
            aria-label={t('stats.dayBar', {
              date: formats.shortDate.format(utcDate(year, month, day)),
              fires: formats.int.format(count),
            })}
            title={formats.int.format(count)}
            onClick={() => {
              onSelect(selected ? null : day)
            }}
          >
            <span
              className="stats-days__fill"
              style={{ blockSize: `${String((count / max) * 100)}%` }}
            />
          </button>
        )
      })}
      {days.map((_, index) => (
        <span key={index} className="stats-days__tick" aria-hidden="true">
          {labelled.has(index + 1) ? index + 1 : ''}
        </span>
      ))}
    </div>
  )
}
