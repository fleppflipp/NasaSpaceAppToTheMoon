import type { Place } from '../services/places'
import SearchBar from './SearchBar'
import './Header.css'

export type View = 'map' | 'calendar'

const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'calendar', label: 'Calendar' },
]

interface HeaderProps {
  view: View
  onViewChange: (view: View) => void
  onPlaceSelect: (place: Place) => void
}

export default function Header({
  view,
  onViewChange,
  onPlaceSelect,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <img src="/favicon.svg" alt="" className="app-header__logo" />
        <h1 className="app-header__title">FireLock</h1>
      </div>

      <div className="app-header__search">
        {view === 'map' ? <SearchBar onResult={onPlaceSelect} /> : null}
      </div>

      <div className="view-switch" role="group" aria-label="View">
        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="view-switch__button"
            aria-pressed={view === id}
            onClick={() => {
              onViewChange(id)
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  )
}
