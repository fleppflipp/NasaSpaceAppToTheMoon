import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Ikigaragara', map: 'Ikarata', calendar: 'Kalendari' },
  search: {
    label: 'Raba ahantu',
    button: 'Raba',
    noResults: 'Nta hantu habonetse.',
    error: 'Gushakisha vyaranse. Ongera ugerageze.',
  },
  map: {
    title: 'Ikarata',
    zoomIn: 'Kwongera',
    zoomOut: 'Kugabanya',
    attribution: 'Garagaza canke uhishe amasoko',
    feedback: 'Ibitekerezo ku karata',
  },
  draw: {
    draw: 'Shushanya ikibanza',
    cancel: 'Hagarika gushushanya',
    remove: 'Kuraho ivyatoranijwe',
    zoomHint: 'Ongera kugira utore ikibanza',
    zoomHintTitle: 'Ongera kugira utore ikibanza ({{zoom}}+)',
    closeShape: 'Funga ishusho kugira utore ikibanza',
    selectedArea: 'Ikibanza catowe: {{area}}',
  },
  language: {
    label: 'Ururimi',
    placeholder: 'Ururimi canke kode',
    noResults: 'Nta rurimi rwabonetse.',
  },
  calendar: { label: 'Ikigaragara ca kalendari' },
  notFound: {
    heading: 'Urupapuro ntirwabonetse',
    backToMap: 'Subira ku karata',
  },
  pageTitles: {
    map: 'Ikarata',
    calendar: 'Kalendari',
    notFound: 'Urupapuro ntirwabonetse',
  },
} satisfies PartialTranslation
