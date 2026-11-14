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
  calendar: { label: 'Calendar view' },
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
