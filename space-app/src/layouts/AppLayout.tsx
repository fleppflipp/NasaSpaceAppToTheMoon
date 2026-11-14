import { useEffect, useMemo, useState } from 'react'
import type { Polygon } from 'geojson'
import { Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import TimelineBar from '../components/TimelineBar'
import BaseMap from '../components/BaseMap'
import StatsPanel from '../components/StatsPanel'
import { APP_NAME } from '../constants/app.constants'
import { FIRE_PERIOD_DEBOUNCE_MS } from '../constants/fires.constants'
import { ROUTES } from '../constants/routes.constants'
import type { Place } from '../services/places'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useFirePeriods } from '../hooks/useFirePeriods'
import { defaultPeriod, isSamePeriod } from '../services/period'
import type { Period } from '../services/period'
import type { BiggestFire, FireHighlight } from '../services/stats'
import { createStatsFormats, utcDate } from '../services/statsFormat'

const KM_PER_DEGREE = 111.195
/** "Show on map" frames a fire with this many radii around it, but never closer than this. */
const FIRE_VIEW_RADII = 2
const MIN_FIRE_VIEW_KM = 5

/** The map view that shows a fire and its surroundings. */
function fireView(fire: BiggestFire): Place {
  const halfHeight =
    (Math.max(fire.radiusKm, MIN_FIRE_VIEW_KM) * FIRE_VIEW_RADII) /
    KM_PER_DEGREE
  const halfWidth =
    halfHeight / Math.max(Math.cos((fire.lat * Math.PI) / 180), 0.1)
  return {
    label: fire.place ?? '',
    lng: fire.lng,
    lat: fire.lat,
    bounds: [
      fire.lng - halfWidth,
      fire.lat - halfHeight,
      fire.lng + halfWidth,
      fire.lat + halfHeight,
    ],
  }
}

export default function AppLayout() {
  const [target, setTarget] = useState<Place | null>(null)
  // The area of interest drawn on the map; future features read it from here.
  const [selection, setSelection] = useState<Polygon | null>(null)
  // The month to show, with an optional day picked in the statistics. It is
  // always one of the months that have data, the default until one is picked.
  const { periods, status } = useFirePeriods()
  const [chosen, setChosen] = useState<Period | null>(null)
  const period =
    chosen !== null && periods.some((p) => isSamePeriod(p, chosen))
      ? chosen
      : defaultPeriod(periods)
  // The statistics follow the slider with the same delay as the map's tiles.
  const statsPeriod = useDebouncedValue(period, FIRE_PERIOD_DEBOUNCE_MS)
  const [statsOpen, setStatsOpen] = useState(false)
  // The fire that "Show on map" points out; it goes away with a month change.
  const [highlight, setHighlight] = useState<FireHighlight | null>(null)
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const isMap = pathname === ROUTES.map
  useEffect(() => {
    // The browser tab always says just the name of the app.
    document.title = APP_NAME
    document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language
  }, [i18n, i18n.resolvedLanguage, i18n.language])

  const marked =
    highlight !== null &&
    period !== null &&
    isSamePeriod(period, { year: highlight.year, month: highlight.month })
      ? highlight
      : null
  const markerLabel = useMemo(() => {
    if (marked === null) {
      return null
    }
    const formats = createStatsFormats(i18n.language)
    return t('stats.markerText', {
      power: t('stats.megawatts', {
        value: formats.int.format(marked.fire.frp),
      }),
      date: formats.shortDate.format(
        utcDate(marked.year, marked.month, marked.fire.day),
      ),
    })
  }, [marked, t, i18n.language])

  const selectDay = (day: number | null) => {
    if (period === null) {
      return
    }
    const { year, month } = period
    setChosen(day === null ? { year, month } : { year, month, day })
  }

  return (
    <>
      <Header
        showSearch={isMap}
        onPlaceSelect={(place) => {
          setHighlight(null)
          setTarget(place)
        }}
      />
      <TimelineBar
        periods={periods}
        period={period}
        status={status}
        onChange={setChosen}
      />
      <BaseMap
        active={isMap}
        statsOpen={isMap && statsOpen}
        target={target}
        fireMarker={
          marked === null || markerLabel === null
            ? null
            : {
                lng: marked.fire.lng,
                lat: marked.fire.lat,
                label: markerLabel,
                ariaLabel: t('stats.markerHide', { label: markerLabel }),
              }
        }
        onFireMarkerDismiss={() => {
          setHighlight(null)
        }}
        selection={selection}
        onSelectionChange={setSelection}
        period={period}
        periodsStatus={status}
      />
      {isMap ? (
        <StatsPanel
          open={statsOpen}
          onToggle={() => {
            setStatsOpen((open) => !open)
          }}
          periods={periods}
          period={statsPeriod}
          selectedDay={period?.day}
          onSelectDay={selectDay}
          onShowFire={(fire) => {
            if (period !== null) {
              setHighlight({ fire, year: period.year, month: period.month })
            }
            setTarget(fireView(fire))
          }}
        />
      ) : null}
      <Outlet />
    </>
  )
}
