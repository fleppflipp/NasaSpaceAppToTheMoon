import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Vy', map: 'Karta', calendar: 'Kalender' },
  search: {
    label: 'Sök efter en plats',
    button: 'Sök',
    noResults: 'Ingen plats hittades.',
    error: 'Sökningen misslyckades. Försök igen.',
  },
  map: {
    title: 'Karta',
    zoomIn: 'Zooma in',
    zoomOut: 'Zooma ut',
    attribution: 'Visa eller dölj källhänvisning',
    feedback: 'Synpunkter på kartan',
  },
  draw: {
    draw: 'Rita ett område',
    cancel: 'Avbryt ritning',
    remove: 'Ta bort markering',
    zoomHint: 'Zooma in för att markera ett område',
    zoomHintTitle: 'Zooma in för att markera ett område ({{zoom}}+)',
    closeShape: 'Sluta formen för att markera ett område',
    selectedArea: 'Markerat område: {{area}}',
  },
  language: {
    label: 'Språk',
    placeholder: 'Språk eller kod',
    noResults: 'Inget språk hittades.',
  },
  calendar: { label: 'Kalendervy' },
  notFound: {
    heading: 'Sidan hittades inte',
    backToMap: 'Tillbaka till kartan',
  },
  pageTitles: {
    map: 'Karta',
    calendar: 'Kalender',
    notFound: 'Sidan hittades inte',
  },
} satisfies PartialTranslation
