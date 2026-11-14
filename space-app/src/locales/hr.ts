import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Prikaz', map: 'Karta', calendar: 'Kalendar' },
  search: {
    label: 'Traži mjesto',
    button: 'Traži',
    noResults: 'Mjesto nije pronađeno.',
    error: 'Pretraga nije uspjela. Pokušajte ponovno.',
  },
  map: {
    title: 'Karta',
    zoomIn: 'Povećaj',
    zoomOut: 'Smanji',
    attribution: 'Prikaži ili sakrij izvore',
    feedback: 'Povratne informacije o karti',
  },
  draw: {
    draw: 'Nacrtaj područje',
    cancel: 'Odustani od crtanja',
    remove: 'Ukloni odabir',
    zoomHint: 'Povećajte za odabir područja',
    zoomHintTitle: 'Povećajte za odabir područja ({{zoom}}+)',
    closeShape: 'Zatvorite oblik za odabir područja',
    selectedArea: 'Odabrano područje: {{area}}',
  },
  language: {
    label: 'Jezik',
    placeholder: 'Jezik ili kod',
    noResults: 'Jezik nije pronađen.',
  },
  calendar: { label: 'Prikaz kalendara' },
  notFound: {
    heading: 'Stranica nije pronađena',
    backToMap: 'Natrag na kartu',
  },
  pageTitles: {
    map: 'Karta',
    calendar: 'Kalendar',
    notFound: 'Stranica nije pronađena',
  },
} satisfies PartialTranslation
