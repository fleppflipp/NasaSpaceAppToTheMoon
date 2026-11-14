import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Cari tempat',
    button: 'Cari',
    noResults: 'Tempat tidak ditemukan.',
    error: 'Pencarian gagal. Silakan coba lagi.',
  },
  map: {
    title: 'Peta',
    zoomIn: 'Perbesar',
    zoomOut: 'Perkecil',
    attribution: 'Tampilkan atau sembunyikan atribusi',
    feedback: 'Masukan tentang peta',
  },
  draw: {
    draw: 'Gambar area',
    cancel: 'Batalkan menggambar',
    remove: 'Hapus pilihan',
    zoomHint: 'Perbesar untuk memilih area',
    zoomHintTitle: 'Perbesar untuk memilih area ({{zoom}}+)',
    closeShape: 'Tutup bentuk untuk memilih area',
    selectedArea: 'Area terpilih: {{area}}',
  },
  language: {
    label: 'Bahasa',
    placeholder: 'Bahasa atau kode',
    noResults: 'Bahasa tidak ditemukan.',
  },
  notFound: {
    heading: 'Halaman tidak ditemukan',
    backToMap: 'Kembali ke peta',
  },
} satisfies PartialTranslation
