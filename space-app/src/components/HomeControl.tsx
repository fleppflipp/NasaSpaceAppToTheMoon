import { useTranslation } from 'react-i18next'
import './HomeControl.css'

interface HomeControlProps {
  /** Takes the map back to the view it has when the page loads. */
  onHome: () => void
}

/** Map overlay button (top-left, below the header): a globe that returns to the starting view. */
export default function HomeControl({ onHome }: HomeControlProps) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className="home-control"
      aria-label={t('map.home')}
      title={t('map.home')}
      onClick={onHome}
    >
      <svg
        className="home-control__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
      </svg>
    </button>
  )
}
