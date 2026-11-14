import 'i18next'
import type { eng } from '../locales/eng'
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof eng }
  }
}
