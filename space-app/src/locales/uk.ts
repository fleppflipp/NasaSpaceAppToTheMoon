import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Вигляд', map: 'Карта', calendar: 'Календар' },
  search: {
    label: 'Шукати місце',
    button: 'Шукати',
    noResults: 'Місце не знайдено.',
    error: 'Пошук не вдався. Спробуйте ще раз.',
  },
  map: {
    title: 'Карта',
    zoomIn: 'Збільшити',
    zoomOut: 'Зменшити',
    attribution: 'Показати або сховати джерела',
    feedback: 'Відгук про карту',
  },
  draw: {
    draw: 'Намалювати область',
    cancel: 'Скасувати малювання',
    remove: 'Прибрати вибір',
    zoomHint: 'Наблизьте, щоб вибрати область',
    zoomHintTitle: 'Наблизьте, щоб вибрати область ({{zoom}}+)',
    closeShape: 'Замкніть фігуру, щоб вибрати область',
    selectedArea: 'Вибрана область: {{area}}',
  },
  language: {
    label: 'Мова',
    placeholder: 'Мова або код',
    noResults: 'Мову не знайдено.',
  },
  calendar: { label: 'Вигляд календаря' },
  notFound: { heading: 'Сторінку не знайдено', backToMap: 'Назад до карти' },
  pageTitles: {
    map: 'Карта',
    calendar: 'Календар',
    notFound: 'Сторінку не знайдено',
  },
} satisfies PartialTranslation
