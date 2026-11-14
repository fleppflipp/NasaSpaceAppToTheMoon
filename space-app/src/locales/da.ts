import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Søg efter et sted',
    button: 'Søg',
    noResults: 'Intet sted fundet.',
    error: 'Søgningen mislykkedes. Prøv igen.',
  },
  map: {
    title: 'Kort',
    zoomIn: 'Zoom ind',
    zoomOut: 'Zoom ud',
    attribution: 'Vis eller skjul kildeangivelse',
    feedback: 'Feedback om kortet',
  },
  draw: {
    draw: 'Tegn et område',
    cancel: 'Annuller tegning',
    remove: 'Fjern markering',
    zoomHint: 'Zoom ind for at markere et område',
    zoomHintTitle: 'Zoom ind for at markere et område ({{zoom}}+)',
    closeShape: 'Luk figuren for at markere et område',
    selectedArea: 'Markeret område: {{area}}',
  },
  language: {
    label: 'Sprog',
    placeholder: 'Sprog eller kode',
    noResults: 'Intet sprog fundet.',
  },
  notFound: {
    heading: 'Siden blev ikke fundet',
    backToMap: 'Tilbage til kortet',
  },
} satisfies PartialTranslation
