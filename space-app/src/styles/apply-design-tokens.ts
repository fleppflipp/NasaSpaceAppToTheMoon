import { COLOR_PALETTE } from '../constants/colorpallette.constatns'
import { DESIGN_TOKENS } from '../constants/design.constants'

export function applyDesignTokens(
  element: HTMLElement = document.documentElement,
): void {
  const groups = { color: COLOR_PALETTE, ...DESIGN_TOKENS }

  for (const [group, tokens] of Object.entries(groups)) {
    for (const [name, value] of Object.entries(tokens)) {
      element.style.setProperty(`--${group}-${name}`, value)
    }
  }
}
