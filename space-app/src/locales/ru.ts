import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Найти место',
    button: 'Найти',
    noResults: 'Место не найдено.',
    error: 'Поиск не удался. Попробуйте ещё раз.',
  },
  map: {
    title: 'Карта',
    zoomIn: 'Приблизить',
    zoomOut: 'Отдалить',
    attribution: 'Показать или скрыть источники',
    feedback: 'Отзыв о карте',
  },
  draw: {
    draw: 'Нарисовать область',
    cancel: 'Отменить рисование',
    remove: 'Убрать выделение',
    zoomHint: 'Приблизьте карту, чтобы выбрать область',
    zoomHintTitle: 'Приблизьте карту, чтобы выбрать область ({{zoom}}+)',
    closeShape: 'Замкните фигуру, чтобы выбрать область',
    selectedArea: 'Выбранная область: {{area}}',
  },
  language: {
    label: 'Язык',
    placeholder: 'Язык или код',
    noResults: 'Язык не найден.',
  },
  notFound: { heading: 'Страница не найдена', backToMap: 'Назад к карте' },
} satisfies PartialTranslation
