import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Gade', map: 'Kat', calendar: 'Kalandriye' },
  search: {
    label: 'Chèche yon kote',
    button: 'Chèche',
    noResults: 'Pa jwenn okenn kote.',
    error: 'Rechèch la echwe. Tanpri eseye ankò.',
  },
  map: {
    title: 'Kat',
    zoomIn: 'Zoum anndan',
    zoomOut: 'Zoum deyò',
    attribution: 'Montre oswa kache atribisyon',
    feedback: 'Kòmantè sou kat la',
  },
  draw: {
    draw: 'Trase yon zòn',
    cancel: 'Anile trase a',
    remove: 'Retire seleksyon an',
    zoomHint: 'Zoum anndan pou chwazi yon zòn',
    zoomHintTitle: 'Zoum anndan pou chwazi yon zòn ({{zoom}}+)',
    closeShape: 'Fèmen fòm lan pou chwazi yon zòn',
    selectedArea: 'Zòn chwazi a: {{area}}',
  },
  language: {
    label: 'Lang',
    placeholder: 'Lang oswa kòd',
    noResults: 'Pa jwenn okenn lang.',
  },
  calendar: { label: 'Gade kalandriye' },
  notFound: { heading: 'Paj la pa jwenn', backToMap: 'Retounen sou kat la' },
  pageTitles: {
    map: 'Kat',
    calendar: 'Kalandriye',
    notFound: 'Paj la pa jwenn',
  },
} satisfies PartialTranslation
