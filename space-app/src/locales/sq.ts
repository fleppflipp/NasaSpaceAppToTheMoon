import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Pamja', map: 'Harta', calendar: 'Kalendari' },
  search: {
    label: 'Kërko një vend',
    button: 'Kërko',
    noResults: 'Nuk u gjet asnjë vend.',
    error: 'Kërkimi dështoi. Provo përsëri.',
  },
  map: {
    title: 'Harta',
    zoomIn: 'Zmadho',
    zoomOut: 'Zvogëlo',
    attribution: 'Shfaq ose fshih atribuimin',
    feedback: 'Komente për hartën',
  },
  draw: {
    draw: 'Vizato një zonë',
    cancel: 'Anulo vizatimin',
    remove: 'Hiq përzgjedhjen',
    zoomHint: 'Zmadho për të zgjedhur një zonë',
    zoomHintTitle: 'Zmadho për të zgjedhur një zonë ({{zoom}}+)',
    closeShape: 'Mbylle formën për të zgjedhur një zonë',
    selectedArea: 'Zona e zgjedhur: {{area}}',
  },
  language: {
    label: 'Gjuha',
    placeholder: 'Gjuha ose kodi',
    noResults: 'Nuk u gjet asnjë gjuhë.',
  },
  calendar: { label: 'Pamja e kalendarit' },
  notFound: { heading: 'Faqja nuk u gjet', backToMap: 'Kthehu te harta' },
  pageTitles: {
    map: 'Harta',
    calendar: 'Kalendari',
    notFound: 'Faqja nuk u gjet',
  },
} satisfies PartialTranslation
