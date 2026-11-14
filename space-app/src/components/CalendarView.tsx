import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '../constants/routes.constants'
import { comparePeriods, formatPeriod } from '../services/period'
import type { Period } from '../services/period'
import './CalendarView.css'

interface CalendarViewProps {
  /** Every month that has fire data, earliest first. */
  periods: readonly Period[]
  /** The month shown, with an optional chosen day. */
  period: Period
  onChange: (period: Period) => void
}

export default function CalendarView({
  periods,
  period,
  onChange,
}: CalendarViewProps) {
  const { t, i18n } = useTranslation()
  const { year, month, day } = period
  const monthDate = new Date(Date.UTC(year, month - 1, 1))
  const monthLabel = formatPeriod({ year, month }, i18n.language)
  const weekdayFormat = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const numberFormat = new Intl.NumberFormat(i18n.language)
  const firstWeekday = (monthDate.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7
  const previous = periods.findLast((p) => comparePeriods(p, period) < 0)
  const next = periods.find((p) => comparePeriods(p, period) > 0)

  return (
    <aside className="calendar-view stack" aria-label={t('calendar.label')}>
      <div className="calendar-view__heading">
        <h2>{t('navigation.calendar')}</h2>
        <Link
          to={ROUTES.map}
          aria-label={t('calendar.close')}
          className="calendar-view__close"
        >
          ×
        </Link>
      </div>
      <p>{t('calendar.chooseDay')}</p>
      <div className="calendar-view__navigation">
        <button
          type="button"
          aria-label={t('calendar.previousMonth')}
          disabled={previous === undefined}
          onClick={() => {
            if (previous !== undefined) {
              onChange(previous)
            }
          }}
        >
          ‹
        </button>
        <strong aria-live="polite">{monthLabel}</strong>
        <button
          type="button"
          aria-label={t('calendar.nextMonth')}
          disabled={next === undefined}
          onClick={() => {
            if (next !== undefined) {
              onChange(next)
            }
          }}
        >
          ›
        </button>
      </div>
      <div className="calendar-view__grid">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} className="calendar-view__weekday">
            {weekdayFormat.format(new Date(Date.UTC(2024, 0, 1 + index)))}
          </span>
        ))}
        {Array.from({ length: cellCount }, (_, index) => {
          const dayOfMonth = index - firstWeekday + 1
          if (dayOfMonth < 1 || dayOfMonth > daysInMonth) {
            return <span key={index} />
          }
          return (
            <button
              key={index}
              type="button"
              className="calendar-view__day"
              aria-label={formatPeriod(
                { year, month, day: dayOfMonth },
                i18n.language,
              )}
              aria-pressed={day === dayOfMonth}
              onClick={() => {
                onChange({ year, month, day: dayOfMonth })
              }}
            >
              {numberFormat.format(dayOfMonth)}
            </button>
          )
        })}
      </div>
      <p className="calendar-view__selection" role="status">
        {formatPeriod(period, i18n.language)}
      </p>
      {day === undefined ? null : (
        <>
          <button
            type="button"
            onClick={() => {
              onChange({ year, month })
            }}
          >
            {t('calendar.showMonth')}
          </button>
          <p className="calendar-view__hint">{t('calendar.dailyHint')}</p>
        </>
      )}
    </aside>
  )
}
