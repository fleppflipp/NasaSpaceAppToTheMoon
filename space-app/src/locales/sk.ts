import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Zobrazenie', map: 'Mapa', calendar: 'Kalendár' },
  search: {
    label: 'Hľadať miesto',
    button: 'Hľadať',
    noResults: 'Miesto sa nenašlo.',
    error: 'Hľadanie zlyhalo. Skúste to znova.',
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Priblížiť',
    zoomOut: 'Oddialiť',
    attribution: 'Zobraziť alebo skryť zdroje',
    feedback: 'Spätná väzba k mape',
  },
  draw: {
    draw: 'Nakresliť oblasť',
    cancel: 'Zrušiť kreslenie',
    remove: 'Odstrániť výber',
    zoomHint: 'Priblížte na výber oblasti',
    zoomHintTitle: 'Priblížte na výber oblasti ({{zoom}}+)',
    closeShape: 'Uzavrite tvar na výber oblasti',
    selectedArea: 'Vybraná oblasť: {{area}}',
  },
  language: {
    label: 'Jazyk',
    placeholder: 'Jazyk alebo kód',
    noResults: 'Jazyk sa nenašiel.',
  },
  calendar: { label: 'Zobrazenie kalendára' },
  notFound: { heading: 'Stránka sa nenašla', backToMap: 'Späť na mapu' },
  pageTitles: {
    map: 'Mapa',
    calendar: 'Kalendár',
    notFound: 'Stránka sa nenašla',
  },
} satisfies PartialTranslation
