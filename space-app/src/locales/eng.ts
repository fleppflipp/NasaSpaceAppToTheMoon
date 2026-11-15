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
  cause: {
    heading: 'Fires in the selected area',
    loadingFires: 'Looking for fires…',
    noFires: 'No fires in this area during the selected week.',
    fires: 'Fires',
    dates: 'Dates',
    totalFrp: 'Total fire power',
    maxFrp: 'Strongest fire',
    frp: '{{value}} MW',
    near: 'Near {{place}}',
    placeInCountry: '{{place}}, {{country}}',
    photoAlt: 'Photo from the news report: {{title}}',
    photoCredit: 'Photo:',
    photoNote:
      'From a news report that matches this place and year; it may show a nearby fire.',
    find: 'Find likely cause',
    finding: 'Checking maps and the web. This can take up to a minute.',
    likelyCause: 'Likely cause',
    confidence: 'Confidence: {{level}}',
    why: 'Why',
    sources: 'Web sources',
    matched: 'Matched: {{phrases}}',
    original: 'Original text',
    translated: 'Translated to English automatically.',
    disclaimer:
      'An estimate from keyword rules, land use and season. Check the sources before relying on it.',
    retry: 'Try again',
  },
  causeCategory: {
    agricultural: 'Field or stubble burning',
    vegetation: 'Grass or vegetation fire',
    landfill: 'Landfill or waste fire',
    wildfire: 'Forest fire or wildfire',
    arson: 'Arson',
    lightning: 'Lightning',
    industrial: 'Industrial fire',
    unknown: 'Unknown',
  },
  causeConfidence: {
    high: 'high',
    medium: 'medium',
    low: 'low',
    none: 'none',
  },
  causeLand: {
    landfill: 'a landfill',
    farmland: 'farmland',
    grassland: 'grassland or scrub',
    wetland: 'wetland',
    forest: 'forest',
    industrial: 'an industrial site',
    airport: 'an airport',
    residential: 'a built-up area',
  },
  causeReason: {
    webSources: 'Web reports that support it: {{count}}.',
    noWebReports: 'No news or web reports were found about these fires.',
    landInside:
      'In {{land}}: {{fires}} of the {{checked}} strongest fires (OpenStreetMap).',
    landNear:
      'Within 1 km of {{fires}} of the {{checked}} strongest fires: {{land}} (OpenStreetMap).',
    season: 'The fires burned in {{months}}, when fields are often burned.',
    recurring: 'Fires also burned at the same spots in {{years}}.',
    smallFires:
      'The strongest fire was {{frp}}, which is small for a wildfire.',
    largeFires: 'The strongest fire was {{frp}}, as strong as a wildfire.',
    tie: '{{first}} and {{second}} are about equally likely.',
  },
  causeWarning: {
    placesUnavailable: 'Place names could not be looked up.',
    landUseUnavailable:
      'Land use could not be checked (OpenStreetMap did not answer).',
    searchUnavailable: 'The web search did not answer.',
    searchSkipped: 'No place names were found to search the web with.',
    translationUnavailable:
      'Translation was unavailable, so results in other languages could not be read.',
  },
  causeError: {
    invalidArea: 'This area cannot be checked. Draw it again.',
    areaTooLarge:
      'The area is too large. Draw a smaller one (up to 25,000 km²).',
    invalidDates: 'This period cannot be checked.',
    unreachable: 'The fire cause service cannot be reached. Is it running?',
    badAnswer: 'The fire cause service gave an unexpected answer.',
    fireDataUnavailable:
      'The fire data could not be loaded from the tile server. Is it reachable?',
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
