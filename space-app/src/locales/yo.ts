import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Ìwòran', map: 'Àwòrán ilẹ̀', calendar: 'Kàlẹ́ńdà' },
  search: {
    label: 'Wá ibì kan',
    button: 'Wá',
    noResults: 'A kò rí ibì kankan.',
    error: 'Ìwádìí kùnà. Jọ̀wọ́ tún gbìyànjú.',
  },
  map: {
    title: 'Àwòrán ilẹ̀',
    zoomIn: 'Sún mọ́',
    zoomOut: 'Sún jìnnà',
    attribution: 'Fi hàn tàbí fi àwọn orísun pamọ́',
    feedback: 'Èsì nípa àwòrán ilẹ̀',
  },
  draw: {
    draw: 'Yàwòrán agbègbè',
    cancel: 'Fagilé yíyàwòrán',
    remove: 'Yọ àṣàyàn kúrò',
    zoomHint: 'Sún mọ́ láti yan agbègbè',
    zoomHintTitle: 'Sún mọ́ láti yan agbègbè ({{zoom}}+)',
    closeShape: 'Ti àwòrán náà láti yan agbègbè',
    selectedArea: 'Agbègbè tí a yàn: {{area}}',
  },
  language: {
    label: 'Èdè',
    placeholder: 'Èdè tàbí kóòdù',
    noResults: 'A kò rí èdè kankan.',
  },
  calendar: { label: 'Ìwòran kàlẹ́ńdà' },
  notFound: { heading: 'A kò rí ojú ìwé náà', backToMap: 'Padà sí àwòrán ilẹ̀' },
  pageTitles: {
    map: 'Àwòrán ilẹ̀',
    calendar: 'Kàlẹ́ńdà',
    notFound: 'A kò rí ojú ìwé náà',
  },
} satisfies PartialTranslation
