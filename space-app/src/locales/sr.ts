import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Приказ', map: 'Мапа', calendar: 'Календар' },
  search: {
    label: 'Претражи место',
    button: 'Претражи',
    noResults: 'Место није пронађено.',
    error: 'Претрага није успела. Покушајте поново.',
  },
  map: {
    title: 'Мапа',
    zoomIn: 'Увећај',
    zoomOut: 'Умањи',
    attribution: 'Прикажи или сакриј изворе',
    feedback: 'Повратне информације о мапи',
  },
  draw: {
    draw: 'Нацртај област',
    cancel: 'Откажи цртање',
    remove: 'Уклони избор',
    zoomHint: 'Увећајте да изаберете област',
    zoomHintTitle: 'Увећајте да изаберете област ({{zoom}}+)',
    closeShape: 'Затворите облик да изаберете област',
    selectedArea: 'Изабрана област: {{area}}',
  },
  language: {
    label: 'Језик',
    placeholder: 'Језик или код',
    noResults: 'Језик није пронађен.',
  },
  calendar: { label: 'Приказ календара' },
  notFound: { heading: 'Страница није пронађена', backToMap: 'Назад на мапу' },
  pageTitles: {
    map: 'Мапа',
    calendar: 'Календар',
    notFound: 'Страница није пронађена',
  },
} satisfies PartialTranslation
