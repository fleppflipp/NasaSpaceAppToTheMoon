import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Ort suchen',
    button: 'Suchen',
    noResults: 'Kein Ort gefunden.',
    error: 'Die Suche ist fehlgeschlagen. Bitte erneut versuchen.',
  },
  map: {
    title: 'Karte',
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    attribution: 'Quellenangabe ein-/ausblenden',
    feedback: 'Feedback zur Karte',
  },
  draw: {
    draw: 'Bereich zeichnen',
    cancel: 'Zeichnen abbrechen',
    remove: 'Auswahl entfernen',
    zoomHint: 'Zoomen Sie näher, um einen Bereich auszuwählen',
    zoomHintTitle: 'Zoomen Sie näher, um einen Bereich auszuwählen ({{zoom}}+)',
    closeShape: 'Schließen Sie die Form, um einen Bereich auszuwählen',
    selectedArea: 'Ausgewählter Bereich: {{area}}',
  },
  language: {
    label: 'Sprache',
    placeholder: 'Sprache oder Code',
    noResults: 'Keine Sprache gefunden.',
  },
  notFound: { heading: 'Seite nicht gefunden', backToMap: 'Zurück zur Karte' },
} satisfies PartialTranslation
