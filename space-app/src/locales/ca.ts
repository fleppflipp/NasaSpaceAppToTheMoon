import type { PartialTranslation } from './eng'

export default {
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
  notFound: { heading: "No s'ha trobat la pàgina", backToMap: 'Torna al mapa' },
} satisfies PartialTranslation
