import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Prikaz', map: 'Karta', calendar: 'Kalendar' },
  search: {
    label: 'Traži mjesto',
    button: 'Traži',
    noResults: 'Mjesto nije pronađeno.',
    error: 'Pretraga nije uspjela. Pokušajte ponovo.',
  },
  map: {
    title: 'Karta',
    zoomIn: 'Uvećaj',
    zoomOut: 'Smanji',
    attribution: 'Prikaži ili sakrij izvore',
    feedback: 'Povratne informacije o karti',
  },
  draw: {
    draw: 'Nacrtaj područje',
    cancel: 'Otkaži crtanje',
    remove: 'Ukloni odabir',
    zoomHint: 'Uvećajte za odabir područja',
    zoomHintTitle: 'Uvećajte za odabir područja ({{zoom}}+)',
    closeShape: 'Zatvorite oblik za odabir područja',
    selectedArea: 'Odabrano područje: {{area}}',
  },
  language: {
    label: 'Jezik',
    placeholder: 'Jezik ili kod',
    noResults: 'Jezik nije pronađen.',
  },
  calendar: { label: 'Prikaz kalendara' },
  notFound: { heading: 'Stranica nije pronađena', backToMap: 'Nazad na kartu' },
  pageTitles: {
    map: 'Karta',
    calendar: 'Kalendar',
    notFound: 'Stranica nije pronađena',
  },
} satisfies PartialTranslation
