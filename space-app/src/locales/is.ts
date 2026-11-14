import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Sýn', map: 'Kort', calendar: 'Dagatal' },
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
  calendar: { label: 'Dagatalssýn' },
  notFound: { heading: 'Síða fannst ekki', backToMap: 'Aftur á kortið' },
  pageTitles: {
    map: 'Kort',
    calendar: 'Dagatal',
    notFound: 'Síða fannst ekki',
  },
} satisfies PartialTranslation
