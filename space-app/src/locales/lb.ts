import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Usiicht', map: 'Kaart', calendar: 'Kalenner' },
  search: {
    label: 'Eng Plaz sichen',
    button: 'Sichen',
    noResults: 'Keng Plaz fonnt.',
    error: "D'Sich ass feelgeschloen. Probéier nach eng Kéier.",
  },
  map: {
    title: 'Kaart',
    zoomIn: 'Zoomen',
    zoomOut: 'Auszoomen',
    attribution: 'Quellen un- oder ausblenden',
    feedback: 'Feedback zur Kaart',
  },
  draw: {
    draw: 'E Gebitt zeechnen',
    cancel: 'Zeechne ofbriechen',
    remove: 'Auswiel ewechhuelen',
    zoomHint: 'Zoom eran fir e Gebitt auszewielen',
    zoomHintTitle: 'Zoom eran fir e Gebitt auszewielen ({{zoom}}+)',
    closeShape: "Maach d'Form zou fir e Gebitt auszewielen",
    selectedArea: 'Ausgewielt Gebitt: {{area}}',
  },
  language: {
    label: 'Sprooch',
    placeholder: 'Sprooch oder Code',
    noResults: 'Keng Sprooch fonnt.',
  },
  calendar: { label: 'Kalennerusiicht' },
  notFound: { heading: 'Säit net fonnt', backToMap: 'Zréck zur Kaart' },
  pageTitles: {
    map: 'Kaart',
    calendar: 'Kalenner',
    notFound: 'Säit net fonnt',
  },
} satisfies PartialTranslation
