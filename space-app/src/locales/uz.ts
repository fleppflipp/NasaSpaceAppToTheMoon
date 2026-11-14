import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Joy qidirish',
    button: 'Qidirish',
    noResults: 'Joy topilmadi.',
    error: 'Qidiruv amalga oshmadi. Qayta urinib koʻring.',
  },
  map: {
    title: 'Xarita',
    zoomIn: 'Yaqinlashtirish',
    zoomOut: 'Uzoqlashtirish',
    attribution: 'Manbalarni koʻrsatish yoki yashirish',
    feedback: 'Xarita haqida fikr-mulohaza',
  },
  draw: {
    draw: 'Hudud chizish',
    cancel: 'Chizishni bekor qilish',
    remove: 'Tanlovni olib tashlash',
    zoomHint: 'Hudud tanlash uchun yaqinlashtiring',
    zoomHintTitle: 'Hudud tanlash uchun yaqinlashtiring ({{zoom}}+)',
    closeShape: 'Hudud tanlash uchun shaklni yoping',
    selectedArea: 'Tanlangan hudud: {{area}}',
  },
  language: {
    label: 'Til',
    placeholder: 'Til yoki kod',
    noResults: 'Til topilmadi.',
  },
  notFound: { heading: 'Sahifa topilmadi', backToMap: 'Xaritaga qaytish' },
} satisfies PartialTranslation
