import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'มุมมอง', map: 'แผนที่', calendar: 'ปฏิทิน' },
  search: {
    label: 'ค้นหาสถานที่',
    button: 'ค้นหา',
    noResults: 'ไม่พบสถานที่',
    error: 'การค้นหาล้มเหลว โปรดลองอีกครั้ง',
  },
  map: {
    title: 'แผนที่',
    zoomIn: 'ขยาย',
    zoomOut: 'ย่อ',
    attribution: 'แสดงหรือซ่อนแหล่งที่มา',
    feedback: 'ข้อเสนอแนะเกี่ยวกับแผนที่',
  },
  draw: {
    draw: 'วาดพื้นที่',
    cancel: 'ยกเลิกการวาด',
    remove: 'ลบการเลือก',
    zoomHint: 'ขยายเพื่อเลือกพื้นที่',
    zoomHintTitle: 'ขยายเพื่อเลือกพื้นที่ ({{zoom}}+)',
    closeShape: 'ปิดรูปร่างเพื่อเลือกพื้นที่',
    selectedArea: 'พื้นที่ที่เลือก: {{area}}',
  },
  language: {
    label: 'ภาษา',
    placeholder: 'ภาษาหรือรหัส',
    noResults: 'ไม่พบภาษา',
  },
  calendar: { label: 'มุมมองปฏิทิน' },
  notFound: { heading: 'ไม่พบหน้า', backToMap: 'กลับไปที่แผนที่' },
  pageTitles: { map: 'แผนที่', calendar: 'ปฏิทิน', notFound: 'ไม่พบหน้า' },
} satisfies PartialTranslation
