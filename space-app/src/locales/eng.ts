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
  calendar: { label: 'Calendar view' },
  notFound: { heading: 'Page not found', backToMap: 'Back to map' },
  pageTitles: { map: 'Map', calendar: 'Calendar', notFound: 'Page not found' },
} as const
export type Translation = {
  [K in keyof typeof eng]: { [P in keyof (typeof eng)[K]]: string }
}
