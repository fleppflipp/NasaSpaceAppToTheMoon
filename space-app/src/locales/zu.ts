import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Sesha indawo',
    button: 'Sesha',
    noResults: 'Ayikho indawo etholakele.',
    error: 'Ukusesha kuhlulekile. Sicela uzame futhi.',
  },
  map: {
    title: 'Imephu',
    zoomIn: 'Sondeza',
    zoomOut: 'Hlehlisa',
    attribution: 'Bonisa noma fihla imithombo',
    feedback: 'Impendulo ngemephu',
  },
  draw: {
    draw: 'Dweba indawo',
    cancel: 'Khansela ukudweba',
    remove: 'Susa ukukhetha',
    zoomHint: 'Sondeza ukuze ukhethe indawo',
    zoomHintTitle: 'Sondeza ukuze ukhethe indawo ({{zoom}}+)',
    closeShape: 'Vala isimo ukuze ukhethe indawo',
    selectedArea: 'Indawo ekhethiwe: {{area}}',
  },
  language: {
    label: 'Ulimi',
    placeholder: 'Ulimi noma ikhodi',
    noResults: 'Alukho ulimi olutholakele.',
  },
  notFound: { heading: 'Ikhasi alitholakalanga', backToMap: 'Buyela kumephu' },
} satisfies PartialTranslation
