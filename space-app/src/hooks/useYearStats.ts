import { useEffect, useState } from 'react'
import { fetchYearStats, statsKey } from '../services/stats'
import type { MonthStats } from '../services/stats'

export type StatsStatus = 'loading' | 'ready' | 'error'

interface Loaded {
  /** The years this result is for, joined with commas. */
  key: string
  stats: ReadonlyMap<string, MonthStats>
}

const NO_STATS: ReadonlyMap<string, MonthStats> = new Map()

/**
 * The statistics of every month of the given years, keyed with `statsKey`.
 * A year the tile server has no file for is skipped; with none at all the
 * status is 'error'.
 */
export function useYearStats(years: readonly number[]): {
  stats: ReadonlyMap<string, MonthStats>
  status: StatsStatus
} {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const yearsKey = years.join(',')

  useEffect(() => {
    if (yearsKey === '') {
      return
    }
    const controller = new AbortController()
    const wanted = yearsKey.split(',').map(Number)
    void Promise.all(
      wanted.map((year) =>
        fetchYearStats(year, controller.signal).then(
          (months) => ({ year, months }),
          () => null,
        ),
      ),
    ).then((results) => {
      if (controller.signal.aborted) {
        return
      }
      const stats = new Map<string, MonthStats>()
      for (const result of results) {
        for (const [month, value] of result?.months ?? []) {
          stats.set(statsKey(result?.year ?? 0, month), value)
        }
      }
      setLoaded({ key: yearsKey, stats })
    })
    return () => {
      controller.abort()
    }
  }, [yearsKey])

  if (loaded?.key !== yearsKey) {
    return { stats: NO_STATS, status: 'loading' }
  }
  return {
    stats: loaded.stats,
    status: loaded.stats.size === 0 ? 'error' : 'ready',
  }
}
