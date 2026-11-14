/**
 * Languages the UI is shown in. Every one is translated completely: the
 * interface, the statistics and the country names (from `Intl.DisplayNames`).
 * Each has a dictionary in `src/locales/<code>.ts` (typed with
 * `satisfies Translation`, so a missing key is a type error).
 * To add one: create the locale file, add an entry here (flag = a country code
 * from flag-icons) and it appears in the language picker. Locale files are
 * loaded on demand.
 */
export const LANGUAGES = [
  {
    code: 'en',
    short: 'EN',
    name: 'English',
    english: 'English',
    flag: 'gb',
    dir: 'ltr',
    keywords: ['english', 'united', 'kingdom', 'america', 'usa', 'india'],
  },
  {
    code: 'ro',
    short: 'RO',
    name: 'Română',
    english: 'Romanian',
    flag: 'ro',
    dir: 'ltr',
    keywords: ['romanian', 'romania', 'moldova'],
  },
  {
    code: 'hu',
    short: 'HU',
    name: 'Magyar',
    english: 'Hungarian',
    flag: 'hu',
    dir: 'ltr',
    keywords: ['hungarian', 'hungary', 'magyarorszag'],
  },
  {
    code: 'de',
    short: 'DE',
    name: 'Deutsch',
    english: 'German',
    flag: 'de',
    dir: 'ltr',
    keywords: ['german', 'germany', 'austria', 'switzerland', 'deutschland'],
  },
  {
    code: 'fr',
    short: 'FR',
    name: 'Français',
    english: 'French',
    flag: 'fr',
    dir: 'ltr',
    keywords: ['french', 'france', 'belgium', 'canada', 'francais'],
  },
  {
    code: 'es',
    short: 'ES',
    name: 'Español',
    english: 'Spanish',
    flag: 'es',
    dir: 'ltr',
    keywords: ['spanish', 'spain', 'mexico', 'argentina', 'espanol'],
  },
  {
    code: 'zh',
    short: 'ZH',
    name: '中文',
    english: 'Chinese',
    flag: 'cn',
    dir: 'ltr',
    keywords: ['chinese', 'china', 'mandarin', 'zhongwen'],
  },
  {
    code: 'hi',
    short: 'HI',
    name: 'हिन्दी',
    english: 'Hindi',
    flag: 'in',
    dir: 'ltr',
    keywords: ['hindi', 'india', 'bharat'],
  },
] as const

export type Language = (typeof LANGUAGES)[number]
export type LanguageCode = Language['code']

export const DEFAULT_LANGUAGE: LanguageCode = 'en'

/** localStorage key that remembers the chosen language. */
export const LANGUAGE_STORAGE_KEY = 'firelock.language'

export function isLanguageCode(value: unknown): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value)
}
