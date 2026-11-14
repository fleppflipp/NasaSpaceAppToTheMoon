import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Vaade', map: 'Kaart', calendar: 'Kalender' },
  search: {
    label: 'Otsi kohta',
    button: 'Otsi',
    noResults: 'Kohta ei leitud.',
    error: 'Otsing ebaõnnestus. Proovi uuesti.',
  },
  map: {
    title: 'Kaart',
    zoomIn: 'Suurenda',
    zoomOut: 'Vähenda',
    attribution: 'Kuva või peida viited',
    feedback: 'Tagasiside kaardi kohta',
  },
  draw: {
    draw: 'Joonista ala',
    cancel: 'Tühista joonistamine',
    remove: 'Eemalda valik',
    zoomHint: 'Suurenda ala valimiseks',
    zoomHintTitle: 'Suurenda ala valimiseks ({{zoom}}+)',
    closeShape: 'Sulge kuju ala valimiseks',
    selectedArea: 'Valitud ala: {{area}}',
  },
  language: {
    label: 'Keel',
    placeholder: 'Keel või kood',
    noResults: 'Keelt ei leitud.',
  },
  calendar: { label: 'Kalendrivaade' },
  notFound: { heading: 'Lehte ei leitud', backToMap: 'Tagasi kaardile' },
  pageTitles: {
    map: 'Kaart',
    calendar: 'Kalender',
    notFound: 'Lehte ei leitud',
  },
} satisfies PartialTranslation
