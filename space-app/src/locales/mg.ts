import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Hikaroka toerana',
    button: 'Hikaroka',
    noResults: 'Tsy nahitana toerana.',
    error: 'Tsy nahomby ny fikarohana. Andramo indray.',
  },
  map: {
    title: 'Sarintany',
    zoomIn: 'Hanakaiky',
    zoomOut: 'Hanalavitra',
    attribution: 'Asehoy na afeno ny loharano',
    feedback: 'Hevitra momba ny sarintany',
  },
  draw: {
    draw: 'Mamorona faritra',
    cancel: 'Foano ny sary',
    remove: 'Esory ny safidy',
    zoomHint: 'Hanakaiky mba hisafidy faritra',
    zoomHintTitle: 'Hanakaiky mba hisafidy faritra ({{zoom}}+)',
    closeShape: 'Akatony ny endrika mba hisafidy faritra',
    selectedArea: 'Faritra voafidy: {{area}}',
  },
  language: {
    label: 'Fiteny',
    placeholder: 'Fiteny na kaody',
    noResults: 'Tsy nahitana fiteny.',
  },
  notFound: {
    heading: 'Tsy hita ny pejy',
    backToMap: "Hiverina amin'ny sarintany",
  },
} satisfies PartialTranslation
