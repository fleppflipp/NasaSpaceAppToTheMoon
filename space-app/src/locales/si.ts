import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'ස්ථානයක් සොයන්න',
    button: 'සොයන්න',
    noResults: 'කිසිදු ස්ථානයක් හමු නොවීය.',
    error: 'සෙවීම අසාර්ථක විය. නැවත උත්සාහ කරන්න.',
  },
  map: {
    title: 'සිතියම',
    zoomIn: 'විශාල කරන්න',
    zoomOut: 'කුඩා කරන්න',
    attribution: 'මූලාශ්‍ර පෙන්වන්න හෝ සඟවන්න',
    feedback: 'සිතියම පිළිබඳ ප්‍රතිපෝෂණ',
  },
  draw: {
    draw: 'ප්‍රදේශයක් අඳින්න',
    cancel: 'ඇඳීම අවලංගු කරන්න',
    remove: 'තේරීම ඉවත් කරන්න',
    zoomHint: 'ප්‍රදේශයක් තේරීමට විශාල කරන්න',
    zoomHintTitle: 'ප්‍රදේශයක් තේරීමට විශාල කරන්න ({{zoom}}+)',
    closeShape: 'ප්‍රදේශයක් තේරීමට හැඩය වසන්න',
    selectedArea: 'තෝරාගත් ප්‍රදේශය: {{area}}',
  },
  language: {
    label: 'භාෂාව',
    placeholder: 'භාෂාව හෝ කේතය',
    noResults: 'භාෂාවක් හමු නොවීය.',
  },
  notFound: { heading: 'පිටුව හමු නොවීය', backToMap: 'සිතියමට ආපසු' },
} satisfies PartialTranslation
