import {
  DATA_END_DATE,
  DATA_START_DATE,
  DEFAULT_END_MONTH_INDEX,
  DEFAULT_START_MONTH_INDEX,
} from '../constants/period.constants'

/**
 * The period of time the app shows. Either whole months picked with the slider
 * (month index = months since January 2000) or an exact range of days (ISO
 * dates, both included). Dates are always UTC, independent of the language.
 */
export type Period =
  | { kind: 'months'; startMonth: number; endMonth: number }
  | { kind: 'days'; startDate: string; endDate: string }

export const DEFAULT_PERIOD: Period = {
  kind: 'months',
  startMonth: DEFAULT_START_MONTH_INDEX,
  endMonth: DEFAULT_END_MONTH_INDEX,
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Year (e.g. 2002) and month (1 to 12) of a month index. */
export function monthParts(index: number): { year: number; month: number } {
  return { year: 2000 + Math.floor(index / 12), month: (index % 12) + 1 }
}

export function monthIndexOf(year: number, month: number): number {
  return (year - 2000) * 12 + (month - 1)
}

/** Month index of an ISO date ("2002-03-17" gives the index of March 2002). */
export function monthIndexOfDate(isoDate: string): number {
  return monthIndexOf(Number(isoDate.slice(0, 4)), Number(isoDate.slice(5, 7)))
}

function lastDayOfMonth(index: number): string {
  const { year, month } = monthParts(index)
  // Day 0 of the next month is the last day of this one.
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${String(year)}-${pad(month)}-${pad(day)}`
}

/** The first and last day (ISO, inclusive) of a period. */
export function periodDateRange(period: Period): {
  startDate: string
  endDate: string
} {
  if (period.kind === 'days') {
    return { startDate: period.startDate, endDate: period.endDate }
  }
  const start = monthParts(period.startMonth)
  return {
    startDate: `${String(start.year)}-${pad(start.month)}-01`,
    endDate: lastDayOfMonth(period.endMonth),
  }
}

/** Whether a text is a real calendar date inside the range of the data. */
export function isValidDataDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false
  }
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= DATA_START_DATE &&
    value <= DATA_END_DATE
  )
}

/** "March 2002" in the given language (month names only, no time zone shift). */
export function formatMonth(
  index: number,
  language: string,
  style: 'short' | 'long' = 'short',
): string {
  const { year, month } = monthParts(index)
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: style,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

/** An ISO date written in the given language. */
export function formatDate(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}

const MS_PER_DAY = 86_400_000

/** Days since 2000-01-01 (UTC) of an ISO date: the `day` value stored in the fire tiles. */
export function dateToDay(isoDate: string): number {
  return Math.round(
    (new Date(`${isoDate}T00:00:00Z`).getTime() - Date.UTC(2000, 0, 1)) /
      MS_PER_DAY,
  )
}

/** First and last day (inclusive) of a period, as `day` values. */
export function periodDayRange(period: Period): {
  startDay: number
  endDay: number
} {
  const { startDate, endDate } = periodDateRange(period)
  return { startDay: dateToDay(startDate), endDay: dateToDay(endDate) }
}
