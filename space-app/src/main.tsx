import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { COLOR_PALETTE } from './constants/colorpallette.constatns'
import './index.css'

for (const [name, color] of Object.entries(COLOR_PALETTE)) {
  document.documentElement.style.setProperty(`--color-${name}`, color)
}

const root = document.getElementById('root')

if (root === null) {
  throw new Error('Missing root element')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
