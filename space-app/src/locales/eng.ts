export const eng = {
  navigation: { label: 'View', map: 'Map', calendar: 'Calendar' },
  search: {
    label: 'Search for a place',
    button: 'Search',
    noResults: 'No place found.',
    error: 'Search failed. Please try again.',
  },
  map: {
    title: 'Map',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    attribution: 'Toggle attribution',
    feedback: 'Map feedback',
  },
  draw: {
    draw: 'Draw an area',
    cancel: 'Cancel drawing',
    remove: 'Remove selection',
    zoomHint: 'Zoom in to select an area',
    zoomHintTitle: 'Zoom in to select an area (zoom {{zoom}} or closer)',
    closeShape: 'Close the shape to select an area',
    selectedArea: 'Selected area: {{area}}',
  },
  language: {
    label: 'Language',
    placeholder: 'Language or code',
    noResults: 'No language found.',
  },
  fires: { noData: 'No fire data for this period yet.' },
  timeline: {
    label: 'Time period',
    year: 'Year',
    week: 'Week',
    range: '{{start}} – {{end}}',
  },
  calendar: {
    label: 'Calendar view',
    close: 'Close calendar',
    chooseDay: 'Select a day to show its fires on the map.',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    showWeek: 'Show the whole week',
    dailyHint:
      'Daily view shows fire points. Move the top slider to return to weekly areas.',
  },
  notFound: { heading: 'Page not found', backToMap: 'Back to map' },
  pageTitles: { map: 'Map', calendar: 'Calendar', notFound: 'Page not found' },
} as const
export type Translation = {
  [K in keyof typeof eng]: { [P in keyof (typeof eng)[K]]: string }
}
/** A dictionary that may leave keys out: they fall back to English. */
export type PartialTranslation = {
  [K in keyof Translation]?: Partial<Translation[K]>
}
