import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Pono', map: 'Mmapa', calendar: 'Khalendara' },
  search: {
    label: 'Batla sebaka',
    button: 'Batla',
    noResults: 'Ha ho sebaka se fumanoeng.',
    error: 'Patlo e hlolehile. Ka kopo leka hape.',
  },
  map: {
    title: 'Mmapa',
    zoomIn: 'Atolosa',
    zoomOut: 'Fokotsa',
    attribution: 'Bontša kapa u pate mehloli',
    feedback: 'Maikutlo ka mmapa',
  },
  draw: {
    draw: 'Taka sebaka',
    cancel: 'Hlakola ho taka',
    remove: 'Tlosa khetho',
    zoomHint: 'Atolosa ho khetha sebaka',
    zoomHintTitle: 'Atolosa ho khetha sebaka ({{zoom}}+)',
    closeShape: 'Koala sebopeho ho khetha sebaka',
    selectedArea: 'Sebaka se khethiloeng: {{area}}',
  },
  language: {
    label: 'Puo',
    placeholder: 'Puo kapa khoutu',
    noResults: 'Ha ho puo e fumanoeng.',
  },
  calendar: { label: 'Pono ea khalendara' },
  notFound: {
    heading: 'Leqephe ha le a fumanoa',
    backToMap: 'Khutlela mmapeng',
  },
  pageTitles: {
    map: 'Mmapa',
    calendar: 'Khalendara',
    notFound: 'Leqephe ha le a fumanoa',
  },
} satisfies PartialTranslation
