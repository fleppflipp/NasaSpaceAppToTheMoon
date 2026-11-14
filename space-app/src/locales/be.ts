import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Шукаць месца',
    button: 'Шукаць',
    noResults: 'Месца не знойдзена.',
    error: 'Пошук не ўдаўся. Паспрабуйце яшчэ раз.',
  },
  map: {
    title: 'Карта',
    zoomIn: 'Наблізіць',
    zoomOut: 'Аддаліць',
    attribution: 'Паказаць або схаваць крыніцы',
    feedback: 'Водгук пра карту',
  },
  draw: {
    draw: 'Намаляваць вобласць',
    cancel: 'Скасаваць малёванне',
    remove: 'Прыбраць выбар',
    zoomHint: 'Наблізьце, каб выбраць вобласць',
    zoomHintTitle: 'Наблізьце, каб выбраць вобласць ({{zoom}}+)',
    closeShape: 'Замкніце фігуру, каб выбраць вобласць',
    selectedArea: 'Выбраная вобласць: {{area}}',
  },
  language: {
    label: 'Мова',
    placeholder: 'Мова або код',
    noResults: 'Мова не знойдзена.',
  },
  notFound: { heading: 'Старонка не знойдзена', backToMap: 'Назад да карты' },
} satisfies PartialTranslation
