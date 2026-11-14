import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'کتنه', map: 'نقشه', calendar: 'کلیز' },
  search: {
    label: 'یو ځای ولټوئ',
    button: 'لټون',
    noResults: 'هیڅ ځای ونه موندل شو.',
    error: 'لټون ناکام شو. بیا هڅه وکړئ.',
  },
  map: {
    title: 'نقشه',
    zoomIn: 'لوی کول',
    zoomOut: 'کوچنی کول',
    attribution: 'سرچینې ښکاره یا پټې کړئ',
    feedback: 'د نقشې په اړه نظر',
  },
  draw: {
    draw: 'یو سیمه رسم کړئ',
    cancel: 'رسم لغوه کړئ',
    remove: 'انتخاب لرې کړئ',
    zoomHint: 'د سیمې د ټاکلو لپاره لوی کړئ',
    zoomHintTitle: 'د سیمې د ټاکلو لپاره لوی کړئ ({{zoom}}+)',
    closeShape: 'د سیمې د ټاکلو لپاره شکل وتړئ',
    selectedArea: 'ټاکل شوې سیمه: {{area}}',
  },
  language: {
    label: 'ژبه',
    placeholder: 'ژبه یا کوډ',
    noResults: 'هیڅ ژبه ونه موندل شوه.',
  },
  calendar: { label: 'د کلیز کتنه' },
  notFound: { heading: 'پاڼه ونه موندل شوه', backToMap: 'نقشې ته بیرته' },
  pageTitles: { map: 'نقشه', calendar: 'کلیز', notFound: 'پاڼه ونه موندل شوه' },
} satisfies PartialTranslation
