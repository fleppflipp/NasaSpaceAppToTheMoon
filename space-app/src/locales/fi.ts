import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'Hae paikkaa',
    button: 'Hae',
    noResults: 'Paikkaa ei löytynyt.',
    error: 'Haku epäonnistui. Yritä uudelleen.',
  },
  map: {
    title: 'Kartta',
    zoomIn: 'Lähennä',
    zoomOut: 'Loitonna',
    attribution: 'Näytä tai piilota lähdetiedot',
    feedback: 'Palaute kartasta',
  },
  draw: {
    draw: 'Piirrä alue',
    cancel: 'Peruuta piirtäminen',
    remove: 'Poista valinta',
    zoomHint: 'Lähennä valitaksesi alueen',
    zoomHintTitle: 'Lähennä valitaksesi alueen ({{zoom}}+)',
    closeShape: 'Sulje muoto valitaksesi alueen',
    selectedArea: 'Valittu alue: {{area}}',
  },
  language: {
    label: 'Kieli',
    placeholder: 'Kieli tai koodi',
    noResults: 'Kieltä ei löytynyt.',
  },
  notFound: { heading: 'Sivua ei löytynyt', backToMap: 'Takaisin karttaan' },
} satisfies PartialTranslation
