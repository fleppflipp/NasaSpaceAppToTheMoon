import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Vista', map: 'Mapa', calendar: 'Calendari' },
  search: {
    label: 'Cerca un lloc',
    button: 'Cerca',
    noResults: "No s'ha trobat cap lloc.",
    error: 'La cerca ha fallat. Torna-ho a provar.',
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Apropa',
    zoomOut: 'Allunya',
    attribution: "Mostra o amaga l'atribució",
    feedback: 'Comentaris sobre el mapa',
  },
  draw: {
    draw: 'Dibuixa una àrea',
    cancel: 'Cancel·la el dibuix',
    remove: 'Elimina la selecció',
    zoomHint: 'Apropa per seleccionar una àrea',
    zoomHintTitle: 'Apropa per seleccionar una àrea ({{zoom}}+)',
    closeShape: 'Tanca la forma per seleccionar una àrea',
    selectedArea: 'Àrea seleccionada: {{area}}',
  },
  language: {
    label: 'Llengua',
    placeholder: 'Llengua o codi',
    noResults: "No s'ha trobat cap llengua.",
  },
  calendar: { label: 'Vista de calendari' },
  notFound: { heading: "No s'ha trobat la pàgina", backToMap: 'Torna al mapa' },
  pageTitles: {
    map: 'Mapa',
    calendar: 'Calendari',
    notFound: "No s'ha trobat la pàgina",
  },
} satisfies PartialTranslation
