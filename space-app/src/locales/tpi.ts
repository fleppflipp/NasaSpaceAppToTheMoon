import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Lukluk', map: 'Map', calendar: 'Kalenda' },
  search: {
    label: 'Painim wanpela ples',
    button: 'Painim',
    noResults: 'I no gat wanpela ples i kamap.',
    error: 'Painim i no wok. Plis traim gen.',
  },
  map: {
    title: 'Map',
    zoomIn: 'Mekim bikpela',
    zoomOut: 'Mekim liklik',
    attribution: 'Soim o haitim ol sors',
    feedback: 'Tingting long map',
  },
  draw: {
    draw: 'Droim wanpela hap',
    cancel: 'Lusim droim',
    remove: 'Rausim pik',
    zoomHint: 'Mekim bikpela long pikim wanpela hap',
    zoomHintTitle: 'Mekim bikpela long pikim wanpela hap ({{zoom}}+)',
    closeShape: 'Pasim piksa long pikim wanpela hap',
    selectedArea: 'Hap yu pikim: {{area}}',
  },
  language: {
    label: 'Tok ples',
    placeholder: 'Tok ples o kod',
    noResults: 'I no gat wanpela tok ples i kamap.',
  },
  calendar: { label: 'Kalenda lukluk' },
  notFound: { heading: 'I no painim pes', backToMap: 'Go bek long map' },
  pageTitles: { map: 'Map', calendar: 'Kalenda', notFound: 'I no painim pes' },
} satisfies PartialTranslation
