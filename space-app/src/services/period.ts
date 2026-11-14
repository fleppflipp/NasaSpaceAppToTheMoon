import { FIRE_TILE_YEARS } from '../constants/fires.constants'
import { DEFAULT_WEEK } from '../constants/period.constants'

/**
 * The period of time the app shows: one week of one year. Week `week` (0 to
 * 52) starts on January 1st plus 7 x `week` days and lasts 7 days; the last
 * week of the year is shorter. All dates are UTC, independent of the language.
 */
export interface Period {
  year: number
  week: number
  /** Zero-based day of the year; omitted when showing the whole week. */
  day?: number
}

export const DEFAULT_PERIOD: Period = {
  // The latest year that has fire tiles.
  year: FIRE_TILE_YEARS.at(-1) ?? 2012,
  week: DEFAULT_WEEK,
}

const MS_PER_DAY = 86_400_000

function toIsoDate(milliseconds: number): string {
  return new Date(milliseconds).toISOString().slice(0, 10)
}

/** The first and last day (ISO, both included) of a period. */
export function periodDateRange({ year, week, day }: Period): {
  startDate: string
  endDate: string
} {
  const start = Date.UTC(year, 0, 1 + (day ?? 7 * week))
  const end =
    day === undefined
      ? Math.min(start + 6 * MS_PER_DAY, Date.UTC(year, 11, 31))
      : start
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) }
}

/** Select a UTC calendar date and its containing weekly tile file. */
export function periodForDate(date: Date): Period {
  const year = date.getUTCFullYear()
  const day = Math.floor((date.getTime() - Date.UTC(year, 0, 1)) / MS_PER_DAY)
  return { year, week: Math.floor(day / 7), day }
}

/** The date encoding used by the fire point tiles. */
export function fireDay(period: Period): number | null {
  return period.day === undefined
    ? null
    : (Date.UTC(period.year, 0, 1 + period.day) - Date.UTC(2000, 0, 1)) /
        MS_PER_DAY
}

/** An ISO date written in the given language. */
export function formatDate(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}
