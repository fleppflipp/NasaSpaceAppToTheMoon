import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'இடத்தைத் தேடுங்கள்',
    button: 'தேடு',
    noResults: 'எந்த இடமும் கிடைக்கவில்லை.',
    error: 'தேடல் தோல்வியடைந்தது. மீண்டும் முயலவும்.',
  },
  map: {
    title: 'வரைபடம்',
    zoomIn: 'பெரிதாக்கு',
    zoomOut: 'சிறிதாக்கு',
    attribution: 'மூலங்களைக் காட்டு அல்லது மறை',
    feedback: 'வரைபடம் குறித்த கருத்து',
  },
  draw: {
    draw: 'ஒரு பகுதியை வரையுங்கள்',
    cancel: 'வரைவதை ரத்து செய்',
    remove: 'தேர்வை நீக்கு',
    zoomHint: 'பகுதியைத் தேர்ந்தெடுக்க பெரிதாக்குங்கள்',
    zoomHintTitle: 'பகுதியைத் தேர்ந்தெடுக்க பெரிதாக்குங்கள் ({{zoom}}+)',
    closeShape: 'பகுதியைத் தேர்ந்தெடுக்க வடிவத்தை மூடுங்கள்',
    selectedArea: 'தேர்ந்தெடுக்கப்பட்ட பகுதி: {{area}}',
  },
  language: {
    label: 'மொழி',
    placeholder: 'மொழி அல்லது குறியீடு',
    noResults: 'எந்த மொழியும் கிடைக்கவில்லை.',
  },
  notFound: { heading: 'பக்கம் கிடைக்கவில்லை', backToMap: 'வரைபடத்திற்குத் திரும்பு' },
} satisfies PartialTranslation
