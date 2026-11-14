import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Gis-gis', map: 'Kàrt', calendar: 'Arminaat' },
  search: {
    label: 'Wutal bérab',
    button: 'Wut',
    noResults: 'Amul bérab bu ñu gis.',
    error: 'Wut bi dem na ko. Jéemaatal.',
  },
  map: {
    title: 'Kàrt',
    zoomIn: 'Yokk',
    zoomOut: 'Wàññi',
    attribution: 'Wone walla nëbb ay gëtu',
    feedback: 'Ay ndimbal ci kàrt bi',
  },
  draw: {
    draw: 'Rëdd benn gox',
    cancel: 'Neenal rëdd',
    remove: 'Jële tànn bi',
    zoomHint: 'Yokk ngir tànn benn gox',
    zoomHintTitle: 'Yokk ngir tànn benn gox ({{zoom}}+)',
    closeShape: 'Tëj melo bi ngir tànn benn gox',
    selectedArea: 'Gox bi ñu tànn: {{area}}',
  },
  language: {
    label: 'Làkk',
    placeholder: 'Làkk walla kood',
    noResults: 'Amul làkk bu ñu gis.',
  },
  calendar: { label: 'Gis-gisu arminaat' },
  notFound: { heading: 'Xët wi gisul', backToMap: 'Dellu ci kàrt bi' },
  pageTitles: { map: 'Kàrt', calendar: 'Arminaat', notFound: 'Xët wi gisul' },
} satisfies PartialTranslation
