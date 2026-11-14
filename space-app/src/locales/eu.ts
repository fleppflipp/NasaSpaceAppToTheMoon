import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Bilatu leku bat',
    button: 'Bilatu',
    noResults: 'Ez da lekurik aurkitu.',
    error: 'Bilaketak huts egin du. Saiatu berriro.',
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Hurbildu',
    zoomOut: 'Urrundu',
    attribution: 'Erakutsi edo ezkutatu egiletza',
    feedback: 'Mapari buruzko iritzia',
  },
  draw: {
    draw: 'Marraztu eremu bat',
    cancel: 'Utzi marrazkia',
    remove: 'Kendu hautapena',
    zoomHint: 'Hurbildu eremu bat hautatzeko',
    zoomHintTitle: 'Hurbildu eremu bat hautatzeko ({{zoom}}+)',
    closeShape: 'Itxi forma eremu bat hautatzeko',
    selectedArea: 'Hautatutako eremua: {{area}}',
  },
  language: {
    label: 'Hizkuntza',
    placeholder: 'Hizkuntza edo kodea',
    noResults: 'Ez da hizkuntzarik aurkitu.',
  },
  notFound: { heading: 'Ez da orria aurkitu', backToMap: 'Itzuli mapara' },
} satisfies PartialTranslation
