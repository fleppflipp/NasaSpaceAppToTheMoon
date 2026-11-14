import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Qhaway', map: 'Mapa', calendar: 'Killa qillqa' },
  search: {
    label: 'Maskay huk kuska',
    button: 'Maskay',
    noResults: 'Mana kuskachu tarikurqa.',
    error: 'Maskayqa mana allinchu karqa. Kutimanta ruwariy.',
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Hatunchay',
    zoomOut: "Huch'uyyachiy",
    attribution: 'Pukyukunata rikuchiy utaq pakay',
    feedback: 'Mapamanta rimanakuy',
  },
  draw: {
    draw: "Huk suyuta siq'iy",
    cancel: "Siq'iyta chinkachiy",
    remove: 'Akllasqata surquy',
    zoomHint: 'Suyuta akllanaykipaq hatunchay',
    zoomHintTitle: 'Suyuta akllanaykipaq hatunchay ({{zoom}}+)',
    closeShape: "Siq'itata wichqay suyuta akllanaykipaq",
    selectedArea: 'Akllasqa suyu: {{area}}',
  },
  language: {
    label: 'Simi',
    placeholder: 'Simi icha kuti',
    noResults: 'Mana simichu tarikurqa.',
  },
  calendar: { label: 'Killa qillqa qhaway' },
  notFound: { heading: "Mana p'anqachu tarikurqa", backToMap: 'Mapaman kutiy' },
  pageTitles: {
    map: 'Mapa',
    calendar: 'Killa qillqa',
    notFound: "Mana p'anqachu tarikurqa",
  },
} satisfies PartialTranslation
