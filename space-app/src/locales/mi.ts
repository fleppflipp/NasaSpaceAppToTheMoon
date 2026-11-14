import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Rapua he wāhi',
    button: 'Rapua',
    noResults: 'Kāore he wāhi i kitea.',
    error: 'I rahua te rapu. Tēnā whakamātauria anō.',
  },
  map: {
    title: 'Mahere',
    zoomIn: 'Whakarahi',
    zoomOut: 'Whakaiti',
    attribution: 'Whakaatu, huna rānei i ngā pūtake',
    feedback: 'Urupare mō te mahere',
  },
  draw: {
    draw: 'Tā i tētahi rohe',
    cancel: 'Whakakore i te tā',
    remove: 'Tango i te kōwhiri',
    zoomHint: 'Whakarahi hei kōwhiri i tētahi rohe',
    zoomHintTitle: 'Whakarahi hei kōwhiri i tētahi rohe ({{zoom}}+)',
    closeShape: 'Katia te āhua hei kōwhiri i tētahi rohe',
    selectedArea: 'Te rohe kua kōwhiria: {{area}}',
  },
  language: {
    label: 'Reo',
    placeholder: 'Reo, waehere rānei',
    noResults: 'Kāore he reo i kitea.',
  },
  notFound: {
    heading: 'Kāore i kitea te whārangi',
    backToMap: 'Hoki ki te mahere',
  },
} satisfies PartialTranslation
