import { DEFAULT_MONTH } from '../constants/period.constants'

/** The period of time the app shows: one month (1 to 12) of one year. */
export interface Period {
  year: number
  month: number
  /** Day of the month (1 to 31); omitted when the whole month is shown. */
  day?: number
}

const MS_PER_DAY = 86_400_000

export function isSamePeriod(a: Period, b: Period): boolean {
  return a.year === b.year && a.month === b.month
}

/** Sort order of periods: earlier first. */
export function comparePeriods(a: Period, b: Period): number {
  return a.year - b.year || a.month - b.month
}

/**
 * The period shown at start: in the latest year that has data, the month
 * closest to the default one. Null when there is no data at all.
 */
export function defaultPeriod(periods: readonly Period[]): Period | null {
  const latestYear = Math.max(...periods.map((period) => period.year))
  const inLatestYear = periods.filter((period) => period.year === latestYear)
  return (
    inLatestYear.toSorted(
      (a, b) =>
        Math.abs(a.month - DEFAULT_MONTH) - Math.abs(b.month - DEFAULT_MONTH),
    )[0] ?? null
  )
}

/**
 * A month written in the given language, like "July 2016", or a full date
 * like "July 14, 2016" when a day is chosen. The date is UTC.
 */
export function formatPeriod(
  { year, month, day }: Period,
  language: string,
): string {
  return new Intl.DateTimeFormat(language, {
    ...(day === undefined ? {} : { day: 'numeric' }),
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day ?? 1)))
}

/** The date encoding used by the fire point tiles: days since 2000-01-01. */
export function fireDay({ year, month, day }: Period): number | null {
  return day === undefined
    ? null
    : (Date.UTC(year, month - 1, day) - Date.UTC(2000, 0, 1)) / MS_PER_DAY
}

/** Inclusive UTC date range for the selected month or day. */
export function periodDateRange({ year, month, day }: Period): {
  startDate: string
  endDate: string
} {
  const start = new Date(Date.UTC(year, month - 1, day ?? 1))
  const end = new Date(Date.UTC(year, month - 1, day ?? 1))
  if (day === undefined) end.setUTCMonth(end.getUTCMonth() + 1, 0)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export function formatDate(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(isoDate + 'T00:00:00Z'))
}
