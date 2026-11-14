import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'দৃশ্য', map: 'মানচিত্র', calendar: 'ক্যালেন্ডার' },
  search: {
    label: 'একটি জায়গা খুঁজুন',
    button: 'খুঁজুন',
    noResults: 'কোনো জায়গা পাওয়া যায়নি।',
    error: 'অনুসন্ধান ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
  },
  map: {
    title: 'মানচিত্র',
    zoomIn: 'বড় করুন',
    zoomOut: 'ছোট করুন',
    attribution: 'উৎস দেখান বা লুকান',
    feedback: 'মানচিত্র সম্পর্কে মতামত',
  },
  draw: {
    draw: 'একটি এলাকা আঁকুন',
    cancel: 'আঁকা বাতিল করুন',
    remove: 'নির্বাচন সরান',
    zoomHint: 'এলাকা নির্বাচন করতে জুম করুন',
    zoomHintTitle: 'এলাকা নির্বাচন করতে জুম করুন ({{zoom}}+)',
    closeShape: 'এলাকা নির্বাচন করতে আকৃতিটি বন্ধ করুন',
    selectedArea: 'নির্বাচিত এলাকা: {{area}}',
  },
  language: {
    label: 'ভাষা',
    placeholder: 'ভাষা বা কোড',
    noResults: 'কোনো ভাষা পাওয়া যায়নি।',
  },
  calendar: { label: 'ক্যালেন্ডার দৃশ্য' },
  notFound: { heading: 'পৃষ্ঠাটি পাওয়া যায়নি', backToMap: 'মানচিত্রে ফিরে যান' },
  pageTitles: {
    map: 'মানচিত্র',
    calendar: 'ক্যালেন্ডার',
    notFound: 'পৃষ্ঠাটি পাওয়া যায়নি',
  },
} satisfies PartialTranslation
