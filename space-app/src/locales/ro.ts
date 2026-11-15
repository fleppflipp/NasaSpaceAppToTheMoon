import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Vizualizare', map: 'Hartă', calendar: 'Calendar' },
  search: {
    label: 'Caută un loc',
    button: 'Caută',
    noResults: 'Nu s-a găsit niciun loc.',
    error: 'Căutarea a eșuat. Încearcă din nou.',
  },
  map: {
    title: 'Hartă',
    zoomIn: 'Mărește',
    zoomOut: 'Micșorează',
    attribution: 'Comută atribuirea',
    feedback: 'Feedback despre hartă',
  },
  draw: {
    draw: 'Desenează o zonă',
    cancel: 'Anulează desenul',
    remove: 'Elimină selecția',
    zoomHint: 'Apropie harta pentru a selecta o zonă',
    zoomHintTitle:
      'Apropie harta pentru a selecta o zonă (nivel de zoom {{zoom}} sau mai mare)',
    closeShape: 'Închide forma pentru a selecta o zonă',
    selectedArea: 'Zonă selectată: {{area}}',
  },
  language: {
    label: 'Limbă',
    placeholder: 'Limbă sau cod',
    noResults: 'Nicio limbă găsită.',
  },
  fires: {
    noData: 'Nu există încă date despre incendii pentru această perioadă.',
  },
  timeline: {
    label: 'Perioadă',
    year: 'An',
    week: 'Săptămâna',
    range: '{{start}} – {{end}}',
  },
  cause: {
    heading: 'Incendii în zona selectată',
    loadingFires: 'Se caută incendii…',
    noFires: 'Niciun incendiu în această zonă în săptămâna selectată.',
    fires: 'Incendii',
    dates: 'Date',
    totalFrp: 'Puterea totală a focului',
    maxFrp: 'Cel mai puternic incendiu',
    frp: '{{value}} MW',
    near: 'Lângă {{place}}',
    placeInCountry: '{{place}}, {{country}}',
    photoAlt: 'Fotografie din știre: {{title}}',
    photoCredit: 'Fotografie:',
    photoNote:
      'Dintr-o știre care se potrivește cu acest loc și an; poate arăta un incendiu din apropiere.',
    find: 'Găsește cauza probabilă',
    finding: 'Se verifică hărțile și webul. Poate dura până la un minut.',
    likelyCause: 'Cauza probabilă',
    confidence: 'Încredere: {{level}}',
    why: 'De ce',
    sources: 'Surse web',
    matched: 'Potriviri: {{phrases}}',
    original: 'Textul original',
    translated: 'Tradus automat în engleză.',
    disclaimer:
      'O estimare din reguli de cuvinte cheie, utilizarea terenului și anotimp. Verifică sursele înainte de a te baza pe ea.',
    retry: 'Încearcă din nou',
  },
  causeCategory: {
    agricultural: 'Arderea miriștilor sau a câmpurilor',
    vegetation: 'Incendiu de iarbă sau vegetație',
    landfill: 'Incendiu la groapa de gunoi',
    wildfire: 'Incendiu de pădure',
    arson: 'Incendiere intenționată',
    lightning: 'Trăsnet',
    industrial: 'Incendiu industrial',
    unknown: 'Necunoscută',
  },
  causeConfidence: {
    high: 'mare',
    medium: 'medie',
    low: 'mică',
    none: 'deloc',
  },
  causeLand: {
    landfill: 'o groapă de gunoi',
    farmland: 'teren agricol',
    grassland: 'pajiște sau tufăriș',
    wetland: 'zonă umedă',
    forest: 'pădure',
    industrial: 'o zonă industrială',
    airport: 'un aeroport',
    residential: 'o zonă construită',
  },
  causeReason: {
    webSources: 'Relatări de pe web care o susțin: {{count}}.',
    noWebReports: 'Nu s-au găsit știri sau relatări despre aceste incendii.',
    landInside:
      'Pe {{land}}: {{fires}} din cele mai puternice {{checked}} incendii (OpenStreetMap).',
    landNear:
      'La mai puțin de 1 km de {{fires}} din cele mai puternice {{checked}} incendii: {{land}} (OpenStreetMap).',
    season: 'Incendiile au ars în {{months}}, când se ard des câmpurile.',
    recurring: 'Au mai ars incendii în aceleași locuri și în {{years}}.',
    smallFires:
      'Cel mai puternic incendiu a avut {{frp}}, puțin pentru un incendiu de pădure.',
    largeFires:
      'Cel mai puternic incendiu a avut {{frp}}, cât un incendiu de pădure.',
    tie: '{{first}} și {{second}} sunt cam la fel de probabile.',
  },
  causeWarning: {
    placesUnavailable: 'Numele locurilor nu au putut fi căutate.',
    landUseUnavailable:
      'Utilizarea terenului nu a putut fi verificată (OpenStreetMap nu a răspuns).',
    searchUnavailable: 'Căutarea pe web nu a răspuns.',
    searchSkipped: 'Nu s-au găsit nume de locuri pentru căutarea pe web.',
    translationUnavailable:
      'Traducerea nu a fost disponibilă, deci rezultatele în alte limbi nu au putut fi citite.',
  },
  causeError: {
    invalidArea: 'Această zonă nu poate fi verificată. Desenează-o din nou.',
    areaTooLarge:
      'Zona este prea mare. Desenează una mai mică (până la 25.000 km²).',
    invalidDates: 'Această perioadă nu poate fi verificată.',
    unreachable:
      'Serviciul pentru cauza incendiilor nu poate fi accesat. Rulează?',
    badAnswer:
      'Serviciul pentru cauza incendiilor a dat un răspuns neașteptat.',
    fireDataUnavailable:
      'Datele despre incendii nu au putut fi încărcate de pe serverul de hărți. Este accesibil?',
  },
  calendar: { label: 'Vizualizare calendar' },
  notFound: {
    heading: 'Pagina nu a fost găsită',
    backToMap: 'Înapoi la hartă',
  },
  pageTitles: {
    map: 'Hartă',
    calendar: 'Calendar',
    notFound: 'Pagina nu a fost găsită',
  },
} satisfies PartialTranslation
