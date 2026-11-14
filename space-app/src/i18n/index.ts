import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  isLanguageCode,
} from '../constants/languages.constants'
import type { LanguageCode } from '../constants/languages.constants'
import { eng } from '../locales/eng'
import type { Translation } from '../locales/eng'

// English is bundled (it is the fallback); every other dictionary is loaded
// the first time its language is chosen.
const dictionaryLoaders = import.meta.glob<{ default: Translation }>(
  '../locales/*.ts',
)

/** The language chosen earlier, if storage is available and holds a valid one. */
function readStoredLanguage(): LanguageCode | null {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguageCode(stored) ? stored : null
  } catch {
    return null
  }
}

/** The first browser language we support (e.g. "hu-HU" gives "hu"). */
function readBrowserLanguage(): LanguageCode | null {
  for (const tag of navigator.languages) {
    const lower = tag.toLowerCase()
    const exact = LANGUAGES.find(
      (language) => language.code.toLowerCase() === lower,
    )
    if (exact) {
      return exact.code
    }
    const base = lower.split('-')[0] ?? lower
    const matched = LANGUAGES.find((language) => language.code === base)
    if (matched) {
      return matched.code
    }
  }
  return null
}

/** Makes sure the dictionary of a language is loaded. */
async function loadLanguage(code: LanguageCode): Promise<void> {
  if (
    code === DEFAULT_LANGUAGE ||
    i18n.hasResourceBundle(code, 'translation')
  ) {
    return
  }
  const load = dictionaryLoaders[`../locales/${code}.ts`]
  if (load === undefined) {
    return
  }
  const dictionary = await load()
  i18n.addResourceBundle(code, 'translation', dictionary.default)
}

/** Loads a language if needed and switches the whole UI to it. */
export async function setLanguage(code: LanguageCode): Promise<void> {
  await loadLanguage(code)
  await i18n.changeLanguage(code)
}

export const i18nReady = i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: eng } },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
  })
  .then(() =>
    setLanguage(
      readStoredLanguage() ?? readBrowserLanguage() ?? DEFAULT_LANGUAGE,
    ),
  )

i18n.on('languageChanged', (language) => {
  const direction =
    LANGUAGES.find((entry) => entry.code === language)?.dir ?? 'ltr'
  document.documentElement.lang = language
  document.documentElement.dir = direction
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Storage can be blocked; the choice then only lasts for this visit.
  }
})

export default i18n
