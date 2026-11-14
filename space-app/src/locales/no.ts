import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Visning', map: 'Kart', calendar: 'Kalender' },
  search: {
    label: 'Søk etter et sted',
    button: 'Søk',
    noResults: 'Fant ingen steder.',
    error: 'Søket mislyktes. Prøv igjen.',
  },
  map: {
    title: 'Kart',
    zoomIn: 'Zoom inn',
    zoomOut: 'Zoom ut',
    attribution: 'Vis eller skjul kildehenvisning',
    feedback: 'Tilbakemelding på kartet',
  },
  draw: {
    draw: 'Tegn et område',
    cancel: 'Avbryt tegning',
    remove: 'Fjern markering',
    zoomHint: 'Zoom inn for å markere et område',
    zoomHintTitle: 'Zoom inn for å markere et område ({{zoom}}+)',
    closeShape: 'Lukk figuren for å markere et område',
    selectedArea: 'Markert område: {{area}}',
  },
  language: {
    label: 'Språk',
    placeholder: 'Språk eller kode',
    noResults: 'Fant ingen språk.',
  },
  calendar: { label: 'Kalendervisning' },
  notFound: {
    heading: 'Siden ble ikke funnet',
    backToMap: 'Tilbake til kartet',
  },
  pageTitles: {
    map: 'Kart',
    calendar: 'Kalender',
    notFound: 'Siden ble ikke funnet',
  },
} satisfies PartialTranslation
