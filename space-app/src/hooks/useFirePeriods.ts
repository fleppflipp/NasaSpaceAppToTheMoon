import { useEffect, useState } from 'react'
import { fetchFirePeriods } from '../services/fireTiles'
import type { Period } from '../services/period'

export type PeriodsStatus = 'loading' | 'ready' | 'error'

interface FirePeriodsState {
  /** Months with observed fires (earliest first). */
  periods: readonly Period[]
  /** Forecast months after the last observed one (earliest first). */
  futurePeriods: readonly Period[]
  status: PeriodsStatus
}

/** The months that have fire tiles, and the future months that have a forecast, on the tile server. */
export function useFirePeriods(): FirePeriodsState {
  const [state, setState] = useState<FirePeriodsState>({
    periods: [],
    futurePeriods: [],
    status: 'loading',
  })

  useEffect(() => {
    const controller = new AbortController()
    fetchFirePeriods(controller.signal)
      .then(({ observed, future }) => {
        setState({ periods: observed, futurePeriods: future, status: 'ready' })
      })
      .catch(() => {
        // A failed list is shown to the user (status 'error'); an abort is not a failure.
        if (!controller.signal.aborted) {
          setState({ periods: [], futurePeriods: [], status: 'error' })
        }
      })
    return () => {
      controller.abort()
    }
  }, [])

  return state
}
