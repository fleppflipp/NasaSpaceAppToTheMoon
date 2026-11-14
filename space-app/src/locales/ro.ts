import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Vizualizare', map: 'Hartă', calendar: 'Calendar' },
  search: {
    label: 'Caută un loc',
    button: 'Caută',
    noResults: 'Nu s-a găsit niciun loc.',
    error: 'Căutarea a eșuat. Încearcă din nou.',
  },
  map: {
    title: 'Hartă',
    zoomIn: 'Mărește',
    zoomOut: 'Micșorează',
    attribution: 'Comută atribuirea',
    feedback: 'Feedback despre hartă',
  },
  draw: {
    draw: 'Desenează o zonă',
    cancel: 'Anulează desenul',
    remove: 'Elimină selecția',
    zoomHint: 'Apropie harta pentru a selecta o zonă',
    zoomHintTitle:
      'Apropie harta pentru a selecta o zonă (nivel de zoom {{zoom}} sau mai mare)',
    closeShape: 'Închide forma pentru a selecta o zonă',
    selectedArea: 'Zonă selectată: {{area}}',
  },
  language: {
    label: 'Limbă',
    placeholder: 'Limbă sau cod',
    noResults: 'Nicio limbă găsită.',
  },
  fires: {
    noData: 'Nu există încă date despre incendii pentru această perioadă.',
  },
  timeline: {
    label: 'Perioadă',
    year: 'An',
    week: 'Săptămâna',
    range: '{{start}} – {{end}}',
  },
  calendar: {
    label: 'Vizualizare calendar',
    close: 'Închide calendarul',
    chooseDay: 'Selectează o zi pentru a afișa incendiile pe hartă.',
    previousMonth: 'Luna precedentă',
    nextMonth: 'Luna următoare',
    showWeek: 'Afișează întreaga săptămână',
    dailyHint:
      'Vizualizarea zilnică afișează punctele de incendiu. Folosește glisorul de sus pentru a reveni la zonele săptămânale.',
  },
  notFound: {
    heading: 'Pagina nu a fost găsită',
    backToMap: 'Înapoi la hartă',
  },
  pageTitles: {
    map: 'Hartă',
    calendar: 'Calendar',
    notFound: 'Pagina nu a fost găsită',
  },
} satisfies PartialTranslation
