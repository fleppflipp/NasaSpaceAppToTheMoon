import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'ቦታ ድለይ',
    button: 'ድለይ',
    noResults: 'ዝኾነ ቦታ ኣይተረኽበን።',
    error: 'ምድላይ ኣይተዓወተን። በጃኹም ዳግማይ ፈትኑ።',
  },
  map: {
    title: 'ካርታ',
    zoomIn: 'ኣዕቢ',
    zoomOut: 'ኣንኳሕኩሕ',
    attribution: 'ምንጭታት ኣርእይ ወይ ሕባእ',
    feedback: 'ብዛዕባ ካርታ ርእይቶ',
  },
  draw: {
    draw: 'ዓቐን ሳዕሪ',
    cancel: 'ስእሊ ሰርዝ',
    remove: 'ምርጫ ኣልግስ',
    zoomHint: 'ቦታ ንምምራጽ ኣዕቢ',
    zoomHintTitle: 'ቦታ ንምምራጽ ኣዕቢ ({{zoom}}+)',
    closeShape: 'ቦታ ንምምራጽ ቅርጺ ዓጽው',
    selectedArea: 'ዝተመርጸ ቦታ፦ {{area}}',
  },
  language: {
    label: 'ቋንቋ',
    placeholder: 'ቋንቋ ወይ ኮድ',
    noResults: 'ዝኾነ ቋንቋ ኣይተረኽበን።',
  },
  notFound: { heading: 'ገጽ ኣይተረኽበን', backToMap: 'ናብ ካርታ ተመለስ' },
} satisfies PartialTranslation
