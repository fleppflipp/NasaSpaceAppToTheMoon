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
    noData: 'Nu există încă date despre incendii.',
    unavailable:
      'Datele despre incendii nu pot fi încărcate. Rulează serverul de tile-uri?',
  },
  timeline: {
    label: 'Perioadă',
    month: 'Luna',
    loading: 'Se încarcă lunile…',
    empty: 'Nicio lună cu date despre incendii',
  },
  calendar: {
    label: 'Vizualizare calendar',
    close: 'Închide calendarul',
    chooseDay: 'Selectează o zi pentru a afișa incendiile pe hartă.',
    previousMonth: 'Luna precedentă',
    nextMonth: 'Luna următoare',
    showMonth: 'Afișează întreaga lună',
    dailyHint:
      'Vizualizarea zilnică afișează doar punctele de incendiu. Afișează întreaga lună pentru zonele de incendiu combinate.',
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
