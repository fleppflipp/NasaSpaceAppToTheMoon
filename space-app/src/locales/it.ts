import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Vista', map: 'Mappa', calendar: 'Calendario' },
  search: {
    label: 'Cerca un luogo',
    button: 'Cerca',
    noResults: 'Nessun luogo trovato.',
    error: 'Ricerca non riuscita. Riprova.',
  },
  map: {
    title: 'Mappa',
    zoomIn: 'Ingrandisci',
    zoomOut: 'Riduci',
    attribution: 'Mostra o nascondi attribuzione',
    feedback: 'Feedback sulla mappa',
  },
  draw: {
    draw: "Disegna un'area",
    cancel: 'Annulla disegno',
    remove: 'Rimuovi selezione',
    zoomHint: "Ingrandisci per selezionare un'area",
    zoomHintTitle: "Ingrandisci per selezionare un'area ({{zoom}}+)",
    closeShape: "Chiudi la forma per selezionare un'area",
    selectedArea: 'Area selezionata: {{area}}',
  },
  language: {
    label: 'Lingua',
    placeholder: 'Lingua o codice',
    noResults: 'Nessuna lingua trovata.',
  },
  calendar: { label: 'Vista calendario' },
  notFound: { heading: 'Pagina non trovata', backToMap: 'Torna alla mappa' },
  pageTitles: {
    map: 'Mappa',
    calendar: 'Calendario',
    notFound: 'Pagina non trovata',
  },
} satisfies PartialTranslation
