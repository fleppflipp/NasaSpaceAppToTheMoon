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
  fires: {
    noData: 'Még nincs tűzadat.',
    unavailable: 'A tűzadatok nem tölthetők be. Fut a tile szerver?',
  },
  timeline: {
    label: 'Időszak',
    month: 'Hónap',
    loading: 'Hónapok betöltése…',
    empty: 'Nincs hónap tűzadattal',
  },
  calendar: {
    label: 'Naptár nézet',
    close: 'Naptár bezárása',
    chooseDay: 'Válassz egy napot a tüzek térképes megjelenítéséhez.',
    previousMonth: 'Előző hónap',
    nextMonth: 'Következő hónap',
    showMonth: 'Teljes hónap megjelenítése',
    dailyHint:
      'A napi nézet csak tűzpontokat mutat. Jelenítsd meg a teljes hónapot az összevont tűzterületekhez.',
  },
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
