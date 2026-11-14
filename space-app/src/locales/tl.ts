import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Tanawin', map: 'Mapa', calendar: 'Kalendaryo' },
  search: {
    label: 'Maghanap ng lugar',
    button: 'Hanapin',
    noResults: 'Walang nahanap na lugar.',
    error: 'Nabigo ang paghahanap. Subukan muli.',
  },
  map: {
    title: 'Mapa',
    zoomIn: 'I-zoom in',
    zoomOut: 'I-zoom out',
    attribution: 'Ipakita o itago ang pagkilala',
    feedback: 'Puna tungkol sa mapa',
  },
  draw: {
    draw: 'Gumuhit ng lugar',
    cancel: 'Kanselahin ang pagguhit',
    remove: 'Alisin ang pinili',
    zoomHint: 'Mag-zoom in para pumili ng lugar',
    zoomHintTitle: 'Mag-zoom in para pumili ng lugar ({{zoom}}+)',
    closeShape: 'Isara ang hugis para pumili ng lugar',
    selectedArea: 'Napiling lugar: {{area}}',
  },
  language: {
    label: 'Wika',
    placeholder: 'Wika o code',
    noResults: 'Walang nahanap na wika.',
  },
  calendar: { label: 'Tanawin ng kalendaryo' },
  notFound: {
    heading: 'Hindi nahanap ang pahina',
    backToMap: 'Bumalik sa mapa',
  },
  pageTitles: {
    map: 'Mapa',
    calendar: 'Kalendaryo',
    notFound: 'Hindi nahanap ang pahina',
  },
} satisfies PartialTranslation
