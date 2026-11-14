import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Nemo wuri',
    button: 'Bincika',
    noResults: 'Ba a sami wuri ba.',
    error: 'Binciken ya gaza. Da fatan za a sake gwadawa.',
  },
  map: {
    title: 'Taswira',
    zoomIn: 'Kara girma',
    zoomOut: 'Rage girma',
    attribution: 'Nuna ko ɓoye tushe',
    feedback: "Ra'ayi game da taswira",
  },
  draw: {
    draw: 'Zana yanki',
    cancel: 'Soke zanawa',
    remove: 'Cire zaɓi',
    zoomHint: 'Kara girma don zaɓar yanki',
    zoomHintTitle: 'Kara girma don zaɓar yanki ({{zoom}}+)',
    closeShape: 'Rufe siffar don zaɓar yanki',
    selectedArea: 'Yankin da aka zaɓa: {{area}}',
  },
  language: {
    label: 'Harshe',
    placeholder: 'Harshe ko lamba',
    noResults: 'Ba a sami harshe ba.',
  },
  notFound: { heading: 'Ba a sami shafi ba', backToMap: 'Koma taswira' },
} satisfies PartialTranslation
