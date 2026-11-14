import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'ठाउँ खोज्नुहोस्',
    button: 'खोज्नुहोस्',
    noResults: 'कुनै ठाउँ फेला परेन।',
    error: 'खोजी असफल भयो। फेरि प्रयास गर्नुहोस्।',
  },
  map: {
    title: 'नक्सा',
    zoomIn: 'ठूलो पार्नुहोस्',
    zoomOut: 'सानो पार्नुहोस्',
    attribution: 'स्रोत देखाउनुहोस् वा लुकाउनुहोस्',
    feedback: 'नक्साबारे प्रतिक्रिया',
  },
  draw: {
    draw: 'क्षेत्र कोर्नुहोस्',
    cancel: 'कोर्न रद्द गर्नुहोस्',
    remove: 'चयन हटाउनुहोस्',
    zoomHint: 'क्षेत्र चयन गर्न जुम इन गर्नुहोस्',
    zoomHintTitle: 'क्षेत्र चयन गर्न जुम इन गर्नुहोस् ({{zoom}}+)',
    closeShape: 'क्षेत्र चयन गर्न आकार बन्द गर्नुहोस्',
    selectedArea: 'चयन गरिएको क्षेत्र: {{area}}',
  },
  language: {
    label: 'भाषा',
    placeholder: 'भाषा वा कोड',
    noResults: 'कुनै भाषा फेला परेन।',
  },
  notFound: { heading: 'पृष्ठ फेला परेन', backToMap: 'नक्सामा फर्कनुहोस्' },
} satisfies PartialTranslation
