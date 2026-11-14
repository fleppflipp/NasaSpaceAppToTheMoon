import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Търсене на място',
    button: 'Търси',
    noResults: 'Не е намерено място.',
    error: 'Търсенето не успя. Опитайте отново.',
  },
  map: {
    title: 'Карта',
    zoomIn: 'Увеличи',
    zoomOut: 'Намали',
    attribution: 'Показване или скриване на източници',
    feedback: 'Обратна връзка за картата',
  },
  draw: {
    draw: 'Нарисувай област',
    cancel: 'Отмяна на рисуването',
    remove: 'Премахни избора',
    zoomHint: 'Увеличете, за да изберете област',
    zoomHintTitle: 'Увеличете, за да изберете област ({{zoom}}+)',
    closeShape: 'Затворете фигурата, за да изберете област',
    selectedArea: 'Избрана област: {{area}}',
  },
  language: {
    label: 'Език',
    placeholder: 'Език или код',
    noResults: 'Не е намерен език.',
  },
  notFound: {
    heading: 'Страницата не е намерена',
    backToMap: 'Обратно към картата',
  },
} satisfies PartialTranslation
