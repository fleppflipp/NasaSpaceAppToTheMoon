// rem values follow the user's browser font-size preference (normally 16px).
// Spacing uses a 4px base, with 8px steps for larger layout distances.
export const SPACING = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
} as const

export const FONT_FAMILY = {
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: 'ui-monospace, "Cascadia Code", "Segoe UI Mono", monospace',
} as const

export const FONT_SIZE = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.5rem',
  h1: 'clamp(2.25rem, 1.75rem + 2vw, 3.5rem)',
  h2: 'clamp(1.875rem, 1.5rem + 1vw, 2.5rem)',
  h3: 'clamp(1.5rem, 1.25rem + 0.75vw, 2rem)',
} as const

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

// Unitless line heights scale with each element's own font size.
export const LINE_HEIGHT = {
  heading: '1.2',
  compact: '1.375',
  body: '1.5',
  relaxed: '1.75',
} as const

export const LETTER_SPACING = {
  tight: '-0.02em',
  normal: '0',
  wide: '0.05em',
} as const

export const LAYOUT = {
  'container-sm': '40rem',
  container: '70rem',
  'container-wide': '80rem',
  'reading-width': '65ch',
  'grid-min': '16rem',
  'search-width': '26rem',
  'header-height': '4rem',
  'timeline-height': '3.5rem',
  // Space taken by the fixed bars at the top of every page.
  'top-offset':
    'calc(var(--layout-header-height) + var(--layout-timeline-height))',
  'page-gutter': 'clamp(var(--space-4), 4vw, var(--space-16))',
  'section-gap': 'clamp(var(--space-8), 6vw, var(--space-24))',
  'content-gap': 'var(--space-4)',
  'card-padding': 'clamp(var(--space-4), 3vw, var(--space-8))',
} as const

// Use in matchMedia, e.g. `(min-width: ${BREAKPOINTS.md})`.
// CSS custom properties cannot be used in @media conditions.
export const BREAKPOINTS = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
  '2xl': '96rem',
} as const

export const RADIUS = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '1rem',
  xl: '1.5rem',
  full: '9999px',
} as const

export const BORDER_WIDTH = {
  thin: '1px',
  strong: '2px',
} as const

export const CONTROL_SIZE = {
  'touch-target': '2.75rem',
  default: '3rem',
  large: '3.5rem',
  textarea: '8rem',
  'icon-sm': '1rem',
  icon: '1.5rem',
  'icon-lg': '2rem',
} as const

export const FOCUS = {
  width: '3px',
  offset: '3px',
} as const

export const SHADOW = {
  sm: '0 1px 2px color-mix(in srgb, var(--color-forest) 12%, transparent)',
  md: '0 4px 12px color-mix(in srgb, var(--color-forest) 14%, transparent)',
  lg: '0 12px 32px color-mix(in srgb, var(--color-forest) 18%, transparent)',
} as const

export const OPACITY = {
  disabled: '0.6',
  'selection-fill': '0.3',
} as const

export const DURATION = {
  fast: '120ms',
  normal: '200ms',
  slow: '320ms',
} as const

export const EASING = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  enter: 'cubic-bezier(0, 0, 0, 1)',
  exit: 'cubic-bezier(0.3, 0, 1, 1)',
} as const

export const Z_INDEX = {
  base: '0',
  dropdown: '100',
  sticky: '200',
  overlay: '300',
  modal: '400',
  toast: '500',
  tooltip: '600',
} as const

export const TEXT_DECORATION = {
  'underline-offset': '0.2em',
} as const

// Each group becomes CSS variables: SPACING[4] -> --space-4.
export const DESIGN_TOKENS = {
  space: SPACING,
  'font-family': FONT_FAMILY,
  'font-size': FONT_SIZE,
  'font-weight': FONT_WEIGHT,
  'line-height': LINE_HEIGHT,
  'letter-spacing': LETTER_SPACING,
  layout: LAYOUT,
  radius: RADIUS,
  'border-width': BORDER_WIDTH,
  'control-size': CONTROL_SIZE,
  focus: FOCUS,
  shadow: SHADOW,
  opacity: OPACITY,
  duration: DURATION,
  easing: EASING,
  'z-index': Z_INDEX,
  'text-decoration': TEXT_DECORATION,
} as const
