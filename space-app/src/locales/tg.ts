import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Намоиш', map: 'Харита', calendar: 'Тақвим' },
  search: {
    label: 'Ҷойро ҷустуҷӯ кунед',
    button: 'Ҷустуҷӯ',
    noResults: 'Ҷой ёфт нашуд.',
    error: 'Ҷустуҷӯ номуваффақ шуд. Бори дигар кӯшиш кунед.',
  },
  map: {
    title: 'Харита',
    zoomIn: 'Калон кардан',
    zoomOut: 'Хурд кардан',
    attribution: 'Манбаъҳоро нишон диҳед ё пинҳон кунед',
    feedback: 'Фикру мулоҳиза дар бораи харита',
  },
  draw: {
    draw: 'Минтақаро кашед',
    cancel: 'Бекор кардани кашидан',
    remove: 'Интихобро нест кунед',
    zoomHint: 'Барои интихоби минтақа калон кунед',
    zoomHintTitle: 'Барои интихоби минтақа калон кунед ({{zoom}}+)',
    closeShape: 'Барои интихоби минтақа шаклро пӯшед',
    selectedArea: 'Минтақаи интихобшуда: {{area}}',
  },
  language: {
    label: 'Забон',
    placeholder: 'Забон ё код',
    noResults: 'Забон ёфт нашуд.',
  },
  calendar: { label: 'Намоиши тақвим' },
  notFound: { heading: 'Саҳифа ёфт нашуд', backToMap: 'Бозгашт ба харита' },
  pageTitles: {
    map: 'Харита',
    calendar: 'Тақвим',
    notFound: 'Саҳифа ёфт нашуд',
  },
} satisfies PartialTranslation
