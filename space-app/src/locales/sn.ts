import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Maonero', map: 'Mepu', calendar: 'Karenda' },
  search: {
    label: 'Tsvaga nzvimbo',
    button: 'Tsvaga',
    noResults: 'Hapana nzvimbo yawanikwa.',
    error: 'Kutsvaga kwatadza. Edzazve.',
  },
  map: {
    title: 'Mepu',
    zoomIn: 'Wedzera',
    zoomOut: 'Deredza',
    attribution: 'Ratidza kana kuvanza mavambo',
    feedback: 'Mhinduro pamusoro pemepu',
  },
  draw: {
    draw: 'Dhirowa nharaunda',
    cancel: 'Rega kudhirowa',
    remove: 'Bvisa sarudzo',
    zoomHint: 'Wedzera kuti usarudze nharaunda',
    zoomHintTitle: 'Wedzera kuti usarudze nharaunda ({{zoom}}+)',
    closeShape: 'Vhara chimiro kuti usarudze nharaunda',
    selectedArea: 'Nharaunda yasarudzwa: {{area}}',
  },
  language: {
    label: 'Mutauro',
    placeholder: 'Mutauro kana koodhi',
    noResults: 'Hapana mutauro wawanikwa.',
  },
  calendar: { label: 'Maonero ekarenda' },
  notFound: { heading: 'Peji haina kuwanikwa', backToMap: 'Dzokera kumepu' },
  pageTitles: {
    map: 'Mepu',
    calendar: 'Karenda',
    notFound: 'Peji haina kuwanikwa',
  },
} satisfies PartialTranslation
