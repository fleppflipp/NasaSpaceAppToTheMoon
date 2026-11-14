import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Pogled', map: 'Zemljevid', calendar: 'Koledar' },
  search: {
    label: 'Poišči kraj',
    button: 'Išči',
    noResults: 'Kraj ni najden.',
    error: 'Iskanje ni uspelo. Poskusite znova.',
  },
  map: {
    title: 'Zemljevid',
    zoomIn: 'Povečaj',
    zoomOut: 'Pomanjšaj',
    attribution: 'Pokaži ali skrij vire',
    feedback: 'Povratne informacije o zemljevidu',
  },
  draw: {
    draw: 'Nariši območje',
    cancel: 'Prekliči risanje',
    remove: 'Odstrani izbor',
    zoomHint: 'Povečajte za izbiro območja',
    zoomHintTitle: 'Povečajte za izbiro območja ({{zoom}}+)',
    closeShape: 'Zaprite obliko za izbiro območja',
    selectedArea: 'Izbrano območje: {{area}}',
  },
  language: {
    label: 'Jezik',
    placeholder: 'Jezik ali koda',
    noResults: 'Jezik ni najden.',
  },
  calendar: { label: 'Pogled koledarja' },
  notFound: { heading: 'Stran ni najdena', backToMap: 'Nazaj na zemljevid' },
  pageTitles: {
    map: 'Zemljevid',
    calendar: 'Koledar',
    notFound: 'Stran ni najdena',
  },
} satisfies PartialTranslation
