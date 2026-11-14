import type { PartialTranslation } from './eng'

export default {
  search: {
    label: '장소 검색',
    button: '검색',
    noResults: '장소를 찾을 수 없습니다.',
    error: '검색에 실패했습니다. 다시 시도해 주세요.',
  },
  map: {
    title: '지도',
    zoomIn: '확대',
    zoomOut: '축소',
    attribution: '출처 표시 전환',
    feedback: '지도 의견 보내기',
  },
  draw: {
    draw: '영역 그리기',
    cancel: '그리기 취소',
    remove: '선택 해제',
    zoomHint: '영역을 선택하려면 확대하세요',
    zoomHintTitle: '영역을 선택하려면 확대하세요 ({{zoom}}+)',
    closeShape: '영역을 선택하려면 도형을 닫으세요',
    selectedArea: '선택한 영역: {{area}}',
  },
  language: {
    label: '언어',
    placeholder: '언어 또는 코드',
    noResults: '언어를 찾을 수 없습니다.',
  },
  notFound: {
    heading: '페이지를 찾을 수 없습니다',
    backToMap: '지도로 돌아가기',
  },
} satisfies PartialTranslation
