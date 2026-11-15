import type { StatsFormats } from '../services/statsFormat'

export interface SplitPart {
  label: string
  count: number
  /** CSS color of the segment, for example `var(--color-fire-mid)`. */
  color: string
}

interface StatsSplitBarProps {
  parts: readonly SplitPart[]
  formats: StatsFormats
}

/** One bar split into shares, with a legend that gives each share in percent. */
export default function StatsSplitBar({ parts, formats }: StatsSplitBarProps) {
  const total = parts.reduce((sum, part) => sum + part.count, 0)
  const share = (count: number) => (total === 0 ? 0 : count / total)
  const description = parts
    .map((part) => `${part.label} ${formats.share.format(share(part.count))}`)
    .join(', ')
  return (
    <>
      <div className="stats-split" role="img" aria-label={description}>
        {parts.map((part) => (
          <span
            key={part.label}
            className="stats-split__part"
            style={{ flexGrow: share(part.count), background: part.color }}
          />
        ))}
      </div>
      <ul className="stats-legend">
        {parts.map((part) => (
          <li key={part.label}>
            <i
              className="stats-legend__swatch"
              style={{ background: part.color }}
            />
            {part.label} {formats.share.format(share(part.count))}
          </li>
        ))}
      </ul>
    </>
  )
}
