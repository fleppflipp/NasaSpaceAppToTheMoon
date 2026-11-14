import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'ތަނެއް ހޯދާ',
    button: 'ހޯދާ',
    noResults: 'އެއްވެސް ތަނެއް ނުފެނުނު.',
    error: 'ހޯދުން ފެއިލްވި. އަލުން މަސައްކަތް ކުރައްވާ.',
  },
  map: {
    title: 'ނަޤްޝާ',
    zoomIn: 'ބޮޑުކުރޭ',
    zoomOut: 'ކުޑަކުރޭ',
    attribution: 'ސޯސް ދައްކާ ނުވަތަ ފޮރުވާ',
    feedback: 'ނަޤްޝާއާ ބެހޭ ފީޑްބެކް',
  },
  draw: {
    draw: 'ސަރަހައްދެއް ދެމާ',
    cancel: 'ދެމުން ކެންސަލް ކުރޭ',
    remove: 'ޚިޔާރު ނައްތާލާ',
    zoomHint: 'ސަރަހައްދެއް ޚިޔާރުކުރުމަށް ބޮޑުކުރޭ',
    zoomHintTitle: 'ސަރަހައްދެއް ޚިޔާރުކުރުމަށް ބޮޑުކުރޭ ({{zoom}}+)',
    closeShape: 'ސަރަހައްދެއް ޚިޔާރުކުރުމަށް ޝޭޕް ބަންދުކުރޭ',
    selectedArea: 'ޚިޔާރުކުރެވުނު ސަރަހައްދު: {{area}}',
  },
  language: {
    label: 'ބަސް',
    placeholder: 'ބަސް ނުވަތަ ކޯޑު',
    noResults: 'އެއްވެސް ބަހެއް ނުފެނުނު.',
  },
  notFound: { heading: 'ޕޭޖު ނުފެނުނު', backToMap: 'ނަޤްޝާއަށް ވޭތުވެ' },
} satisfies PartialTranslation
