import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Vista', map: 'Charta', calendar: 'Chalender' },
  search: {
    label: 'Tschertgar in lieu',
    button: 'Tschertgar',
    noResults: 'Nagin lieu chattà.',
    error: "La tschertga n'è betg reussida. Empruvai danovamain.",
  },
  map: {
    title: 'Charta',
    zoomIn: 'Engrondir',
    zoomOut: 'Smanizzar',
    attribution: 'Mussar u zuppar las funtaunas',
    feedback: 'Resposta davart la charta',
  },
  draw: {
    draw: 'Dissegnar in territori',
    cancel: 'Interrumper il dissegn',
    remove: 'Allontanar la tscherna',
    zoomHint: 'Engrondir per tscherner in territori',
    zoomHintTitle: 'Engrondir per tscherner in territori ({{zoom}}+)',
    closeShape: 'Serrar la furma per tscherner in territori',
    selectedArea: 'Territori tschernì: {{area}}',
  },
  language: {
    label: 'Lingua',
    placeholder: 'Lingua u code',
    noResults: 'Nagina lingua chattada.',
  },
  calendar: { label: 'Vista dal chalender' },
  notFound: {
    heading: 'Pagina betg chattada',
    backToMap: 'Enavos tar la charta',
  },
  pageTitles: {
    map: 'Charta',
    calendar: 'Chalender',
    notFound: 'Pagina betg chattada',
  },
} satisfies PartialTranslation
