import type { PartialTranslation } from './eng'

export default {
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
  notFound: {
    heading: 'Siden ble ikke funnet',
    backToMap: 'Tilbake til kartet',
  },
} satisfies PartialTranslation
