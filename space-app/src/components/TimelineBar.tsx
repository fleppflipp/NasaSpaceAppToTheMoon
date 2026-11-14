import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DATA_END_DATE,
  DATA_START_DATE,
  FIRST_MONTH_INDEX,
  LAST_MONTH_INDEX,
  TICK_EVERY_YEARS,
} from '../constants/period.constants'
import {
  formatDate,
  formatMonth,
  isValidDataDate,
  monthIndexOfDate,
} from '../services/period'
import type { Period } from '../services/period'
import './TimelineBar.css'

const MONTHS_SPAN = LAST_MONTH_INDEX - FIRST_MONTH_INDEX

function percent(monthIndex: number): number {
  return ((monthIndex - FIRST_MONTH_INDEX) / MONTHS_SPAN) * 100
}

function clampMonth(monthIndex: number): number {
  return Math.min(LAST_MONTH_INDEX, Math.max(FIRST_MONTH_INDEX, monthIndex))
}

// A mark at every January inside the slider range (every 5th year is taller).
const YEAR_TICKS = Array.from(
  { length: Math.floor(LAST_MONTH_INDEX / 12) + 1 },
  (_, offset) => 2000 + offset,
)
  .filter((year) => year % TICK_EVERY_YEARS === 0)
  .map((year) => ({ year, position: percent((year - 2000) * 12) }))
  .filter((tick) => tick.position > 0 && tick.position < 100)

function CalendarIcon() {
  return (
    <svg
      className="timeline__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

interface TimelineBarProps {
  period: Period
  onChange: (period: Period) => void
}

/**
 * Time period picker under the header: a two-handle slider over every month of
 * the data, and a popover for an exact range of days. Moving the slider clears
 * the exact days.
 */
export default function TimelineBar({ period, onChange }: TimelineBarProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const panelId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(
    period.kind === 'days' ? period.startDate : '',
  )
  const [to, setTo] = useState(period.kind === 'days' ? period.endDate : '')

  // The handles show the months of the exact days while those are active.
  const startMonth = clampMonth(
    period.kind === 'months'
      ? period.startMonth
      : monthIndexOfDate(period.startDate),
  )
  const endMonth = clampMonth(
    period.kind === 'months'
      ? period.endMonth
      : monthIndexOfDate(period.endDate),
  )
  const usingDays = period.kind === 'days'

  // Close the popover when clicking elsewhere.
  useEffect(() => {
    if (!open) {
      return
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        wrapperRef.current?.contains(event.target) !== true
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  const moveSlider = (start: number, end: number) => {
    setFrom('')
    setTo('')
    onChange({ kind: 'months', startMonth: start, endMonth: end })
  }

  const changeDates = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom)
    setTo(nextTo)
    if (
      isValidDataDate(nextFrom) &&
      isValidDataDate(nextTo) &&
      nextFrom <= nextTo
    ) {
      onChange({ kind: 'days', startDate: nextFrom, endDate: nextTo })
    }
  }

  const clearDates = () => {
    moveSlider(startMonth, endMonth)
  }

  let problem: 'outOfRange' | 'invalidRange' | null = null
  if (from !== '' && to !== '') {
    if (!isValidDataDate(from) || !isValidDataDate(to)) {
      problem = 'outOfRange'
    } else if (from > to) {
      problem = 'invalidRange'
    }
  }

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  const summary = usingDays
    ? t('timeline.range', {
        start: formatDate(period.startDate, language),
        end: formatDate(period.endDate, language),
      })
    : t('timeline.range', {
        start: formatMonth(startMonth, language),
        end: formatMonth(endMonth, language),
      })

  const sliderStyle = {
    '--timeline-start': `${String(percent(startMonth))}%`,
    '--timeline-end': `${String(percent(endMonth))}%`,
  } as CSSProperties
  // When both handles sit at the far end, the start handle must stay reachable.
  const startOnTop = startMonth > (FIRST_MONTH_INDEX + LAST_MONTH_INDEX) / 2

  return (
    <div
      className="timeline"
      data-mode={usingDays ? 'days' : 'months'}
      role="group"
      aria-label={t('timeline.label')}
    >
      <div className="timeline__top">
        <p className="timeline__summary" role="status">
          {summary}
        </p>
        <div className="timeline__dates" ref={wrapperRef}>
          <button
            ref={buttonRef}
            type="button"
            className="timeline__dates-button"
            data-active={usingDays}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              setOpen((value) => !value)
            }}
          >
            <CalendarIcon />
            {t('timeline.exactDates')}
          </button>
          <div
            id={panelId}
            className="timeline__panel"
            role="group"
            aria-label={t('timeline.exactDates')}
            hidden={!open}
            onKeyDown={handlePanelKeyDown}
          >
            <label className="timeline__field">
              <span>{t('timeline.from')}</span>
              <input
                type="date"
                className="form-control"
                min={DATA_START_DATE}
                max={DATA_END_DATE}
                value={from}
                onChange={(event) => {
                  changeDates(event.target.value, to)
                }}
              />
            </label>
            <label className="timeline__field">
              <span>{t('timeline.to')}</span>
              <input
                type="date"
                className="form-control"
                min={DATA_START_DATE}
                max={DATA_END_DATE}
                value={to}
                onChange={(event) => {
                  changeDates(from, event.target.value)
                }}
              />
            </label>
            <p className="timeline__problem" role="status">
              {problem === 'invalidRange' ? t('timeline.invalidRange') : null}
              {problem === 'outOfRange'
                ? t('timeline.outOfRange', {
                    min: formatDate(DATA_START_DATE, language),
                    max: formatDate(DATA_END_DATE, language),
                  })
                : null}
            </p>
            <button
              type="button"
              className="timeline__clear"
              disabled={!usingDays && from === '' && to === ''}
              onClick={clearDates}
            >
              {t('timeline.clearDates')}
            </button>
          </div>
        </div>
      </div>
      <div className="timeline__slider" style={sliderStyle}>
        <div className="timeline__track" aria-hidden="true">
          <div className="timeline__fill" />
          {YEAR_TICKS.map((tick) => (
            <span
              key={tick.year}
              className="timeline__tick"
              data-major={tick.year % 5 === 0}
              style={{ insetInlineStart: `${String(tick.position)}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          className="timeline__range"
          style={{ zIndex: startOnTop ? 3 : 1 }}
          min={FIRST_MONTH_INDEX}
          max={LAST_MONTH_INDEX}
          step={1}
          value={startMonth}
          aria-label={t('timeline.startMonth')}
          aria-valuetext={formatMonth(startMonth, language, 'long')}
          onChange={(event) => {
            moveSlider(Math.min(Number(event.target.value), endMonth), endMonth)
          }}
        />
        <input
          type="range"
          className="timeline__range"
          style={{ zIndex: 2 }}
          min={FIRST_MONTH_INDEX}
          max={LAST_MONTH_INDEX}
          step={1}
          value={endMonth}
          aria-label={t('timeline.endMonth')}
          aria-valuetext={formatMonth(endMonth, language, 'long')}
          onChange={(event) => {
            moveSlider(
              startMonth,
              Math.max(Number(event.target.value), startMonth),
            )
          }}
        />
      </div>
    </div>
  )
}
