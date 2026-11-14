import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'ابحث عن مكان',
    button: 'بحث',
    noResults: 'لم يتم العثور على أي مكان.',
    error: 'فشل البحث. يرجى المحاولة مرة أخرى.',
  },
  map: {
    title: 'الخريطة',
    zoomIn: 'تكبير',
    zoomOut: 'تصغير',
    attribution: 'إظهار أو إخفاء المصادر',
    feedback: 'ملاحظات حول الخريطة',
  },
  draw: {
    draw: 'ارسم منطقة',
    cancel: 'إلغاء الرسم',
    remove: 'إزالة التحديد',
    zoomHint: 'قرّب لتحديد منطقة',
    zoomHintTitle: 'قرّب لتحديد منطقة ({{zoom}}+)',
    closeShape: 'أغلق الشكل لتحديد منطقة',
    selectedArea: 'المنطقة المحددة: {{area}}',
  },
  language: {
    label: 'اللغة',
    placeholder: 'اللغة أو الرمز',
    noResults: 'لم يتم العثور على لغة.',
  },
  notFound: { heading: 'الصفحة غير موجودة', backToMap: 'العودة إلى الخريطة' },
} satisfies PartialTranslation
