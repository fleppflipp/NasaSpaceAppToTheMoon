import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Görünüş', map: 'Xəritə', calendar: 'Təqvim' },
  search: {
    label: 'Yer axtarın',
    button: 'Axtar',
    noResults: 'Yer tapılmadı.',
    error: 'Axtarış alınmadı. Yenidən cəhd edin.',
  },
  map: {
    title: 'Xəritə',
    zoomIn: 'Yaxınlaşdır',
    zoomOut: 'Uzaqlaşdır',
    attribution: 'Mənbələri göstər və ya gizlət',
    feedback: 'Xəritə haqqında rəy',
  },
  draw: {
    draw: 'Sahə çək',
    cancel: 'Çəkməni ləğv et',
    remove: 'Seçimi sil',
    zoomHint: 'Sahə seçmək üçün yaxınlaşdırın',
    zoomHintTitle: 'Sahə seçmək üçün yaxınlaşdırın ({{zoom}}+)',
    closeShape: 'Sahə seçmək üçün formanı bağlayın',
    selectedArea: 'Seçilmiş sahə: {{area}}',
  },
  language: {
    label: 'Dil',
    placeholder: 'Dil və ya kod',
    noResults: 'Dil tapılmadı.',
  },
  calendar: { label: 'Təqvim görünüşü' },
  notFound: { heading: 'Səhifə tapılmadı', backToMap: 'Xəritəyə qayıt' },
  pageTitles: {
    map: 'Xəritə',
    calendar: 'Təqvim',
    notFound: 'Səhifə tapılmadı',
  },
} satisfies PartialTranslation
