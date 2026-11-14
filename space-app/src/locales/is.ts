import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Leita að stað',
    button: 'Leita',
    noResults: 'Enginn staður fannst.',
    error: 'Leit mistókst. Reyndu aftur.',
  },
  map: {
    title: 'Kort',
    zoomIn: 'Stækka',
    zoomOut: 'Minnka',
    attribution: 'Sýna eða fela heimildir',
    feedback: 'Ábendingar um kortið',
  },
  draw: {
    draw: 'Teikna svæði',
    cancel: 'Hætta við teikningu',
    remove: 'Fjarlægja val',
    zoomHint: 'Stækkaðu til að velja svæði',
    zoomHintTitle: 'Stækkaðu til að velja svæði ({{zoom}}+)',
    closeShape: 'Lokaðu forminu til að velja svæði',
    selectedArea: 'Valið svæði: {{area}}',
  },
  language: {
    label: 'Tungumál',
    placeholder: 'Tungumál eða kóði',
    noResults: 'Ekkert tungumál fannst.',
  },
  notFound: { heading: 'Síða fannst ekki', backToMap: 'Aftur á kortið' },
} satisfies PartialTranslation
