import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Skats', map: 'Karte', calendar: 'Kalendārs' },
  search: {
    label: 'Meklēt vietu',
    button: 'Meklēt',
    noResults: 'Vieta nav atrasta.',
    error: 'Meklēšana neizdevās. Mēģiniet vēlreiz.',
  },
  map: {
    title: 'Karte',
    zoomIn: 'Tuvināt',
    zoomOut: 'Tālināt',
    attribution: 'Rādīt vai slēpt avotus',
    feedback: 'Atsauksmes par karti',
  },
  draw: {
    draw: 'Zīmēt apgabalu',
    cancel: 'Atcelt zīmēšanu',
    remove: 'Noņemt atlasi',
    zoomHint: 'Tuviniet, lai atlasītu apgabalu',
    zoomHintTitle: 'Tuviniet, lai atlasītu apgabalu ({{zoom}}+)',
    closeShape: 'Aizveriet formu, lai atlasītu apgabalu',
    selectedArea: 'Atlasītais apgabals: {{area}}',
  },
  language: {
    label: 'Valoda',
    placeholder: 'Valoda vai kods',
    noResults: 'Valoda nav atrasta.',
  },
  calendar: { label: 'Kalendāra skats' },
  notFound: { heading: 'Lapa nav atrasta', backToMap: 'Atpakaļ uz karti' },
  pageTitles: {
    map: 'Karte',
    calendar: 'Kalendārs',
    notFound: 'Lapa nav atrasta',
  },
} satisfies PartialTranslation
