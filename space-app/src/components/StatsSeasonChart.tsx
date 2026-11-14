import { useTranslation } from 'react-i18next'
import type { StatsFormats } from '../services/statsFormat'
import { utcDate } from '../services/statsFormat'

interface StatsSeasonChartProps {
  year: number
  /** The month that is shown (1 to 12); it gets a dot on the line of the year. */
  month: number
  /** Fires per month of the year, null where the month has no data. */
  values: readonly (number | null)[]
  /** The average fires per month over all years. */
  average: readonly (number | null)[]
  formats: StatsFormats
}

const WIDTH = 330
const HEIGHT = 150
const LEFT = 40
const RIGHT = WIDTH - 8
const TOP = 8
const BOTTOM = 116
const MONTHS = 12

/** The top of the scale: the largest value rounded up to half a power of ten. */
function scaleTop(values: readonly (number | null)[]): number {
  const max = Math.max(1, ...values.map((value) => value ?? 0))
  const magnitude = 10 ** Math.floor(Math.log10(max))
  return (Math.ceil((max / magnitude) * 2) / 2) * magnitude
}

/** SVG path of a line that is broken where a month has no value. */
function linePath(
  values: readonly (number | null)[],
  x: (index: number) => number,
  y: (value: number) => number,
): string {
  let path = ''
  let drawing = false
  values.forEach((value, index) => {
    if (value === null) {
      drawing = false
      return
    }
    path += `${drawing ? 'L' : 'M'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`
    drawing = true
  })
  return path
}

/** Fires per month over the year, against the average of all years. */
export default function StatsSeasonChart({
  year,
  month,
  values,
  average,
  formats,
}: StatsSeasonChartProps) {
  const { t } = useTranslation()
  const top = scaleTop([...values, ...average])
  const x = (index: number) => LEFT + (index * (RIGHT - LEFT)) / (MONTHS - 1)
  const y = (value: number) => BOTTOM - (value / top) * (BOTTOM - TOP)
  const marked = values[month - 1] ?? null
  return (
    <svg
      className="stats-season"
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      role="img"
      aria-label={t('stats.seasonDescription', {
        year,
        month: formats.monthName.format(utcDate(year, month)),
      })}
    >
      {[0, top / 2, top].map((tick) => (
        <g key={tick}>
          <line
            className="stats-season__grid"
            x1={LEFT}
            x2={RIGHT}
            y1={y(tick)}
            y2={y(tick)}
          />
          <text
            className="stats-season__label"
            x={LEFT - 5}
            y={y(tick) + 4}
            textAnchor="end"
          >
            {formats.compact.format(tick)}
          </text>
        </g>
      ))}
      {Array.from({ length: MONTHS }, (_, index) => (
        <text
          key={index}
          className="stats-season__label"
          x={x(index)}
          y={HEIGHT - 8}
          textAnchor="middle"
        >
          {formats.monthLetter.format(utcDate(year, index + 1))}
        </text>
      ))}
      <path
        className="stats-season__line stats-season__line--average"
        d={linePath(average, x, y)}
      />
      <path
        className="stats-season__line stats-season__line--year"
        d={linePath(values, x, y)}
      />
      {marked === null ? null : (
        <circle
          className="stats-season__dot"
          cx={x(month - 1)}
          cy={y(marked)}
          r={4.5}
        />
      )}
    </svg>
  )
}
