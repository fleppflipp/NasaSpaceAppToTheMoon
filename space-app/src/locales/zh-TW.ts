import type { PartialTranslation } from './eng'

export default {
  navigation: { label: '檢視', map: '地圖', calendar: '日曆' },
  search: {
    label: '搜尋地點',
    button: '搜尋',
    noResults: '找不到地點。',
    error: '搜尋失敗，請再試一次。',
  },
  map: {
    title: '地圖',
    zoomIn: '放大',
    zoomOut: '縮小',
    attribution: '顯示或隱藏來源',
    feedback: '地圖意見回饋',
  },
  draw: {
    draw: '繪製區域',
    cancel: '取消繪製',
    remove: '移除選取',
    zoomHint: '放大以選取區域',
    zoomHintTitle: '放大以選取區域 ({{zoom}}+)',
    closeShape: '封閉圖形以選取區域',
    selectedArea: '已選取區域：{{area}}',
  },
  language: {
    label: '語言',
    placeholder: '語言或代碼',
    noResults: '找不到語言。',
  },
  calendar: { label: '日曆檢視' },
  notFound: { heading: '找不到頁面', backToMap: '返回地圖' },
  pageTitles: { map: '地圖', calendar: '日曆', notFound: '找不到頁面' },
} satisfies PartialTranslation
