import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { eng } from '../locales/eng'
export const i18nReady = i18n.use(initReactI18next).init({
  resources: { en: { translation: eng } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})
export default i18n
