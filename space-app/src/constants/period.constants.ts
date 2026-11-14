// Months are counted from January 2000 (index 0): 2000-11 is 10, 2025-12 is 311.

/** First month with fire data: Terra/MODIS started in November 2000. */
export const FIRST_MONTH_INDEX = 10
/** Last month in the data folders: December 2025. */
export const LAST_MONTH_INDEX = 311

/** First and last day with data (UTC), as ISO dates. */
export const DATA_START_DATE = '2000-11-01'
export const DATA_END_DATE = '2025-12-31'

/** The period shown when the app starts: the last year of data. */
export const DEFAULT_START_MONTH_INDEX = 300 // 2025-01
export const DEFAULT_END_MONTH_INDEX = LAST_MONTH_INDEX

/** A year mark on the slider track is drawn every this many years. */
export const TICK_EVERY_YEARS = 1
