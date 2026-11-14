import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Chế độ xem', map: 'Bản đồ', calendar: 'Lịch' },
  search: {
    label: 'Tìm một địa điểm',
    button: 'Tìm kiếm',
    noResults: 'Không tìm thấy địa điểm.',
    error: 'Tìm kiếm thất bại. Vui lòng thử lại.',
  },
  map: {
    title: 'Bản đồ',
    zoomIn: 'Phóng to',
    zoomOut: 'Thu nhỏ',
    attribution: 'Hiện hoặc ẩn ghi công',
    feedback: 'Phản hồi về bản đồ',
  },
  draw: {
    draw: 'Vẽ một vùng',
    cancel: 'Hủy vẽ',
    remove: 'Xóa vùng chọn',
    zoomHint: 'Phóng to để chọn một vùng',
    zoomHintTitle: 'Phóng to để chọn một vùng ({{zoom}}+)',
    closeShape: 'Đóng hình để chọn một vùng',
    selectedArea: 'Vùng đã chọn: {{area}}',
  },
  language: {
    label: 'Ngôn ngữ',
    placeholder: 'Ngôn ngữ hoặc mã',
    noResults: 'Không tìm thấy ngôn ngữ.',
  },
  calendar: { label: 'Chế độ xem lịch' },
  notFound: { heading: 'Không tìm thấy trang', backToMap: 'Quay lại bản đồ' },
  pageTitles: {
    map: 'Bản đồ',
    calendar: 'Lịch',
    notFound: 'Không tìm thấy trang',
  },
} satisfies PartialTranslation
