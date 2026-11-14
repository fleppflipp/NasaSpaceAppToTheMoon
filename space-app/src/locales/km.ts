import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'ស្វែងរកទីតាំង',
    button: 'ស្វែងរក',
    noResults: 'រកមិនឃើញទីតាំងទេ។',
    error: 'ការស្វែងរកបរាជ័យ។ សូមព្យាយាមម្តងទៀត។',
  },
  map: {
    title: 'ផែនទី',
    zoomIn: 'ពង្រីក',
    zoomOut: 'បង្រួម',
    attribution: 'បង្ហាញ ឬលាក់ប្រភព',
    feedback: 'មតិកែលម្អអំពីផែនទី',
  },
  draw: {
    draw: 'គូរតំបន់មួយ',
    cancel: 'បោះបង់ការគូរ',
    remove: 'លុបការជ្រើសរើស',
    zoomHint: 'ពង្រីកដើម្បីជ្រើសរើសតំបន់',
    zoomHintTitle: 'ពង្រីកដើម្បីជ្រើសរើសតំបន់ ({{zoom}}+)',
    closeShape: 'បិទរូបរាងដើម្បីជ្រើសរើសតំបន់',
    selectedArea: 'តំបន់ដែលបានជ្រើសរើស៖ {{area}}',
  },
  language: {
    label: 'ភាសា',
    placeholder: 'ភាសា ឬកូដ',
    noResults: 'រកមិនឃើញភាសាទេ។',
  },
  notFound: { heading: 'រកមិនឃើញទំព័រ', backToMap: 'ត្រឡប់ទៅផែនទី' },
} satisfies PartialTranslation
