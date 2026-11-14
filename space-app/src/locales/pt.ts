import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Vista', map: 'Mapa', calendar: 'Calendário' },
  search: {
    label: 'Pesquisar um local',
    button: 'Pesquisar',
    noResults: 'Nenhum local encontrado.',
    error: 'A pesquisa falhou. Tente novamente.',
  },
  map: {
    title: 'Mapa',
    zoomIn: 'Aumentar zoom',
    zoomOut: 'Diminuir zoom',
    attribution: 'Alternar atribuição',
    feedback: 'Comentários sobre o mapa',
  },
  draw: {
    draw: 'Desenhar uma área',
    cancel: 'Cancelar desenho',
    remove: 'Remover seleção',
    zoomHint: 'Aproxime para selecionar uma área',
    zoomHintTitle: 'Aproxime para selecionar uma área ({{zoom}}+)',
    closeShape: 'Feche a forma para selecionar uma área',
    selectedArea: 'Área selecionada: {{area}}',
  },
  language: {
    label: 'Idioma',
    placeholder: 'Idioma ou código',
    noResults: 'Nenhum idioma encontrado.',
  },
  calendar: { label: 'Vista de calendário' },
  notFound: { heading: 'Página não encontrada', backToMap: 'Voltar ao mapa' },
  pageTitles: {
    map: 'Mapa',
    calendar: 'Calendário',
    notFound: 'Página não encontrada',
  },
} satisfies PartialTranslation
