import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'दृश्य', map: 'मानचित्र', calendar: 'कैलेंडर' },
  search: {
    label: 'कोई स्थान खोजें',
    button: 'खोजें',
    noResults: 'कोई स्थान नहीं मिला।',
    error: 'खोज विफल रही। कृपया पुनः प्रयास करें।',
  },
  map: {
    title: 'मानचित्र',
    zoomIn: 'ज़ूम इन',
    zoomOut: 'ज़ूम आउट',
    attribution: 'स्रोत दिखाएँ या छिपाएँ',
    feedback: 'मानचित्र पर प्रतिक्रिया',
  },
  draw: {
    draw: 'क्षेत्र बनाएँ',
    cancel: 'चित्र बनाना रद्द करें',
    remove: 'चयन हटाएँ',
    zoomHint: 'क्षेत्र चुनने के लिए ज़ूम इन करें',
    zoomHintTitle: 'क्षेत्र चुनने के लिए ज़ूम इन करें ({{zoom}}+)',
    closeShape: 'क्षेत्र चुनने के लिए आकृति बंद करें',
    selectedArea: 'चुना गया क्षेत्र: {{area}}',
  },
  language: {
    label: 'भाषा',
    placeholder: 'भाषा या कोड',
    noResults: 'कोई भाषा नहीं मिली।',
  },
  calendar: { label: 'कैलेंडर दृश्य' },
  notFound: { heading: 'पृष्ठ नहीं मिला', backToMap: 'मानचित्र पर वापस जाएँ' },
  pageTitles: { map: 'मानचित्र', calendar: 'कैलेंडर', notFound: 'पृष्ठ नहीं मिला' },
} satisfies PartialTranslation
