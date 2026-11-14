import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Amharc', map: 'Léarscáil', calendar: 'Féilire' },
  search: {
    label: 'Cuardaigh áit',
    button: 'Cuardaigh',
    noResults: 'Níor aimsíodh aon áit.',
    error: 'Theip ar an gcuardach. Bain triail eile as.',
  },
  map: {
    title: 'Léarscáil',
    zoomIn: 'Súmáil isteach',
    zoomOut: 'Súmáil amach',
    attribution: 'Scoránaigh an leaganacht',
    feedback: 'Aiseolas ar an léarscáil',
  },
  draw: {
    draw: 'Tarraing ceantar',
    cancel: 'Cealaigh an líníocht',
    remove: 'Bain an roghnúchán',
    zoomHint: 'Súmáil isteach chun ceantar a roghnú',
    zoomHintTitle: 'Súmáil isteach chun ceantar a roghnú ({{zoom}}+)',
    closeShape: 'Dún an cruth chun ceantar a roghnú',
    selectedArea: 'An ceantar roghnaithe: {{area}}',
  },
  language: {
    label: 'Teanga',
    placeholder: 'Teanga nó cód',
    noResults: 'Níor aimsíodh aon teanga.',
  },
  calendar: { label: 'Amharc féilire' },
  notFound: {
    heading: 'Níor aimsíodh an leathanach',
    backToMap: 'Ar ais chuig an léarscáil',
  },
  pageTitles: {
    map: 'Léarscáil',
    calendar: 'Féilire',
    notFound: 'Níor aimsíodh an leathanach',
  },
} satisfies PartialTranslation
