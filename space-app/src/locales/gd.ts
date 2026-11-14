import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Lorg àite',
    button: 'Lorg',
    noResults: 'Cha deach àite a lorg.',
    error: "Dh'fhàillig an lorg. Feuch a-rithist.",
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Sùm a-steach',
    zoomOut: 'Sùm a-mach',
    attribution: 'Toglaich aithris stòrais',
    feedback: 'Fios air ais mun mhapa',
  },
  draw: {
    draw: 'Tarraing sgìre',
    cancel: 'Sguir dhen tharraing',
    remove: 'Thoir air falbh an roghainn',
    zoomHint: 'Sùm a-steach gus sgìre a thaghadh',
    zoomHintTitle: 'Sùm a-steach gus sgìre a thaghadh ({{zoom}}+)',
    closeShape: 'Dùin an cumadh gus sgìre a thaghadh',
    selectedArea: 'An sgìre a thagh thu: {{area}}',
  },
  language: {
    label: 'Cànan',
    placeholder: 'Cànan no còd',
    noResults: 'Cha deach cànan a lorg.',
  },
  notFound: {
    heading: 'Cha deach an duilleag a lorg',
    backToMap: 'Air ais dhan mhapa',
  },
} satisfies PartialTranslation
