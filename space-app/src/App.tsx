import { useState } from 'react'
import type { Place } from './services/places'
import BaseMap from './components/BaseMap'
import CalendarView from './components/CalendarView'
import Header from './components/Header'
import type { View } from './components/Header'

export default function App() {
  const [view, setView] = useState<View>('map')
  const [target, setTarget] = useState<Place | null>(null)

  return (
    <>
      <Header view={view} onViewChange={setView} onPlaceSelect={setTarget} />
      {/* The map stays mounted (hidden) in calendar view, so it keeps its position. */}
      <BaseMap active={view === 'map'} target={target} />
      {view === 'calendar' ? <CalendarView /> : null}
    </>
  )
}
