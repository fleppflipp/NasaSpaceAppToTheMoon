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
export function periodDateRange({ year, week }: Period): {
  startDate: string
  endDate: string
} {
  const start = Date.UTC(year, 0, 1 + 7 * week)
  const end = Math.min(start + 6 * MS_PER_DAY, Date.UTC(year, 11, 31))
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) }
}

/** An ISO date written in the given language. */
export function formatDate(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}
