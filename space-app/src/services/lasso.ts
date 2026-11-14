// Pure geometry for the freehand area selection. Works on screen pixel
// coordinates only; converting the resulting ring to lng/lat is the caller's
// job (map.unproject), so this is correct for every map projection.

export interface Point {
  x: number
  y: number
}

export interface LassoOptions {
  /** End within this distance of the start closes the stroke (px). */
  closeDistance: number
  /** Smallest accepted enclosed area (px²). */
  minArea: number
}

/** Candidate loops that are checked for simplicity, largest area first. */
const MAX_CANDIDATES = 24

/** Intersection of segments a1-a2 and b1-b2, or null (parallel/touching ends excluded). */
export function segmentIntersection(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
): Point | null {
  const rx = a2.x - a1.x
  const ry = a2.y - a1.y
  const sx = b2.x - b1.x
  const sy = b2.y - b1.y
  const denominator = rx * sy - ry * sx
  if (denominator === 0) {
    return null
  }
  const qx = b1.x - a1.x
  const qy = b1.y - a1.y
  const t = (qx * sy - qy * sx) / denominator
  const u = (qx * ry - qy * rx) / denominator
  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return null
  }
  return { x: a1.x + t * rx, y: a1.y + t * ry }
}

/** Absolute polygon area (shoelace). The ring may be open or closed. */
export function ringArea(ring: readonly Point[]): number {
  let sum = 0
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index]
    const next = ring[(index + 1) % ring.length]
    if (current !== undefined && next !== undefined) {
      sum += current.x * next.y - next.x * current.y
    }
  }
  return Math.abs(sum) / 2
}

/**
 * True when no two non-adjacent edges of the (implicitly closed) ring cross.
 * Checks every edge pair, so use it only on a handful of candidate rings.
 */
export function isSimpleRing(ring: readonly Point[]): boolean {
  const count = ring.length
  for (let i = 0; i < count; i += 1) {
    const a1 = ring[i]
    const a2 = ring[(i + 1) % count]
    if (a1 === undefined || a2 === undefined) {
      continue
    }
    for (let j = i + 2; j < count; j += 1) {
      if (i === 0 && j === count - 1) {
        continue // the closing edge is adjacent to the first edge
      }
      const b1 = ring[j]
      const b2 = ring[(j + 1) % count]
      if (b1 !== undefined && b2 !== undefined) {
        if (segmentIntersection(a1, a2, b1, b2) !== null) {
          return false
        }
      }
    }
  }
  return true
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Turns a freehand stroke into a closed ring (screen px), or null when the
 * stroke does not enclose an area.
 *
 * Candidates are (1) every loop between a self-intersection point and the end
 * of the intersecting segment, and (2) the whole stroke when its end is close
 * to its start. Only simple rings (no crossings left) with at least
 * `minArea` px² qualify, and the largest one wins. The result is closed:
 * first position equals last position, at least 4 positions.
 */
export function closeStroke(
  stroke: readonly Point[],
  options: LassoOptions,
): Point[] | null {
  const count = stroke.length
  if (count < 3) {
    return null
  }

  const candidates: { ring: Point[]; area: number }[] = []
  const add = (ring: Point[]) => {
    const area = ringArea(ring)
    if (area >= options.minArea) {
      candidates.push({ ring, area })
    }
  }

  // Segment k runs from stroke[k] to stroke[k + 1]; compare segment j with all
  // earlier, non-adjacent segments i.
  for (let j = 2; j < count - 1; j += 1) {
    const b1 = stroke[j]
    const b2 = stroke[j + 1]
    if (b1 === undefined || b2 === undefined) {
      continue
    }
    for (let i = 0; i <= j - 2; i += 1) {
      const a1 = stroke[i]
      const a2 = stroke[i + 1]
      if (a1 === undefined || a2 === undefined) {
        continue
      }
      const crossing = segmentIntersection(a1, a2, b1, b2)
      if (crossing !== null) {
        // Enclosed part: crossing -> stroke[i + 1 .. j] -> back to the crossing.
        add([crossing, ...stroke.slice(i + 1, j + 1)])
      }
    }
  }

  const first = stroke[0]
  const last = stroke[count - 1]
  if (
    first !== undefined &&
    last !== undefined &&
    distance(first, last) <= options.closeDistance
  ) {
    add([...stroke]) // the closing edge last -> first is implicit
  }

  candidates.sort((a, b) => b.area - a.area)
  for (const { ring } of candidates.slice(0, MAX_CANDIDATES)) {
    const start = ring[0]
    if (start !== undefined && isSimpleRing(ring)) {
      return [...ring, start]
    }
  }
  return null
}
