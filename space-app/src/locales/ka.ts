import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'მოძებნეთ ადგილი',
    button: 'ძიება',
    noResults: 'ადგილი ვერ მოიძებნა.',
    error: 'ძიება ვერ შესრულდა. სცადეთ ხელახლა.',
  },
  map: {
    title: 'რუკა',
    zoomIn: 'გადიდება',
    zoomOut: 'დაპატარავება',
    attribution: 'წყაროების ჩვენება ან დამალვა',
    feedback: 'გამოხმაურება რუკაზე',
  },
  draw: {
    draw: 'არეალის დახაზვა',
    cancel: 'ხაზვის გაუქმება',
    remove: 'არჩევის მოხსნა',
    zoomHint: 'გაადიდეთ არეალის ასარჩევად',
    zoomHintTitle: 'გაადიდეთ არეალის ასარჩევად ({{zoom}}+)',
    closeShape: 'დახურეთ ფიგურა არეალის ასარჩევად',
    selectedArea: 'არჩეული არეალი: {{area}}',
  },
  language: {
    label: 'ენა',
    placeholder: 'ენა ან კოდი',
    noResults: 'ენა ვერ მოიძებნა.',
  },
  notFound: { heading: 'გვერდი ვერ მოიძებნა', backToMap: 'რუკაზე დაბრუნება' },
} satisfies PartialTranslation
