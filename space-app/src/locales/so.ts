import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Muuqaal', map: 'Khariidad', calendar: 'Jadwal' },
  search: {
    label: 'Raadi meel',
    button: 'Raadi',
    noResults: 'Meel lama helin.',
    error: 'Raadintu way guuldareysatay. Fadlan mar kale isku day.',
  },
  map: {
    title: 'Khariidad',
    zoomIn: 'Weyneey',
    zoomOut: 'Yaree',
    attribution: 'Muuji ama qari ilaha',
    feedback: 'Jawaab celin khariidadda ku saabsan',
  },
  draw: {
    draw: 'Sawir aag',
    cancel: 'Ka noqo sawirka',
    remove: 'Ka saar doorashada',
    zoomHint: 'Weyneey si aad aag u doorato',
    zoomHintTitle: 'Weyneey si aad aag u doorato ({{zoom}}+)',
    closeShape: 'Xidh qaabka si aad aag u doorato',
    selectedArea: 'Aagga la doortay: {{area}}',
  },
  language: {
    label: 'Luqad',
    placeholder: 'Luqad ama koodh',
    noResults: 'Luqad lama helin.',
  },
  calendar: { label: 'Muuqaalka jadwalka' },
  notFound: { heading: 'Bogga lama helin', backToMap: 'Ku noqo khariidadda' },
  pageTitles: {
    map: 'Khariidad',
    calendar: 'Jadwal',
    notFound: 'Bogga lama helin',
  },
} satisfies PartialTranslation
