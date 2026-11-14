import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import BaseMap from '../components/BaseMap'
import { APP_NAME } from '../constants/app.constants'
import { ROUTES } from '../constants/routes.constants'
import type { Place } from '../services/places'
export default function AppLayout() {
  const [target, setTarget] = useState<Place | null>(null)
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const isMap = pathname === ROUTES.map
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
      <Header isMap={isMap} onPlaceSelect={setTarget} />
      <BaseMap active={isMap} target={target} />
      <Outlet />
    </>
  )
}
