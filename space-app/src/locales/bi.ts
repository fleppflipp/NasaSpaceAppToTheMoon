import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Lukluk', map: 'Map', calendar: 'Kalenda' },
  search: {
    label: 'Lukaotem wan ples',
    button: 'Lukaot',
    noResults: 'No gat wan ples we i faenem.',
    error: 'Lukaot i no wok. Plis traem bakegen.',
  },
  map: {
    title: 'Map',
    zoomIn: 'Mekem bigfala',
    zoomOut: 'Mekem smol',
    attribution: 'Soem no haedem ol sos',
    feedback: 'Tingting abaot map',
  },
  draw: {
    draw: 'Droem wan eria',
    cancel: 'Stopem droing',
    remove: 'Rimuvum seleksen',
    zoomHint: 'Mekem bigfala blong sasem wan eria',
    zoomHintTitle: 'Mekem bigfala blong sasem wan eria ({{zoom}}+)',
    closeShape: 'Satem sep blong sasem wan eria',
    selectedArea: 'Eria we yu sasem: {{area}}',
  },
  language: {
    label: 'Lanwis',
    placeholder: 'Lanwis no kod',
    noResults: 'No gat wan lanwis we i faenem.',
  },
  calendar: { label: 'Kalenda luk' },
  notFound: { heading: 'No faenem pej ia', backToMap: 'Gobak long map' },
  pageTitles: { map: 'Map', calendar: 'Kalenda', notFound: 'No faenem pej ia' },
} satisfies PartialTranslation
