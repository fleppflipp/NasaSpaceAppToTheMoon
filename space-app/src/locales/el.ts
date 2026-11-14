import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Αναζήτηση τοποθεσίας',
    button: 'Αναζήτηση',
    noResults: 'Δεν βρέθηκε τοποθεσία.',
    error: 'Η αναζήτηση απέτυχε. Δοκιμάστε ξανά.',
  },
  map: {
    title: 'Χάρτης',
    zoomIn: 'Μεγέθυνση',
    zoomOut: 'Σμίκρυνση',
    attribution: 'Εναλλαγή απόδοσης πηγών',
    feedback: 'Σχόλια για τον χάρτη',
  },
  draw: {
    draw: 'Σχεδίαση περιοχής',
    cancel: 'Ακύρωση σχεδίασης',
    remove: 'Κατάργηση επιλογής',
    zoomHint: 'Μεγεθύνετε για να επιλέξετε περιοχή',
    zoomHintTitle: 'Μεγεθύνετε για να επιλέξετε περιοχή ({{zoom}}+)',
    closeShape: 'Κλείστε το σχήμα για να επιλέξετε περιοχή',
    selectedArea: 'Επιλεγμένη περιοχή: {{area}}',
  },
  language: {
    label: 'Γλώσσα',
    placeholder: 'Γλώσσα ή κωδικός',
    noResults: 'Δεν βρέθηκε γλώσσα.',
  },
  notFound: {
    heading: 'Η σελίδα δεν βρέθηκε',
    backToMap: 'Επιστροφή στον χάρτη',
  },
} satisfies PartialTranslation
