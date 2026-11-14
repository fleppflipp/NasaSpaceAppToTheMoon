import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Ukubuka', map: 'Imephu', calendar: 'Ikhalenda' },
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
  calendar: { label: 'Ukubuka ikhalenda' },
  notFound: { heading: 'Ikhasi alitholakalanga', backToMap: 'Buyela kumephu' },
  pageTitles: {
    map: 'Imephu',
    calendar: 'Ikhalenda',
    notFound: 'Ikhasi alitholakalanga',
  },
} satisfies PartialTranslation
