import type { Period } from './period'
import { statsKey } from './stats'
import type { MonthStats } from './stats'

const MONTHS_PER_YEAR = 12

export interface DatedStats {
  period: Period
  stats: MonthStats
}

/** What the statistics panel shows for one month, and what it is compared with. */
export interface StatsView {
  current: MonthStats | undefined
  /** The month before this one. */
  previous: DatedStats | undefined
  /** The same month one year earlier. */
  lastYear: DatedStats | undefined
  /** The same month in every earlier year that has data. */
  earlier: readonly DatedStats[]
  /** Fires per month of this year (null where the month has no data). */
  yearSeries: readonly (number | null)[]
  /** Average fires per month over all years (null where no year has the month). */
  averageSeries: readonly (number | null)[]
}

type StatsMap = ReadonlyMap<string, MonthStats>

function dated(stats: StatsMap, period: Period): DatedStats | undefined {
  const found = stats.get(statsKey(period.year, period.month))
  return found === undefined ? undefined : { period, stats: found }
}

export function buildStatsView(
  stats: StatsMap,
  years: readonly number[],
  { year, month }: Period,
): StatsView {
  const months = Array.from({ length: MONTHS_PER_YEAR }, (_, i) => i + 1)
  return {
    current: stats.get(statsKey(year, month)),
    previous: dated(
      stats,
      month === 1
        ? { year: year - 1, month: MONTHS_PER_YEAR }
        : { year, month: month - 1 },
    ),
    lastYear: dated(stats, { year: year - 1, month }),
    earlier: years
      .filter((other) => other < year)
      .flatMap((other) => dated(stats, { year: other, month }) ?? []),
    yearSeries: months.map((m) => stats.get(statsKey(year, m))?.fires ?? null),
    averageSeries: months.map((m) => {
      const counts = years.flatMap(
        (other) => stats.get(statsKey(other, m))?.fires ?? [],
      )
      return counts.length === 0
        ? null
        : counts.reduce((sum, count) => sum + count, 0) / counts.length
    }),
  }
}
