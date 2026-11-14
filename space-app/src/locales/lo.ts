import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'ມຸມມອງ', map: 'ແຜນທີ່', calendar: 'ປະຕິທິນ' },
  search: {
    label: 'ຄົ້ນຫາສະຖານທີ່',
    button: 'ຄົ້ນຫາ',
    noResults: 'ບໍ່ພົບສະຖານທີ່.',
    error: 'ການຄົ້ນຫາບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.',
  },
  map: {
    title: 'ແຜນທີ່',
    zoomIn: 'ຊູມເຂົ້າ',
    zoomOut: 'ຊູມອອກ',
    attribution: 'ສະແດງ ຫຼື ເຊື່ອງແຫຼ່ງທີ່ມາ',
    feedback: 'ຄຳຕິຊົມກ່ຽວກັບແຜນທີ່',
  },
  draw: {
    draw: 'ແຕ້ມພື້ນທີ່',
    cancel: 'ຍົກເລີກການແຕ້ມ',
    remove: 'ລຶບການເລືອກ',
    zoomHint: 'ຊູມເຂົ້າເພື່ອເລືອກພື້ນທີ່',
    zoomHintTitle: 'ຊູມເຂົ້າເພື່ອເລືອກພື້ນທີ່ ({{zoom}}+)',
    closeShape: 'ປິດຮູບຮ່າງເພື່ອເລືອກພື້ນທີ່',
    selectedArea: 'ພື້ນທີ່ທີ່ເລືອກ: {{area}}',
  },
  language: {
    label: 'ພາສາ',
    placeholder: 'ພາສາ ຫຼື ລະຫັດ',
    noResults: 'ບໍ່ພົບພາສາ.',
  },
  calendar: { label: 'ມຸມມອງປະຕິທິນ' },
  notFound: { heading: 'ບໍ່ພົບໜ້ານີ້', backToMap: 'ກັບຄືນໄປແຜນທີ່' },
  pageTitles: { map: 'ແຜນທີ່', calendar: 'ປະຕິທິນ', notFound: 'ບໍ່ພົບໜ້ານີ້' },
} satisfies PartialTranslation
