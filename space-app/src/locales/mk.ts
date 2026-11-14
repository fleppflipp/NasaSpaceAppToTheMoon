import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Преглед', map: 'Карта', calendar: 'Календар' },
  search: {
    label: 'Барај место',
    button: 'Барај',
    noResults: 'Не е пронајдено место.',
    error: 'Пребарувањето не успеа. Обидете се повторно.',
  },
  map: {
    title: 'Карта',
    zoomIn: 'Зголеми',
    zoomOut: 'Намали',
    attribution: 'Прикажи или скриј извори',
    feedback: 'Повратни информации за картата',
  },
  draw: {
    draw: 'Нацртај област',
    cancel: 'Откажи цртање',
    remove: 'Отстрани избор',
    zoomHint: 'Зголемете за да изберете област',
    zoomHintTitle: 'Зголемете за да изберете област ({{zoom}}+)',
    closeShape: 'Затворете ја формата за да изберете област',
    selectedArea: 'Избрана област: {{area}}',
  },
  language: {
    label: 'Јазик',
    placeholder: 'Јазик или код',
    noResults: 'Не е пронајден јазик.',
  },
  calendar: { label: 'Преглед на календар' },
  notFound: {
    heading: 'Страницата не е пронајдена',
    backToMap: 'Назад кон картата',
  },
  pageTitles: {
    map: 'Карта',
    calendar: 'Календар',
    notFound: 'Страницата не е пронајдена',
  },
} satisfies PartialTranslation
