import type { PartialTranslation } from './eng'

export default {
  search: {
    label: 'နေရာတစ်ခု ရှာပါ',
    button: 'ရှာရန်',
    noResults: 'နေရာ မတွေ့ပါ။',
    error: 'ရှာဖွေမှု မအောင်မြင်ပါ။ ထပ်စမ်းကြည့်ပါ။',
  },
  map: {
    title: 'မြေပုံ',
    zoomIn: 'ချဲ့ရန်',
    zoomOut: 'ချုံ့ရန်',
    attribution: 'ရင်းမြစ်များ ပြရန် သို့မဟုတ် ဖျောက်ရန်',
    feedback: 'မြေပုံအကြောင်း တုံ့ပြန်ချက်',
  },
  draw: {
    draw: 'ဧရိယာတစ်ခု ဆွဲပါ',
    cancel: 'ဆွဲခြင်း ပယ်ဖျက်ပါ',
    remove: 'ရွေးချယ်မှု ဖယ်ရှားပါ',
    zoomHint: 'ဧရိယာရွေးရန် ချဲ့ပါ',
    zoomHintTitle: 'ဧရိယာရွေးရန် ချဲ့ပါ ({{zoom}}+)',
    closeShape: 'ဧရိယာရွေးရန် ပုံသဏ္ဌာန်ကို ပိတ်ပါ',
    selectedArea: 'ရွေးထားသော ဧရိယာ- {{area}}',
  },
  language: {
    label: 'ဘာသာစကား',
    placeholder: 'ဘာသာစကား သို့မဟုတ် ကုဒ်',
    noResults: 'ဘာသာစကား မတွေ့ပါ။',
  },
  notFound: { heading: 'စာမျက်နှာ မတွေ့ပါ', backToMap: 'မြေပုံသို့ ပြန်သွားရန်' },
} satisfies PartialTranslation
