import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { APP_NAME } from '../constants/app.constants'
import { ROUTES } from '../constants/routes.constants'
import type { Place } from '../services/places'
import SearchBar from './SearchBar'
import './Header.css'
interface HeaderProps {
  isMap: boolean
  onPlaceSelect: (place: Place) => void
}
export default function Header({ isMap, onPlaceSelect }: HeaderProps) {
  const { t } = useTranslation()
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <img src="/favicon.svg" alt="" className="app-header__logo" />
        <h1 className="app-header__title">{APP_NAME}</h1>
      </div>
      <div className="app-header__search">
        {isMap ? <SearchBar onResult={onPlaceSelect} /> : null}
      </div>
      <nav className="view-switch" aria-label={t('navigation.label')}>
        <NavLink className="view-switch__button" to={ROUTES.map}>
          {t('navigation.map')}
        </NavLink>
        <NavLink className="view-switch__button" to={ROUTES.calendar}>
          {t('navigation.calendar')}
        </NavLink>
      </nav>
    </header>
  )
}
