import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Տեսք', map: 'Քարտեզ', calendar: 'Օրացույց' },
  search: {
    label: 'Որոնել վայր',
    button: 'Որոնել',
    noResults: 'Վայր չի գտնվել։',
    error: 'Որոնումը ձախողվեց։ Կրկին փորձեք։',
  },
  map: {
    title: 'Քարտեզ',
    zoomIn: 'Մեծացնել',
    zoomOut: 'Փոքրացնել',
    attribution: 'Ցույց տալ կամ թաքցնել աղբյուրները',
    feedback: 'Կարծիք քարտեզի մասին',
  },
  draw: {
    draw: 'Գծել տարածք',
    cancel: 'Չեղարկել գծելը',
    remove: 'Հեռացնել ընտրությունը',
    zoomHint: 'Մեծացրեք՝ տարածք ընտրելու համար',
    zoomHintTitle: 'Մեծացրեք՝ տարածք ընտրելու համար ({{zoom}}+)',
    closeShape: 'Փակեք պատկերը՝ տարածք ընտրելու համար',
    selectedArea: 'Ընտրված տարածք՝ {{area}}',
  },
  language: {
    label: 'Լեզու',
    placeholder: 'Լեզու կամ կոդ',
    noResults: 'Լեզու չի գտնվել։',
  },
  calendar: { label: 'Օրացույցի տեսք' },
  notFound: { heading: 'Էջը չի գտնվել', backToMap: 'Վերադառնալ քարտեզին' },
  pageTitles: {
    map: 'Քարտեզ',
    calendar: 'Օրացույց',
    notFound: 'Էջը չի գտնվել',
  },
} satisfies PartialTranslation
