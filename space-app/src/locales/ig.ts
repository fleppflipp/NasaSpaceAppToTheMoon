import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Nlele', map: 'Maapụ', calendar: 'Kalenda' },
  search: {
    label: 'Chọọ ebe',
    button: 'Chọọ',
    noResults: 'Ahụghị ebe ọ bụla.',
    error: 'Nchọta dara. Biko nwaa ọzọ.',
  },
  map: {
    title: 'Maapụ',
    zoomIn: 'Gbasaa',
    zoomOut: 'Mebie ntakịrị',
    attribution: 'Gosi ma ọ bụ zoo isi mmalite',
    feedback: 'Echiche gbasara maapụ',
  },
  draw: {
    draw: 'Seta mpaghara',
    cancel: 'Kagbuo ịse',
    remove: 'Wepụ nhọrọ',
    zoomHint: 'Gbasaa ka ịhọrọ mpaghara',
    zoomHintTitle: 'Gbasaa ka ịhọrọ mpaghara ({{zoom}}+)',
    closeShape: 'Mechie udi ka ịhọrọ mpaghara',
    selectedArea: 'Mpaghara ahọpụtara: {{area}}',
  },
  language: {
    label: 'Asụsụ',
    placeholder: 'Asụsụ ma ọ bụ koodu',
    noResults: 'Ahụghị asụsụ ọ bụla.',
  },
  calendar: { label: 'Nlele kalenda' },
  notFound: { heading: 'Ahụghị peeji', backToMap: 'Laghachi na maapụ' },
  pageTitles: { map: 'Maapụ', calendar: 'Kalenda', notFound: 'Ahụghị peeji' },
} satisfies PartialTranslation
