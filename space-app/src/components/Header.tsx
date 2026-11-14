import { APP_NAME } from '../constants/app.constants'
import type { Place } from '../services/places'
import LanguageSelect from './LanguageSelect'
import SearchBar from './SearchBar'
import './Header.css'
interface HeaderProps {
  /** The place search is only shown while the map is shown. */
  showSearch: boolean
  onPlaceSelect: (place: Place) => void
}
export default function Header({ showSearch, onPlaceSelect }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <img src="/favicon.svg" alt="" className="app-header__logo" />
        <h1 className="app-header__title">{APP_NAME}</h1>
      </div>
      <div className="app-header__search">
        {showSearch ? <SearchBar onResult={onPlaceSelect} /> : null}
      </div>
      <div className="app-header__actions">
        <LanguageSelect />
      </div>
    </header>
  )
}
