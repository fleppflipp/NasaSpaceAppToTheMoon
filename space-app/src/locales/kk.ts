import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Орынды іздеу',
    button: 'Іздеу',
    noResults: 'Орын табылмады.',
    error: 'Іздеу сәтсіз аяқталды. Қайталап көріңіз.',
  },
  map: {
    title: 'Карта',
    zoomIn: 'Жақындату',
    zoomOut: 'Алыстату',
    attribution: 'Дереккөздерді көрсету немесе жасыру',
    feedback: 'Карта туралы пікір',
  },
  draw: {
    draw: 'Аймақ сызу',
    cancel: 'Сызуды болдырмау',
    remove: 'Таңдауды жою',
    zoomHint: 'Аймақты таңдау үшін жақындатыңыз',
    zoomHintTitle: 'Аймақты таңдау үшін жақындатыңыз ({{zoom}}+)',
    closeShape: 'Аймақты таңдау үшін пішінді жабыңыз',
    selectedArea: 'Таңдалған аймақ: {{area}}',
  },
  language: {
    label: 'Тіл',
    placeholder: 'Тіл немесе код',
    noResults: 'Тіл табылмады.',
  },
  notFound: { heading: 'Бет табылмады', backToMap: 'Картаға оралу' },
} satisfies PartialTranslation
