import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'תצוגה', map: 'מפה', calendar: 'לוח שנה' },
  search: {
    label: 'חיפוש מקום',
    button: 'חיפוש',
    noResults: 'לא נמצא מקום.',
    error: 'החיפוש נכשל. נסו שוב.',
  },
  map: {
    title: 'מפה',
    zoomIn: 'הגדלה',
    zoomOut: 'הקטנה',
    attribution: 'הצגה או הסתרה של מקורות',
    feedback: 'משוב על המפה',
  },
  draw: {
    draw: 'ציור אזור',
    cancel: 'ביטול הציור',
    remove: 'הסרת הבחירה',
    zoomHint: 'התקרבו כדי לבחור אזור',
    zoomHintTitle: 'התקרבו כדי לבחור אזור ({{zoom}}+)',
    closeShape: 'סגרו את הצורה כדי לבחור אזור',
    selectedArea: 'האזור שנבחר: {{area}}',
  },
  language: {
    label: 'שפה',
    placeholder: 'שפה או קוד',
    noResults: 'לא נמצאה שפה.',
  },
  calendar: { label: 'תצוגת לוח שנה' },
  notFound: { heading: 'הדף לא נמצא', backToMap: 'חזרה למפה' },
  pageTitles: { map: 'מפה', calendar: 'לוח שנה', notFound: 'הדף לא נמצא' },
} satisfies PartialTranslation
