import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Paparan', map: 'Peta', calendar: 'Kalendar' },
  search: {
    label: 'Cari tempat',
    button: 'Cari',
    noResults: 'Tiada tempat ditemui.',
    error: 'Carian gagal. Sila cuba lagi.',
  },
  map: {
    title: 'Peta',
    zoomIn: 'Zum masuk',
    zoomOut: 'Zum keluar',
    attribution: 'Togol atribusi',
    feedback: 'Maklum balas peta',
  },
  draw: {
    draw: 'Lukis kawasan',
    cancel: 'Batalkan lukisan',
    remove: 'Alih keluar pilihan',
    zoomHint: 'Zum masuk untuk memilih kawasan',
    zoomHintTitle: 'Zum masuk untuk memilih kawasan ({{zoom}}+)',
    closeShape: 'Tutup bentuk untuk memilih kawasan',
    selectedArea: 'Kawasan dipilih: {{area}}',
  },
  language: {
    label: 'Bahasa',
    placeholder: 'Bahasa atau kod',
    noResults: 'Tiada bahasa ditemui.',
  },
  calendar: { label: 'Paparan kalendar' },
  notFound: { heading: 'Halaman tidak ditemui', backToMap: 'Kembali ke peta' },
  pageTitles: {
    map: 'Peta',
    calendar: 'Kalendar',
    notFound: 'Halaman tidak ditemui',
  },
} satisfies PartialTranslation
