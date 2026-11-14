import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Vue', map: 'Carte', calendar: 'Calendrier' },
  search: {
    label: 'Rechercher un lieu',
    button: 'Rechercher',
    noResults: 'Aucun lieu trouvé.',
    error: 'La recherche a échoué. Veuillez réessayer.',
  },
  map: {
    title: 'Carte',
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
    attribution: "Afficher ou masquer l'attribution",
    feedback: 'Commentaires sur la carte',
  },
  draw: {
    draw: 'Dessiner une zone',
    cancel: 'Annuler le dessin',
    remove: 'Supprimer la sélection',
    zoomHint: 'Zoomez pour sélectionner une zone',
    zoomHintTitle: 'Zoomez pour sélectionner une zone ({{zoom}}+)',
    closeShape: 'Fermez la forme pour sélectionner une zone',
    selectedArea: 'Zone sélectionnée : {{area}}',
  },
  language: {
    label: 'Langue',
    placeholder: 'Langue ou code',
    noResults: 'Aucune langue trouvée.',
  },
  calendar: { label: 'Vue calendrier' },
  notFound: { heading: 'Page introuvable', backToMap: 'Retour à la carte' },
  pageTitles: {
    map: 'Carte',
    calendar: 'Calendrier',
    notFound: 'Page introuvable',
  },
} satisfies PartialTranslation
