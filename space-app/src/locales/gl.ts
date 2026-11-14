import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Vista', map: 'Mapa', calendar: 'Calendario' },
  search: {
    label: 'Buscar un lugar',
    button: 'Buscar',
    noResults: 'Non se atopou ningún lugar.',
    error: 'A busca fallou. Téntao de novo.',
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Achegar',
    zoomOut: 'Afastar',
    attribution: 'Amosar ou agochar a atribución',
    feedback: 'Comentarios sobre o mapa',
  },
  draw: {
    draw: 'Debuxar unha área',
    cancel: 'Cancelar o debuxo',
    remove: 'Quitar a selección',
    zoomHint: 'Achégate para seleccionar unha área',
    zoomHintTitle: 'Achégate para seleccionar unha área ({{zoom}}+)',
    closeShape: 'Pecha a forma para seleccionar unha área',
    selectedArea: 'Área seleccionada: {{area}}',
  },
  language: {
    label: 'Idioma',
    placeholder: 'Idioma ou código',
    noResults: 'Non se atopou ningún idioma.',
  },
  calendar: { label: 'Vista de calendario' },
  notFound: { heading: 'Non se atopou a páxina', backToMap: 'Volver ao mapa' },
  pageTitles: {
    map: 'Mapa',
    calendar: 'Calendario',
    notFound: 'Non se atopou a páxina',
  },
} satisfies PartialTranslation
