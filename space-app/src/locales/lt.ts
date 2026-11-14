import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Ieškoti vietos',
    button: 'Ieškoti',
    noResults: 'Vieta nerasta.',
    error: 'Paieška nepavyko. Bandykite dar kartą.',
  },
  map: {
    title: 'Žemėlapis',
    zoomIn: 'Priartinti',
    zoomOut: 'Nutolinti',
    attribution: 'Rodyti arba slėpti šaltinius',
    feedback: 'Atsiliepimai apie žemėlapį',
  },
  draw: {
    draw: 'Nubrėžti sritį',
    cancel: 'Atšaukti braižymą',
    remove: 'Pašalinti pasirinkimą',
    zoomHint: 'Priartinkite, kad pasirinktumėte sritį',
    zoomHintTitle: 'Priartinkite, kad pasirinktumėte sritį ({{zoom}}+)',
    closeShape: 'Uždarykite figūrą, kad pasirinktumėte sritį',
    selectedArea: 'Pasirinkta sritis: {{area}}',
  },
  language: {
    label: 'Kalba',
    placeholder: 'Kalba arba kodas',
    noResults: 'Kalba nerasta.',
  },
  notFound: { heading: 'Puslapis nerastas', backToMap: 'Atgal į žemėlapį' },
} satisfies PartialTranslation
