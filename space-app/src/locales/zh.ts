import type { PartialTranslation } from './eng'

export default {
  navigation: { label: '视图', map: '地图', calendar: '日历' },
  search: {
    label: '搜索地点',
    button: '搜索',
    noResults: '未找到地点。',
    error: '搜索失败，请重试。',
  },
  map: {
    title: '地图',
    zoomIn: '放大',
    zoomOut: '缩小',
    attribution: '显示或隐藏来源',
    feedback: '地图反馈',
  },
  draw: {
    draw: '绘制区域',
    cancel: '取消绘制',
    remove: '移除选择',
    zoomHint: '放大以选择区域',
    zoomHintTitle: '放大以选择区域 ({{zoom}}+)',
    closeShape: '闭合图形以选择区域',
    selectedArea: '已选区域：{{area}}',
  },
  language: {
    label: '语言',
    placeholder: '语言或代码',
    noResults: '未找到语言。',
  },
  calendar: { label: '日历视图' },
  notFound: { heading: '未找到页面', backToMap: '返回地图' },
  pageTitles: { map: '地图', calendar: '日历', notFound: '未找到页面' },
} satisfies PartialTranslation
