import type { PartialTranslation } from './eng'

export default {
  search: {
    label: "Soek 'n plek",
    button: 'Soek',
    noResults: 'Geen plek gevind nie.',
    error: 'Soektog het misluk. Probeer asseblief weer.',
  },
  map: {
    title: 'Kaart',
    zoomIn: 'Zoem in',
    zoomOut: 'Zoem uit',
    attribution: 'Wys of versteek bronvermelding',
    feedback: 'Terugvoer oor die kaart',
  },
  draw: {
    draw: "Teken 'n gebied",
    cancel: 'Kanselleer tekening',
    remove: 'Verwyder keuse',
    zoomHint: "Zoem in om 'n gebied te kies",
    zoomHintTitle: "Zoem in om 'n gebied te kies ({{zoom}}+)",
    closeShape: "Sluit die vorm om 'n gebied te kies",
    selectedArea: 'Gekose gebied: {{area}}',
  },
  language: {
    label: 'Taal',
    placeholder: 'Taal of kode',
    noResults: 'Geen taal gevind nie.',
  },
  notFound: {
    heading: 'Bladsy nie gevind nie',
    backToMap: 'Terug na die kaart',
  },
} satisfies PartialTranslation
