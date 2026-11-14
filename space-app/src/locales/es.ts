import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Buscar un lugar',
    button: 'Buscar',
    noResults: 'No se encontró ningún lugar.',
    error: 'La búsqueda falló. Inténtalo de nuevo.',
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    attribution: 'Mostrar u ocultar atribución',
    feedback: 'Comentarios sobre el mapa',
  },
  draw: {
    draw: 'Dibujar un área',
    cancel: 'Cancelar dibujo',
    remove: 'Quitar selección',
    zoomHint: 'Acércate para seleccionar un área',
    zoomHintTitle: 'Acércate para seleccionar un área ({{zoom}}+)',
    closeShape: 'Cierra la forma para seleccionar un área',
    selectedArea: 'Área seleccionada: {{area}}',
  },
  language: {
    label: 'Idioma',
    placeholder: 'Idioma o código',
    noResults: 'No se encontró ningún idioma.',
  },
  notFound: { heading: 'Página no encontrada', backToMap: 'Volver al mapa' },
} satisfies PartialTranslation
