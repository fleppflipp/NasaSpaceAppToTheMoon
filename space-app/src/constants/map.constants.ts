// Initial map view (BaseMap), also what the globe button returns to: the whole
// Earth as a globe, seen from afar, with Africa and Europe in the middle.
export const INITIAL_CENTER: [number, number] = [20, 25]
export const INITIAL_ZOOM = 1.6

// Area selection ("lasso"). Drawing is only allowed at or above this zoom, so
// nobody can circle a whole continent. Raise it to restrict the selection size.
export const DRAW_MIN_ZOOM = 8

export const LASSO = {
  /** Stroke points closer than this (screen px) to the previous one are skipped. */
  minPointSpacingPx: 3,
  /** A stroke whose end is this close (screen px) to its start counts as closed. */
  closeDistancePx: 24,
  /** Smaller enclosed areas (screen px²) are treated as accidental scribbles. */
  minAreaPx2: 400,
  /** How long the "close the shape" message stays visible. */
  messageDurationMs: 3500,
} as const
