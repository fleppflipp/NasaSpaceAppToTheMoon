import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Көрүнүш', map: 'Карта', calendar: 'Жылнаама' },
  search: {
    label: 'Жерди издөө',
    button: 'Издөө',
    noResults: 'Жер табылган жок.',
    error: 'Издөө ишке ашкан жок. Кайра аракет кылыңыз.',
  },
  map: {
    title: 'Карта',
    zoomIn: 'Чоңойтуу',
    zoomOut: 'Кичирейтүү',
    attribution: 'Булактарды көрсөтүү же жашыруу',
    feedback: 'Карта тууралуу пикир',
  },
  draw: {
    draw: 'Аймакты тартуу',
    cancel: 'Тартууну жокко чыгаруу',
    remove: 'Тандоону алып салуу',
    zoomHint: 'Аймакты тандоо үчүн чоңойтуңуз',
    zoomHintTitle: 'Аймакты тандоо үчүн чоңойтуңуз ({{zoom}}+)',
    closeShape: 'Аймакты тандоо үчүн фигураны жабыңыз',
    selectedArea: 'Тандалган аймак: {{area}}',
  },
  language: {
    label: 'Тил',
    placeholder: 'Тил же код',
    noResults: 'Тил табылган жок.',
  },
  calendar: { label: 'Жылнаама көрүнүшү' },
  notFound: { heading: 'Барак табылган жок', backToMap: 'Картага кайтуу' },
  pageTitles: {
    map: 'Карта',
    calendar: 'Жылнаама',
    notFound: 'Барак табылган жок',
  },
} satisfies PartialTranslation
