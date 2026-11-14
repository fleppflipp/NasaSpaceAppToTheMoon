import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'མཐོང་སྣང་', map: 'ས་བཀོད།', calendar: 'ལོ་ཐོ།' },
  search: {
    label: 'ས་ཁོངས་ཅིག་འཚོལ།',
    button: 'འཚོལ།',
    noResults: 'ས་ཁོངས་ཅིག་ཡང་མ་ཐོབ།',
    error: 'འཚོལ་ནི་འཐུས་ཤོར་སོང་། ཡང་བསྐྱར་འབད།',
  },
  map: {
    title: 'ས་བཀོད།',
    zoomIn: 'ཆེ་རུ་གཏང་།',
    zoomOut: 'ཆུང་དུ་གཏང་།',
    attribution: 'འབྱུང་ཁུངས་སྟོན་ ཡང་ན་སྦ།',
    feedback: 'ས་བཀོད་ཀྱི་བསམ་འཆར།',
  },
  draw: {
    draw: 'ས་ཁོངས་ཅིག་འབྲི།',
    cancel: 'འབྲི་ནི་ཆ་མེད་གཏང་།',
    remove: 'གདམ་ཁ་བསུབ།',
    zoomHint: 'ས་ཁོངས་གདམ་ནི་ལུ་ཆེ་རུ་གཏང་།',
    zoomHintTitle: 'ས་ཁོངས་གདམ་ནི་ལུ་ཆེ་རུ་གཏང་། ({{zoom}}+)',
    closeShape: 'ས་ཁོངས་གདམ་ནི་ལུ་རྣམ་པ་ཁ་བསྡམ།',
    selectedArea: 'གདམ་ཀྱི་ས་ཁོངས། {{area}}',
  },
  language: {
    label: 'སྐད་ཡིག',
    placeholder: 'སྐད་ཡིག ཡང་ན་ ཨང་རྟགས།',
    noResults: 'སྐད་ཡིག་ཅིག་ཡང་མ་ཐོབ།',
  },
  calendar: { label: 'ལོ་ཐོའི་མཐོང་སྣང་།' },
  notFound: { heading: 'ཤོག་ངོས་མ་ཐོབ།', backToMap: 'ས་བཀོད་ལུ་ལོག' },
  pageTitles: { map: 'ས་བཀོད།', calendar: 'ལོ་ཐོ།', notFound: 'ཤོག་ངོས་མ་ཐོབ།' },
} satisfies PartialTranslation
