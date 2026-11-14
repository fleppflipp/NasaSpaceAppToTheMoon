/**
 * The app shows one week of one year at a time. Week k of a year covers days
 * 7k+1 to 7k+7 (counted from January 1st), so there are 52 full weeks and a
 * last week (52) with the one or two days that are left.
 */
export const WEEKS_PER_YEAR = 53
export const LAST_WEEK = WEEKS_PER_YEAR - 1

/** The week shown at start: late July, peak of the fire season in many regions. */
export const DEFAULT_WEEK = 30
