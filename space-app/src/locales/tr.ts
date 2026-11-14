import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Yer ara',
    button: 'Ara',
    noResults: 'Yer bulunamadı.',
    error: 'Arama başarısız oldu. Lütfen tekrar deneyin.',
  },
  map: {
    title: 'Harita',
    zoomIn: 'Yakınlaştır',
    zoomOut: 'Uzaklaştır',
    attribution: 'Kaynakçayı göster veya gizle',
    feedback: 'Harita geri bildirimi',
  },
  draw: {
    draw: 'Alan çiz',
    cancel: 'Çizimi iptal et',
    remove: 'Seçimi kaldır',
    zoomHint: 'Alan seçmek için yakınlaştırın',
    zoomHintTitle: 'Alan seçmek için yakınlaştırın ({{zoom}}+)',
    closeShape: 'Alan seçmek için şekli kapatın',
    selectedArea: 'Seçilen alan: {{area}}',
  },
  language: {
    label: 'Dil',
    placeholder: 'Dil veya kod',
    noResults: 'Dil bulunamadı.',
  },
  notFound: { heading: 'Sayfa bulunamadı', backToMap: 'Haritaya dön' },
} satisfies PartialTranslation
