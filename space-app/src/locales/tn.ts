import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Batla lefelo',
    button: 'Batla',
    noResults: 'Ga go lefelo le le bonweng.',
    error: 'Tshwaelo e paletswe. Tsweetswee leka gape.',
  },
  map: {
    title: 'Mmapa',
    zoomIn: 'Oketsa',
    zoomOut: 'Fokotsa',
    attribution: 'Bontsha kgotsa fitlha methopo',
    feedback: 'Ditshwaelo ka mmapa',
  },
  draw: {
    draw: 'Taka lefelo',
    cancel: 'Khansela go taka',
    remove: 'Tlosa tlhopho',
    zoomHint: 'Oketsa go tlhopha lefelo',
    zoomHintTitle: 'Oketsa go tlhopha lefelo ({{zoom}}+)',
    closeShape: 'Tswala sebopego go tlhopha lefelo',
    selectedArea: 'Lefelo le le tlhophilweng: {{area}}',
  },
  language: {
    label: 'Puo',
    placeholder: 'Puo kgotsa khouto',
    noResults: 'Ga go puo e e bonweng.',
  },
  notFound: { heading: 'Tsebe ga e a bonwa', backToMap: 'Boela kwa mmapeng' },
} satisfies PartialTranslation
