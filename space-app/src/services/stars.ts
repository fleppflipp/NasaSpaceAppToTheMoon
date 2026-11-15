export interface Star {
  x: number
  y: number
  r: number
  opacity: number
  /** Drawn in the soft lavender instead of white. */
  tinted: boolean
  /** Slowly fades in and out. */
  twinkles: boolean
}

/** Small seeded random generator (mulberry32): the same sky on every load. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random stars inside a `width` x `height` box; most are small and faint. */
export function makeStars(
  count: number,
  width: number,
  height: number,
  seed: number,
): Star[] {
  const random = seededRandom(seed)
  return Array.from({ length: count }, () => {
    const size = random() ** 3 // many tiny stars, a few bright ones
    return {
      x: random() * width,
      y: random() * height,
      r: 0.6 + size * 1.6,
      opacity: 0.35 + size * 0.6,
      tinted: random() < 0.3,
      twinkles: random() < 0.25,
    }
  })
}
