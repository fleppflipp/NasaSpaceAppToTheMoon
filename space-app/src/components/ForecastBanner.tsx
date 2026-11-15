import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPeriod } from '../services/period'
import type { Period } from '../services/period'
import './ForecastBanner.css'

/**
 * Warning on the map while a future (forecast) month is shown. Once closed it
 * stays closed while the user moves between future months; it comes back the
 * next time a future month is picked after an observed one (the map mounts it
 * only for future months).
 */
export default function ForecastBanner({ period }: { period: Period }) {
  const { t, i18n } = useTranslation()
  const [closed, setClosed] = useState(false)
  if (closed) {
    return null
  }
  return (
    <div className="forecast-banner" role="status">
      <span className="forecast-banner__icon" aria-hidden="true">
        !
      </span>
      <div className="forecast-banner__text">
        <p className="forecast-banner__title">{t('forecast.title')}</p>
        <p className="forecast-banner__body">
          {t('forecast.body', {
            period: formatPeriod(period, i18n.language),
          })}
        </p>
      </div>
      <button
        type="button"
        className="forecast-banner__close"
        aria-label={t('forecast.close')}
        title={t('forecast.close')}
        onClick={() => {
          setClosed(true)
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M6 6l12 12M18 6L6 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
