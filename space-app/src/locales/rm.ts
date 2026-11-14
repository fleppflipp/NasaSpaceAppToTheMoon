import type { PartialTranslation } from './eng'

export default {
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
  notFound: {
    heading: 'Pagina betg chattada',
    backToMap: 'Enavos tar la charta',
  },
} satisfies PartialTranslation
