/** Number and date formats of the statistics panel, for the active language (dates are UTC). */
export function createStatsFormats(language: string) {
  return {
    int: new Intl.NumberFormat(language),
    compact: new Intl.NumberFormat(language, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }),
    share: new Intl.NumberFormat(language, {
      style: 'percent',
      maximumFractionDigits: 1,
    }),
    degrees: new Intl.NumberFormat(language, {
      style: 'unit',
      unit: 'degree',
      maximumFractionDigits: 2,
    }),
    kilometres: new Intl.NumberFormat(language, {
      style: 'unit',
      unit: 'kilometer',
      maximumFractionDigits: 1,
    }),
    monthName: new Intl.DateTimeFormat(language, {
      month: 'long',
      timeZone: 'UTC',
    }),
    monthLetter: new Intl.DateTimeFormat(language, {
      month: 'narrow',
      timeZone: 'UTC',
    }),
    shortDate: new Intl.DateTimeFormat(language, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
  }
}

export type StatsFormats = ReturnType<typeof createStatsFormats>

/** A date inside the given month, for the formats above. */
export function utcDate(year: number, month: number, day = 1): Date {
  return new Date(Date.UTC(year, month - 1, day))
}
