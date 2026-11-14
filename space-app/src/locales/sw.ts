import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Tafuta mahali',
    button: 'Tafuta',
    noResults: 'Hakuna mahali palipopatikana.',
    error: 'Utafutaji umeshindwa. Tafadhali jaribu tena.',
  },
  map: {
    title: 'Ramani',
    zoomIn: 'Kuza',
    zoomOut: 'Punguza',
    attribution: 'Onyesha au ficha vyanzo',
    feedback: 'Maoni kuhusu ramani',
  },
  draw: {
    draw: 'Chora eneo',
    cancel: 'Ghairi kuchora',
    remove: 'Ondoa uteuzi',
    zoomHint: 'Kuza ili kuchagua eneo',
    zoomHintTitle: 'Kuza ili kuchagua eneo ({{zoom}}+)',
    closeShape: 'Funga umbo ili kuchagua eneo',
    selectedArea: 'Eneo lililochaguliwa: {{area}}',
  },
  language: {
    label: 'Lugha',
    placeholder: 'Lugha au msimbo',
    noResults: 'Hakuna lugha iliyopatikana.',
  },
  notFound: {
    heading: 'Ukurasa haujapatikana',
    backToMap: 'Rudi kwenye ramani',
  },
} satisfies PartialTranslation
