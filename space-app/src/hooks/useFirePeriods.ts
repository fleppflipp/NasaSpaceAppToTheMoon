import { useEffect, useState } from 'react'
import { fetchFirePeriods } from '../services/fireTiles'
import type { Period } from '../services/period'

export type PeriodsStatus = 'loading' | 'ready' | 'error'

/** The months that have fire tiles on the tile server (earliest first). */
export function useFirePeriods(): {
  periods: readonly Period[]
  status: PeriodsStatus
} {
  const [state, setState] = useState<{
    periods: readonly Period[]
    status: PeriodsStatus
  }>({ periods: [], status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetchFirePeriods(controller.signal)
      .then((periods) => {
        setState({ periods, status: 'ready' })
      })
      .catch(() => {
        // A failed list is shown to the user (status 'error'); an abort is not a failure.
        if (!controller.signal.aborted) {
          setState({ periods: [], status: 'error' })
        }
      })
    return () => {
      controller.abort()
    }
  }, [])

  return state
}
