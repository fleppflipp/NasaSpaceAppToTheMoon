import type { PartialTranslation } from './eng'

export default {
  search: {
    label: "Su'e se mea",
    button: "Su'e",
    noResults: 'Leai se mea na maua.',
    error: "Na le manuia le su'esu'ega. Fa'amolemole toe taumafai.",
  },
  map: {
    title: "Fa'afanua",
    zoomIn: "Fa'alautele",
    zoomOut: "Fa'aitiiti",
    attribution: "Fa'aali pe fa'amau punaoa",
    feedback: "Manatu e uiga i le fa'afanua",
  },
  draw: {
    draw: 'Tusi se vaega',
    cancel: "Fa'aleaga le tusiga",
    remove: 'Aveese le filifilia',
    zoomHint: "Fa'alautele e filifili se vaega",
    zoomHintTitle: "Fa'alautele e filifili se vaega ({{zoom}}+)",
    closeShape: "Tapuni le fa'ata e filifili se vaega",
    selectedArea: 'Vaega na filifilia: {{area}}',
  },
  language: {
    label: 'Gagana',
    placeholder: "Gagana po'o le kōta",
    noResults: 'Leai se gagana na maua.',
  },
  notFound: { heading: 'Leai se itulau', backToMap: "Toe foi i le fa'afanua" },
} satisfies PartialTranslation
