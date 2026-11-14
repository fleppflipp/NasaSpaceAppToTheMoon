import type { PartialTranslation } from './eng'

export default {
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
  notFound: { heading: 'Саҳифа ёфт нашуд', backToMap: 'Бозгашт ба харита' },
} satisfies PartialTranslation
