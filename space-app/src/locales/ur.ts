import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'منظر', map: 'نقشہ', calendar: 'کیلنڈر' },
  search: {
    label: 'جگہ تلاش کریں',
    button: 'تلاش',
    noResults: 'کوئی جگہ نہیں ملی۔',
    error: 'تلاش ناکام ہو گئی۔ دوبارہ کوشش کریں۔',
  },
  map: {
    title: 'نقشہ',
    zoomIn: 'بڑا کریں',
    zoomOut: 'چھوٹا کریں',
    attribution: 'ماخذ دکھائیں یا چھپائیں',
    feedback: 'نقشے کے بارے میں رائے',
  },
  draw: {
    draw: 'علاقہ بنائیں',
    cancel: 'ڈرائنگ منسوخ کریں',
    remove: 'انتخاب ہٹائیں',
    zoomHint: 'علاقہ منتخب کرنے کے لیے زوم ان کریں',
    zoomHintTitle: 'علاقہ منتخب کرنے کے لیے زوم ان کریں ({{zoom}}+)',
    closeShape: 'علاقہ منتخب کرنے کے لیے شکل بند کریں',
    selectedArea: 'منتخب علاقہ: {{area}}',
  },
  language: {
    label: 'زبان',
    placeholder: 'زبان یا کوڈ',
    noResults: 'کوئی زبان نہیں ملی۔',
  },
  calendar: { label: 'کیلنڈر منظر' },
  notFound: { heading: 'صفحہ نہیں ملا', backToMap: 'نقشے پر واپس جائیں' },
  pageTitles: { map: 'نقشہ', calendar: 'کیلنڈر', notFound: 'صفحہ نہیں ملا' },
} satisfies PartialTranslation
