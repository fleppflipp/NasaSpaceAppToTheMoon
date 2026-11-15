# Shared design values

`src/constants/colorpallette.constatns.ts` defines the color palette.
`src/constants/design.constants.ts` defines all other shared design values.
Edit these files to change the application's design consistently.

`applyDesignTokens()` in `src/main.tsx` publishes the constants as CSS custom
properties before React renders. `src/index.css` uses these variables for the
global styles and shared layout classes. Components can import the same constants
from TypeScript. Do not duplicate their values in component styles.

## Colors

The palette is a cool blue-grey, royal blue, deep navy and a soft lavender grey.
Components use the role variables from `src/index.css`, not the raw colors:

| Role variable        | Palette color | Value     | Used for                              |
| -------------------- | ------------- | --------- | ------------------------------------- |
| `--color-background` | `grey`        | `#d8dce4` | Page, panels, inputs                  |
| `--color-text`       | `navy`        | `#101c4a` | Text, button hover                    |
| `--color-primary`    | `royal`       | `#22398f` | Buttons, borders, links, active items |
| `--color-accent`     | `navy`        | `#101c4a` | Focus ring, active tool, emphasis     |
| `--color-highlight`  | `lavender`    | `#c9cee0` | Hover rows, dividers, tracks          |

The map selection is royal blue with a navy outline. The fire colors
(`fire-*`, yellow to dark red) carry data meaning and are not part of the
brand palette.

## Spacing

Use the same scale for `margin`, `padding`, `gap`, and positional offsets.
The scale uses a 4px base and larger 8px steps, expressed in `rem` to respect
the user's browser font settings. The pixel equivalents below assume a 16px root.
This is our project convention, informed by the
[Material Design layout grid](https://m2.material.io/design/layout/understanding-layout.html).

| Token        | rem  | Default px |
| ------------ | ---- | ---------- |
| `--space-0`  | 0    | 0          |
| `--space-1`  | 0.25 | 4          |
| `--space-2`  | 0.5  | 8          |
| `--space-3`  | 0.75 | 12         |
| `--space-4`  | 1    | 16         |
| `--space-5`  | 1.25 | 20         |
| `--space-6`  | 1.5  | 24         |
| `--space-8`  | 2    | 32         |
| `--space-10` | 2.5  | 40         |
| `--space-12` | 3    | 48         |
| `--space-16` | 4    | 64         |
| `--space-20` | 5    | 80         |
| `--space-24` | 6    | 96         |
| `--space-32` | 8    | 128        |

Prefer `margin-inline`, `margin-block`, `padding-inline`, and `padding-block`
when appropriate, so layouts also support different writing directions.

## Typography

The body uses `--font-size-base` (1rem) with `--line-height-body` (1.5).
Font sizes `xs` through `6xl`, regular/medium/semibold/bold weights, sans/mono
families, and tight/normal/wide letter spacing are available.
`--font-size-h1`, `--font-size-h2`, and `--font-size-h3` use `clamp()` with
rem bounds for fluid headings. Heading line height is 1.2; body and relaxed
line heights are 1.5 and 1.75. Line heights are unitless.

Use `--layout-reading-width` (65ch) for long-form text. Avoid fixed heights on
text containers. The [WCAG text spacing criterion](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
requires content to tolerate user spacing overrides; it does not mandate a
particular default font size or default line height. These tokens are project
defaults, not a claim of complete accessibility conformance.

## Token groups

| TypeScript export | CSS prefix            | Purpose                                                   |
| ----------------- | --------------------- | --------------------------------------------------------- |
| `SPACING`         | `--space-*`           | Margin, padding, gaps                                     |
| `FONT_FAMILY`     | `--font-family-*`     | Sans and monospace stacks                                 |
| `FONT_SIZE`       | `--font-size-*`       | Text and responsive heading sizes                         |
| `FONT_WEIGHT`     | `--font-weight-*`     | Font weights                                              |
| `LINE_HEIGHT`     | `--line-height-*`     | Unitless line heights                                     |
| `LETTER_SPACING`  | `--letter-spacing-*`  | Letter spacing                                            |
| `LAYOUT`          | `--layout-*`          | Container widths, gutters, sections, cards, reading width |
| `RADIUS`          | `--radius-*`          | Corners, from square to pill                              |
| `BORDER_WIDTH`    | `--border-width-*`    | 1px and 2px borders                                       |
| `CONTROL_SIZE`    | `--control-size-*`    | Touch targets, controls, icons, textarea minimum height   |
| `FOCUS`           | `--focus-*`           | Focus ring width and offset                               |
| `SHADOW`          | `--shadow-*`          | Small, medium, and large elevation using the palette      |
| `OPACITY`         | `--opacity-*`         | Disabled state, area selection fill                       |
| `DURATION`        | `--duration-*`        | Fast, normal, and slow transitions                        |
| `EASING`          | `--easing-*`          | Standard, enter, and exit motion curves                   |
| `Z_INDEX`         | `--z-index-*`         | Dropdown, sticky, overlay, modal, toast, tooltip          |
| `TEXT_DECORATION` | `--text-decoration-*` | Link underline offset                                     |
| `BREAKPOINTS`     | TypeScript only       | Named viewport thresholds for `matchMedia`                |

Default buttons have a minimum height of 3rem and minimum width of 2.75rem,
equivalent to 48px and 44px at the default root size. They can grow when text
wraps. The [WCAG enhanced target-size criterion](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
uses 44 CSS pixels; the [AA minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
uses 24 CSS pixels with exceptions. Inline text links retain normal text flow.

Transitions only run under `prefers-reduced-motion: no-preference`.
Preserve this behavior when adding motion.

## Usage

```css
.example-panel {
  margin-block-end: var(--space-8);
  padding: var(--layout-card-padding);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  line-height: var(--line-height-body);
  box-shadow: var(--shadow-sm);
}
```

```tsx
import { SPACING } from './constants/design.constants'

export function Example() {
  return <div style={{ padding: SPACING[6] }}>Content</div>
}
```

Available shared classes:

| Class           | Behavior                                                        |
| --------------- | --------------------------------------------------------------- |
| `.stack`        | Vertical layout with a shared gap and normalized child margins  |
| `.cluster`      | Wrapping horizontal layout with consistent gaps                 |
| `.grid`         | Responsive grid that fits available space without media queries |
| `.section`      | Fluid vertical section padding                                  |
| `.prose`        | Reading width limited to 65ch                                   |
| `.card`         | Shared padding, border, radius, and shadow                      |
| `.form-control` | Text input/select/textarea sizing and appearance                |

Apply `.form-control` to text-like inputs, selects, and textareas, not checkboxes
or radio buttons.

```tsx
<section className="section stack">
  <h2>Section title</h2>
  <div className="grid">
    <article className="card stack">
      <h3>Card title</h3>
      <p>Content</p>
    </article>
  </div>
</section>
```

`BREAKPOINTS` provides `sm` (40rem), `md` (48rem), `lg` (64rem), `xl` (80rem),
and `2xl` (96rem). Use `window.matchMedia` with these exported values when
JavaScript needs a viewport threshold. CSS custom properties cannot be used
inside `@media` conditions. Prefer the fluid layout tokens and `.grid` for CSS
layouts rather than duplicating breakpoint values.

Structural CSS values such as `100%`, `auto`, `1fr`, and `100svh` remain in CSS;
they describe layout behavior rather than design scale values.
