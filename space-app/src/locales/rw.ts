import type { PartialTranslation } from './eng'

export default {
  navigation: {
    label: 'Uko bigaragara',
    map: 'Ikarita',
    calendar: 'Kalendari',
  },
  search: {
    label: 'Shakisha ahantu',
    button: 'Shakisha',
    noResults: 'Nta hantu habonetse.',
    error: 'Gushakisha byanze. Ongera ugerageze.',
  },
  map: {
    title: 'Ikarita',
    zoomIn: 'Kuzamura',
    zoomOut: 'Kugabanya',
    attribution: 'Erekana cyangwa uhishe inkomoko',
    feedback: 'Ibitekerezo ku ikarita',
  },
  draw: {
    draw: 'Shushanya agace',
    cancel: 'Reka gushushanya',
    remove: 'Kuraho igisubizo',
    zoomHint: 'Zamura kugira ngo uhitemo agace',
    zoomHintTitle: 'Zamura kugira ngo uhitemo agace ({{zoom}}+)',
    closeShape: 'Funga ishusho kugira ngo uhitemo agace',
    selectedArea: 'Agace gahiswemo: {{area}}',
  },
  language: {
    label: 'Ururimi',
    placeholder: 'Ururimi cyangwa kode',
    noResults: 'Nta rurimi rwabonetse.',
  },
  calendar: { label: 'Uko kalendari igaragara' },
  notFound: {
    heading: 'Urupapuro ntirwabonetse',
    backToMap: 'Subira ku ikarita',
  },
  pageTitles: {
    map: 'Ikarita',
    calendar: 'Kalendari',
    notFound: 'Urupapuro ntirwabonetse',
  },
} satisfies PartialTranslation
