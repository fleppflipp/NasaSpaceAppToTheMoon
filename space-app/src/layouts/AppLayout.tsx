import { useEffect, useState } from 'react'
import type { Polygon } from 'geojson'
import { Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import TimelineBar from '../components/TimelineBar'
import BaseMap from '../components/BaseMap'
import CalendarView from '../components/CalendarView'
import { APP_NAME } from '../constants/app.constants'
import { ROUTES } from '../constants/routes.constants'
import type { Place } from '../services/places'
import { useFirePeriods } from '../hooks/useFirePeriods'
import { defaultPeriod, isSamePeriod } from '../services/period'
import type { Period } from '../services/period'

export default function AppLayout() {
  const [target, setTarget] = useState<Place | null>(null)
  // The area of interest drawn on the map; future features read it from here.
  const [selection, setSelection] = useState<Polygon | null>(null)
  // The month to show; future features (map layers, calendar) read it. It is
  // always one of the months that have data, the default until one is picked.
  const { periods, status } = useFirePeriods()
  const [chosen, setChosen] = useState<Period | null>(null)
  const period =
    chosen !== null && periods.some((p) => isSamePeriod(p, chosen))
      ? chosen
      : defaultPeriod(periods)
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const isMap = pathname === ROUTES.map
  const isCalendar = pathname === ROUTES.calendar
  const title = isMap
    ? t('pageTitles.map')
    : pathname === ROUTES.calendar
      ? t('pageTitles.calendar')
      : t('pageTitles.notFound')
  useEffect(() => {
    document.title = title + ' | ' + APP_NAME
    document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language
  }, [title, i18n, i18n.resolvedLanguage, i18n.language])
  return (
    <>
      <Header isMap={isMap || isCalendar} onPlaceSelect={setTarget} />
      <TimelineBar
        periods={periods}
        period={period}
        status={status}
        onChange={setChosen}
      />
      <BaseMap
        active={isMap || isCalendar}
        calendarOpen={isCalendar}
        target={target}
        selection={selection}
        onSelectionChange={setSelection}
        period={period}
        periodsStatus={status}
      />
      {isCalendar && period !== null ? (
        <CalendarView periods={periods} period={period} onChange={setChosen} />
      ) : null}
      <Outlet />
    </>
  )
}
