import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Szukaj miejsca',
    button: 'Szukaj',
    noResults: 'Nie znaleziono miejsca.',
    error: 'Wyszukiwanie nie powiodło się. Spróbuj ponownie.',
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Powiększ',
    zoomOut: 'Pomniejsz',
    attribution: 'Pokaż lub ukryj źródła',
    feedback: 'Opinie o mapie',
  },
  draw: {
    draw: 'Narysuj obszar',
    cancel: 'Anuluj rysowanie',
    remove: 'Usuń zaznaczenie',
    zoomHint: 'Przybliż, aby zaznaczyć obszar',
    zoomHintTitle: 'Przybliż, aby zaznaczyć obszar ({{zoom}}+)',
    closeShape: 'Zamknij kształt, aby zaznaczyć obszar',
    selectedArea: 'Zaznaczony obszar: {{area}}',
  },
  language: {
    label: 'Język',
    placeholder: 'Język lub kod',
    noResults: 'Nie znaleziono języka.',
  },
  notFound: { heading: 'Nie znaleziono strony', backToMap: 'Wróć do mapy' },
} satisfies PartialTranslation
