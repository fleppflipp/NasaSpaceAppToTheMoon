import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Zoek een plaats',
    button: 'Zoeken',
    noResults: 'Geen plaats gevonden.',
    error: 'Zoeken mislukt. Probeer het opnieuw.',
  },
  map: {
    title: 'Kaart',
    zoomIn: 'Inzoomen',
    zoomOut: 'Uitzoomen',
    attribution: 'Bronvermelding tonen of verbergen',
    feedback: 'Feedback over de kaart',
  },
  draw: {
    draw: 'Een gebied tekenen',
    cancel: 'Tekenen annuleren',
    remove: 'Selectie verwijderen',
    zoomHint: 'Zoom in om een gebied te selecteren',
    zoomHintTitle: 'Zoom in om een gebied te selecteren ({{zoom}}+)',
    closeShape: 'Sluit de vorm om een gebied te selecteren',
    selectedArea: 'Geselecteerd gebied: {{area}}',
  },
  language: {
    label: 'Taal',
    placeholder: 'Taal of code',
    noResults: 'Geen taal gevonden.',
  },
  notFound: {
    heading: 'Pagina niet gevonden',
    backToMap: 'Terug naar de kaart',
  },
} satisfies PartialTranslation
