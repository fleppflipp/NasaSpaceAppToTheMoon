import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Khangela indawo',
    button: 'Khangela',
    noResults: 'Akukho ndawo ifunyenweyo.',
    error: 'Uphando aluphumelelanga. Nceda uzame kwakhona.',
  },
  map: {
    title: 'Imap',
    zoomIn: 'Landa',
    zoomOut: 'Phinda',
    attribution: 'Bonisa okanye fihla imithombo',
    feedback: 'Uluvo ngemap',
  },
  draw: {
    draw: 'Zoba indawo',
    cancel: 'Rhoxisa ukuzoba',
    remove: 'Susa ukhetho',
    zoomHint: 'Landa ukuze ukhethe indawo',
    zoomHintTitle: 'Landa ukuze ukhethe indawo ({{zoom}}+)',
    closeShape: 'Vala imo ukuze ukhethe indawo',
    selectedArea: 'Indawo ekhethiweyo: {{area}}',
  },
  language: {
    label: 'Ulwimi',
    placeholder: 'Ulwimi okanye ikhowudi',
    noResults: 'Akukho lwimi lufunyenweyo.',
  },
  notFound: { heading: 'Iphepha alifunyenwanga', backToMap: 'Buyela kwimap' },
} satisfies PartialTranslation
