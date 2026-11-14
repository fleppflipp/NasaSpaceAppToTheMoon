import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { FIRE_TILE_YEARS } from '../constants/fires.constants'
import { ROUTES } from '../constants/routes.constants'
import { formatDate, periodDateRange, periodForDate } from '../services/period'
import type { Period } from '../services/period'
import './CalendarView.css'

interface CalendarViewProps {
  period: Period
  onChange: (period: Period) => void
}

export default function CalendarView({ period, onChange }: CalendarViewProps) {
  const { t, i18n } = useTranslation()
  const { startDate, endDate } = periodDateRange(period)
  const selectedMonth = new Date(`${startDate}T00:00:00Z`).getUTCMonth()
  const [view, setView] = useState({ period, month: selectedMonth })
  if (view.period !== period) {
    setView({ period, month: selectedMonth })
  }
  const month = view.period === period ? view.month : selectedMonth
  const monthDate = new Date(Date.UTC(period.year, month, 1))
  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthDate)
  const weekdayFormat = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const numberFormat = new Intl.NumberFormat(i18n.language)
  const firstWeekday = (monthDate.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(period.year, month + 1, 0)).getUTCDate()
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7

  function moveMonth(offset: number) {
    const next = new Date(Date.UTC(period.year, month + offset, 1))
    if (next.getUTCFullYear() === period.year) {
      setView({ period, month: next.getUTCMonth() })
    } else {
      onChange(periodForDate(next))
    }
  }

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
          disabled={month === 0 && !FIRE_TILE_YEARS.includes(period.year - 1)}
          onClick={() => {
            moveMonth(-1)
          }}
        >
          ‹
        </button>
        <strong aria-live="polite">{monthLabel}</strong>
        <button
          type="button"
          aria-label={t('calendar.nextMonth')}
          disabled={month === 11 && !FIRE_TILE_YEARS.includes(period.year + 1)}
          onClick={() => {
            moveMonth(1)
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
          const day = index - firstWeekday + 1
          if (day < 1 || day > daysInMonth) return <span key={index} />
          const date = new Date(Date.UTC(period.year, month, day))
          const iso = date.toISOString().slice(0, 10)
          const selected = period.day !== undefined && iso === startDate
          const inWeek =
            period.day === undefined && iso >= startDate && iso <= endDate
          return (
            <button
              key={index}
              type="button"
              className={`calendar-view__day${inWeek ? ' calendar-view__day--week' : ''}`}
              aria-label={formatDate(iso, i18n.language)}
              aria-pressed={selected}
              onClick={() => {
                onChange(periodForDate(date))
              }}
            >
              {numberFormat.format(day)}
            </button>
          )
        })}
      </div>
      <p className="calendar-view__selection" role="status">
        {period.day === undefined
          ? t('timeline.range', {
              start: formatDate(startDate, i18n.language),
              end: formatDate(endDate, i18n.language),
            })
          : formatDate(startDate, i18n.language)}
      </p>
      {period.day === undefined ? null : (
        <>
          <button
            type="button"
            onClick={() => {
              onChange({ year: period.year, week: period.week })
            }}
          >
            {t('calendar.showWeek')}
          </button>
          <p className="calendar-view__hint">{t('calendar.dailyHint')}</p>
        </>
      )}
    </aside>
  )
}
