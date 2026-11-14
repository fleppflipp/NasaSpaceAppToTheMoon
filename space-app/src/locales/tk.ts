import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Ýer gözle',
    button: 'Gözle',
    noResults: 'Ýer tapylmady.',
    error: 'Gözleg şowsuz boldy. Gaýtadan synanyşyň.',
  },
  map: {
    title: 'Karta',
    zoomIn: 'Ulalt',
    zoomOut: 'Kiçelt',
    attribution: 'Çeşmeleri görkez ýa-da gizle',
    feedback: 'Karta barada pikir',
  },
  draw: {
    draw: 'Sebit çiz',
    cancel: 'Çyzmagy ýatyr',
    remove: 'Saýlawy aýyr',
    zoomHint: 'Sebit saýlamak üçin ulaldyň',
    zoomHintTitle: 'Sebit saýlamak üçin ulaldyň ({{zoom}}+)',
    closeShape: 'Sebit saýlamak üçin şekili ýapyň',
    selectedArea: 'Saýlanan sebit: {{area}}',
  },
  language: {
    label: 'Dil',
    placeholder: 'Dil ýa-da kod',
    noResults: 'Dil tapylmady.',
  },
  notFound: { heading: 'Sahypa tapylmady', backToMap: 'Kartany yzyna gaýt' },
} satisfies PartialTranslation
