import type { PartialTranslation } from './eng'

export default {
  search: {
    label: '場所を検索',
    button: '検索',
    noResults: '場所が見つかりません。',
    error: '検索に失敗しました。もう一度お試しください。',
  },
  map: {
    title: '地図',
    zoomIn: '拡大',
    zoomOut: '縮小',
    attribution: '出典の表示を切り替え',
    feedback: '地図に関するフィードバック',
  },
  draw: {
    draw: 'エリアを描く',
    cancel: '描画をキャンセル',
    remove: '選択を解除',
    zoomHint: 'エリアを選択するには拡大してください',
    zoomHintTitle: 'エリアを選択するには拡大してください ({{zoom}}+)',
    closeShape: 'エリアを選択するには図形を閉じてください',
    selectedArea: '選択したエリア：{{area}}',
  },
  language: {
    label: '言語',
    placeholder: '言語またはコード',
    noResults: '言語が見つかりません。',
  },
  notFound: { heading: 'ページが見つかりません', backToMap: '地図に戻る' },
} satisfies PartialTranslation
