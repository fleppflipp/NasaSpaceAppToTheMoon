import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Zobrazení', map: 'Mapa', calendar: 'Kalendář' },
  search: {
    label: 'Hledat místo',
    button: 'Hledat',
    noResults: 'Místo nenalezeno.',
    error: 'Hledání se nezdařilo. Zkuste to znovu.',
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Přiblížit',
    zoomOut: 'Oddálit',
    attribution: 'Zobrazit nebo skrýt zdroje',
    feedback: 'Zpětná vazba k mapě',
  },
  draw: {
    draw: 'Nakreslit oblast',
    cancel: 'Zrušit kreslení',
    remove: 'Odebrat výběr',
    zoomHint: 'Přibližte pro výběr oblasti',
    zoomHintTitle: 'Přibližte pro výběr oblasti ({{zoom}}+)',
    closeShape: 'Uzavřete tvar pro výběr oblasti',
    selectedArea: 'Vybraná oblast: {{area}}',
  },
  language: {
    label: 'Jazyk',
    placeholder: 'Jazyk nebo kód',
    noResults: 'Jazyk nenalezen.',
  },
  calendar: { label: 'Zobrazení kalendáře' },
  notFound: { heading: 'Stránka nenalezena', backToMap: 'Zpět na mapu' },
  pageTitles: {
    map: 'Mapa',
    calendar: 'Kalendář',
    notFound: 'Stránka nenalezena',
  },
} satisfies PartialTranslation
