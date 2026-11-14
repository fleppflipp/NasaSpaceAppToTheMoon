import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'እይታ', map: 'ካርታ', calendar: 'የቀን መቁጠሪያ' },
  search: {
    label: 'ቦታ ፈልግ',
    button: 'ፈልግ',
    noResults: 'ምንም ቦታ አልተገኘም።',
    error: 'ፍለጋው አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
  },
  map: {
    title: 'ካርታ',
    zoomIn: 'አስጠጋ',
    zoomOut: 'አራቅ',
    attribution: 'ምንጮችን አሳይ ወይም ደብቅ',
    feedback: 'ስለ ካርታው አስተያየት',
  },
  draw: {
    draw: 'አካባቢ ይሳሉ',
    cancel: 'ሥዕሉን ሰርዝ',
    remove: 'ምርጫውን አስወግድ',
    zoomHint: 'አካባቢ ለመምረጥ አስጠጋ',
    zoomHintTitle: 'አካባቢ ለመምረጥ አስጠጋ ({{zoom}}+)',
    closeShape: 'አካባቢ ለመምረጥ ቅርጹን ዝጋ',
    selectedArea: 'የተመረጠ አካባቢ፦ {{area}}',
  },
  language: {
    label: 'ቋንቋ',
    placeholder: 'ቋንቋ ወይም ኮድ',
    noResults: 'ምንም ቋንቋ አልተገኘም።',
  },
  calendar: { label: 'የቀን መቁጠሪያ እይታ' },
  notFound: { heading: 'ገጹ አልተገኘም', backToMap: 'ወደ ካርታው ተመለስ' },
  pageTitles: { map: 'ካርታ', calendar: 'የቀን መቁጠሪያ', notFound: 'ገጹ አልተገኘም' },
} satisfies PartialTranslation
