import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'پیشاندان', map: 'نەخشە', calendar: 'ڕۆژژمێر' },
  search: {
    label: 'شوێنێک بدۆزەرەوە',
    button: 'گەڕان',
    noResults: 'هیچ شوێنێک نەدۆزرایەوە.',
    error: 'گەڕان سەرکەوتوو نەبوو. دووبارە هەوڵ بدەرەوە.',
  },
  map: {
    title: 'نەخشە',
    zoomIn: 'گەورەکردن',
    zoomOut: 'بچووککردنەوە',
    attribution: 'سەرچاوەکان پیشان بدە یان بیانشارەوە',
    feedback: 'ڕای تۆ دەربارەی نەخشە',
  },
  draw: {
    draw: 'ناوچەیەک بکێشە',
    cancel: 'هەڵوەشاندنەوەی کێشان',
    remove: 'لابردنی هەڵبژاردن',
    zoomHint: 'گەورەی بکە بۆ هەڵبژاردنی ناوچەیەک',
    zoomHintTitle: 'گەورەی بکە بۆ هەڵبژاردنی ناوچەیەک ({{zoom}}+)',
    closeShape: 'شێوەکە دابخە بۆ هەڵبژاردنی ناوچەیەک',
    selectedArea: 'ناوچەی هەڵبژێردراو: {{area}}',
  },
  language: {
    label: 'زمان',
    placeholder: 'زمان یان کۆد',
    noResults: 'هیچ زمانێک نەدۆزرایەوە.',
  },
  calendar: { label: 'پیشاندانی ڕۆژژمێر' },
  notFound: { heading: 'پەڕە نەدۆزرایەوە', backToMap: 'گەڕانەوە بۆ نەخشە' },
  pageTitles: {
    map: 'نەخشە',
    calendar: 'ڕۆژژمێر',
    notFound: 'پەڕە نەدۆزرایەوە',
  },
} satisfies PartialTranslation
