import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import i18n, { i18nReady } from './i18n'
import { applyDesignTokens } from './styles/apply-design-tokens'
import './index.css'

applyDesignTokens()

const root = document.getElementById('root')

if (root === null) {
  throw new Error('Missing root element')
}

await i18nReady
document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
