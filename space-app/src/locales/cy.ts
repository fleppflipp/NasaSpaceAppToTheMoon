import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Golwg', map: 'Map', calendar: 'Calendr' },
  search: {
    label: 'Chwilio am le',
    button: 'Chwilio',
    noResults: 'Heb ddod o hyd i unrhyw le.',
    error: 'Methodd y chwiliad. Rhowch gynnig arall arni.',
  },
  map: {
    title: 'Map',
    zoomIn: 'Chwyddo i mewn',
    zoomOut: 'Chwyddo allan',
    attribution: 'Dangos neu guddio priodoliad',
    feedback: 'Adborth am y map',
  },
  draw: {
    draw: 'Tynnu llun ardal',
    cancel: 'Canslo tynnu llun',
    remove: "Dileu'r dewis",
    zoomHint: 'Chwyddo i mewn i ddewis ardal',
    zoomHintTitle: 'Chwyddo i mewn i ddewis ardal ({{zoom}}+)',
    closeShape: 'Caewch y siâp i ddewis ardal',
    selectedArea: 'Ardal a ddewiswyd: {{area}}',
  },
  language: {
    label: 'Iaith',
    placeholder: 'Iaith neu god',
    noResults: 'Heb ddod o hyd i iaith.',
  },
  calendar: { label: 'Golwg calendr' },
  notFound: {
    heading: "Heb ddod o hyd i'r dudalen",
    backToMap: "Yn ôl i'r map",
  },
  pageTitles: {
    map: 'Map',
    calendar: 'Calendr',
    notFound: "Heb ddod o hyd i'r dudalen",
  },
} satisfies PartialTranslation
