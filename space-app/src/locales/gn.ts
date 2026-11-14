import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Hecha', map: 'Mapa', calendar: 'Arapokõindy' },
  search: {
    label: 'Eheka peteĩ tenda',
    button: 'Heka',
    noResults: 'Ndojuhúi tenda.',
    error: "Ndoikói pe heka. Eñeha'ã jey.",
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Mbotuicha',
    zoomOut: 'Mbokichi',
    attribution: 'Ehechauka térã eñomi umi ypy',
    feedback: "Ñe'ẽjoapy mapa rehegua",
  },
  draw: {
    draw: 'Ehai peteĩ tendaguy',
    cancel: 'Eity ehai',
    remove: 'Emboguete poravo',
    zoomHint: 'Emotuicha eiporavo hag̃ua peteĩ tendaguy',
    zoomHintTitle: 'Emotuicha eiporavo hag̃ua peteĩ tendaguy ({{zoom}}+)',
    closeShape: "Emboty ta'anga eiporavo hag̃ua peteĩ tendaguy",
    selectedArea: 'Tendaguy poravopyre: {{area}}',
  },
  language: {
    label: "Ñe'ẽ",
    placeholder: "Ñe'ẽ térã kóite",
    noResults: "Ndojejuhúi ñe'ẽ.",
  },
  calendar: { label: 'Arapokõindy hecha' },
  notFound: { heading: 'Ndojejuhúi kuatiarogue', backToMap: 'Eju jey mapápe' },
  pageTitles: {
    map: 'Mapa',
    calendar: 'Arapokõindy',
    notFound: 'Ndojejuhúi kuatiarogue',
  },
} satisfies PartialTranslation
