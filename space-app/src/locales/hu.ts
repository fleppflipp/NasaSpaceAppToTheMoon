import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Nézet', map: 'Térkép', calendar: 'Naptár' },
  search: {
    label: 'Hely keresése',
    button: 'Keresés',
    noResults: 'Nem található hely.',
    error: 'A keresés nem sikerült. Próbáld újra.',
  },
  map: {
    title: 'Térkép',
    zoomIn: 'Nagyítás',
    zoomOut: 'Kicsinyítés',
    attribution: 'Forrásmegjelölés be/ki',
    feedback: 'Visszajelzés a térképről',
  },
  draw: {
    draw: 'Terület rajzolása',
    cancel: 'Rajzolás megszakítása',
    remove: 'Kijelölés törlése',
    zoomHint: 'Nagyíts rá a terület kijelöléséhez',
    zoomHintTitle:
      'Nagyíts rá a terület kijelöléséhez (legalább {{zoom}}-es nagyítás)',
    closeShape: 'Zárd be az alakzatot a terület kijelöléséhez',
    selectedArea: 'Kijelölt terület: {{area}}',
  },
  language: {
    label: 'Nyelv',
    placeholder: 'Nyelv vagy kód',
    noResults: 'Nincs ilyen nyelv.',
  },
  fires: { noData: 'Erre az időszakra még nincs tűzadat.' },
  timeline: {
    label: 'Időszak',
    year: 'Év',
    week: 'Hét',
    range: '{{start}} – {{end}}',
  },
  calendar: { label: 'Naptár nézet' },
  notFound: {
    heading: 'Az oldal nem található',
    backToMap: 'Vissza a térképre',
  },
  pageTitles: {
    map: 'Térkép',
    calendar: 'Naptár',
    notFound: 'Az oldal nem található',
  },
} satisfies PartialTranslation
