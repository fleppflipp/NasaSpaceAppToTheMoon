import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Mawonedwe', map: 'Mapu', calendar: 'Kalendala' },
  search: {
    label: 'Fufuzani malo',
    button: 'Fufuzani',
    noResults: 'Palibe malo opezeka.',
    error: 'Kusaka kwalephera. Chonde yesaninso.',
  },
  map: {
    title: 'Mapu',
    zoomIn: 'Wonjezerani',
    zoomOut: 'Chepetsani',
    attribution: 'Onetsani kapena bisani magwero',
    feedback: 'Ndemanga za mapu',
  },
  draw: {
    draw: 'Jambulani dera',
    cancel: 'Siyani kujambula',
    remove: 'Chotsani chosankhidwa',
    zoomHint: 'Wonjezerani kuti musankhe dera',
    zoomHintTitle: 'Wonjezerani kuti musankhe dera ({{zoom}}+)',
    closeShape: 'Tsekani mawonekedwe kuti musankhe dera',
    selectedArea: 'Dera losankhidwa: {{area}}',
  },
  language: {
    label: 'Chinenero',
    placeholder: 'Chinenero kapena khodi',
    noResults: 'Palibe chinenero chopezeka.',
  },
  calendar: { label: 'Mawonedwe a kalendala' },
  notFound: { heading: 'Tsamba silinapezeke', backToMap: 'Bwererani ku mapu' },
  pageTitles: {
    map: 'Mapu',
    calendar: 'Kalendala',
    notFound: 'Tsamba silinapezeke',
  },
} satisfies PartialTranslation
