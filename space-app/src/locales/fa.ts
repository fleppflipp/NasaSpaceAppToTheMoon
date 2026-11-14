import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'جستجوی مکان',
    button: 'جستجو',
    noResults: 'مکانی پیدا نشد.',
    error: 'جستجو ناموفق بود. دوباره تلاش کنید.',
  },
  map: {
    title: 'نقشه',
    zoomIn: 'بزرگ‌نمایی',
    zoomOut: 'کوچک‌نمایی',
    attribution: 'نمایش یا پنهان کردن منابع',
    feedback: 'بازخورد درباره نقشه',
  },
  draw: {
    draw: 'کشیدن یک ناحیه',
    cancel: 'لغو کشیدن',
    remove: 'حذف انتخاب',
    zoomHint: 'برای انتخاب ناحیه بزرگ‌نمایی کنید',
    zoomHintTitle: 'برای انتخاب ناحیه بزرگ‌نمایی کنید ({{zoom}}+)',
    closeShape: 'برای انتخاب ناحیه شکل را ببندید',
    selectedArea: 'ناحیه انتخاب‌شده: {{area}}',
  },
  language: {
    label: 'زبان',
    placeholder: 'زبان یا کد',
    noResults: 'زبانی پیدا نشد.',
  },
  notFound: { heading: 'صفحه پیدا نشد', backToMap: 'بازگشت به نقشه' },
} satisfies PartialTranslation
