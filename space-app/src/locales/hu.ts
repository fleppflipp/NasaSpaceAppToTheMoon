import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Nézet', map: 'Térkép', calendar: 'Naptár' },
  search: {
    label: 'Hely keresése',
    button: 'Keresés',
    noResults: 'Nem található hely.',
    error: 'A keresés nem sikerült. Próbáld újra.',
  },
  map: {
    title: 'Térkép',
    zoomIn: 'Nagyítás',
    zoomOut: 'Kicsinyítés',
    attribution: 'Forrásmegjelölés be/ki',
    feedback: 'Visszajelzés a térképről',
  },
  draw: {
    draw: 'Terület rajzolása',
    cancel: 'Rajzolás megszakítása',
    remove: 'Kijelölés törlése',
    zoomHint: 'Nagyíts rá a terület kijelöléséhez',
    zoomHintTitle:
      'Nagyíts rá a terület kijelöléséhez (legalább {{zoom}}-es nagyítás)',
    closeShape: 'Zárd be az alakzatot a terület kijelöléséhez',
    selectedArea: 'Kijelölt terület: {{area}}',
  },
  language: {
    label: 'Nyelv',
    placeholder: 'Nyelv vagy kód',
    noResults: 'Nincs ilyen nyelv.',
  },
  fires: { noData: 'Erre az időszakra még nincs tűzadat.' },
  timeline: {
    label: 'Időszak',
    year: 'Év',
    week: 'Hét',
    range: '{{start}} – {{end}}',
  },
  cause: {
    heading: 'Tüzek a kijelölt területen',
    loadingFires: 'Tüzek keresése…',
    noFires: 'A kiválasztott héten nem volt tűz ezen a területen.',
    fires: 'Tüzek',
    dates: 'Dátumok',
    totalFrp: 'Teljes tűzteljesítmény',
    maxFrp: 'Legerősebb tűz',
    frp: '{{value}} MW',
    near: '{{place}} közelében',
    placeInCountry: '{{place}}, {{country}}',
    photoAlt: 'Fotó a híradásból: {{title}}',
    photoCredit: 'Fotó:',
    photoNote:
      'Egy erre a helyre és évre illő híradásból; lehet, hogy egy közeli tüzet mutat.',
    find: 'Valószínű ok keresése',
    finding: 'Térképek és a web ellenőrzése. Ez akár egy percig is tarthat.',
    likelyCause: 'Valószínű ok',
    confidence: 'Megbízhatóság: {{level}}',
    why: 'Miért',
    sources: 'Webes források',
    matched: 'Egyezések: {{phrases}}',
    original: 'Eredeti szöveg',
    translated: 'Automatikusan angolra fordítva.',
    disclaimer:
      'Becslés kulcsszó-szabályok, földhasználat és évszak alapján. Mielőtt hagyatkozol rá, nézd meg a forrásokat.',
    retry: 'Újra',
  },
  causeCategory: {
    agricultural: 'Tarló- vagy mezőégetés',
    vegetation: 'Fű- vagy avartűz',
    landfill: 'Hulladéklerakó- vagy szeméttűz',
    wildfire: 'Erdőtűz',
    arson: 'Gyújtogatás',
    lightning: 'Villámcsapás',
    industrial: 'Ipari tűz',
    unknown: 'Ismeretlen',
  },
  causeConfidence: {
    high: 'magas',
    medium: 'közepes',
    low: 'alacsony',
    none: 'nincs',
  },
  causeLand: {
    landfill: 'hulladéklerakó',
    farmland: 'szántóföld',
    grassland: 'gyep vagy bozót',
    wetland: 'vizes élőhely',
    forest: 'erdő',
    industrial: 'ipari terület',
    airport: 'repülőtér',
    residential: 'beépített terület',
  },
  causeReason: {
    webSources: 'Ezt alátámasztó webes beszámolók: {{count}}.',
    noWebReports: 'Nem található hír vagy webes beszámoló ezekről a tüzekről.',
    landInside:
      'A {{checked}} legerősebb tűzből {{fires}} itt van: {{land}} (OpenStreetMap).',
    landNear:
      'A {{checked}} legerősebb tűzből {{fires}} 1 km-es körzetében: {{land}} (OpenStreetMap).',
    season: 'A tüzek ekkor égtek: {{months}}, amikor gyakran égetnek tarlót.',
    recurring: 'Ugyanezeken a helyeken ekkor is égett: {{years}}.',
    smallFires: 'A legerősebb tűz {{frp}} volt, ez kevés egy erdőtűzhöz.',
    largeFires: 'A legerősebb tűz {{frp}} volt, akkora, mint egy erdőtűz.',
    tie: '{{first}} és {{second}} nagyjából egyformán valószínű.',
  },
  causeWarning: {
    placesUnavailable: 'A helyneveket nem sikerült lekérdezni.',
    landUseUnavailable:
      'A földhasználatot nem sikerült ellenőrizni (az OpenStreetMap nem válaszolt).',
    searchUnavailable: 'A webes keresés nem válaszolt.',
    searchSkipped:
      'Nem találtunk helynevet, amivel a weben kereshettünk volna.',
    translationUnavailable:
      'A fordítás nem volt elérhető, így a más nyelvű találatokat nem lehetett elolvasni.',
  },
  causeError: {
    invalidArea: 'Ez a terület nem ellenőrizhető. Rajzold meg újra.',
    areaTooLarge:
      'A terület túl nagy. Rajzolj kisebbet (legfeljebb 25 000 km²).',
    invalidDates: 'Ez az időszak nem ellenőrizhető.',
    unreachable: 'A tűzok-szolgáltatás nem érhető el. Fut?',
    badAnswer: 'A tűzok-szolgáltatás váratlan választ adott.',
    fireDataUnavailable:
      'A tűzadatokat nem sikerült betölteni a csempeszerverről. Elérhető?',
  },
  calendar: { label: 'Naptár nézet' },
  notFound: {
    heading: 'Az oldal nem található',
    backToMap: 'Vissza a térképre',
  },
  pageTitles: {
    map: 'Térkép',
    calendar: 'Naptár',
    notFound: 'Az oldal nem található',
  },
} satisfies PartialTranslation
