import { STAR_FIELD } from '../constants/space.constants'
import { makeStars } from '../services/stars'
import './SpaceBackdrop.css'

// Generated once: the same sky on every render and every load.
const STARS = makeStars(
  STAR_FIELD.count,
  STAR_FIELD.width,
  STAR_FIELD.height,
  STAR_FIELD.seed,
)

/** Decorative dark space with stars behind the globe. */
export default function SpaceBackdrop() {
  return (
    <div className="space-backdrop" aria-hidden="true">
      {/* "slice" covers the whole area and keeps the stars round. */}
      <svg
        className="space-stars"
        viewBox={`0 0 ${String(STAR_FIELD.width)} ${String(STAR_FIELD.height)}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {STARS.map((star, index) => (
          <circle
            key={index}
            className={`space-star${star.tinted ? ' space-star--tinted' : ''}${
              star.twinkles ? ' space-star--twinkle' : ''
            }`}
            cx={star.x}
            cy={star.y}
            r={star.r}
            opacity={star.opacity}
          />
        ))}
      </svg>
    </div>
  )
}
