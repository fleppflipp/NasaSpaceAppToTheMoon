import type { FirePlace } from './stats'

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

/**
 * A place as one line: name, region and country. The country is written in the
 * given language from its ISO code; the name and region stay as the geocoder
 * knows them (English).
 */
export function placeLabel(
  place: FirePlace | null,
  language: string,
): string | null {
  if (place === null) {
    return null
  }
  let country = place.countryName
  if (place.countryCode !== null) {
    try {
      country =
        new Intl.DisplayNames(language, { type: 'region' }).of(
          place.countryCode,
        ) ?? country
    } catch {
      // An unknown code: keep the geocoder's country name.
    }
  }
  const parts = [place.name, place.region, country].filter(
    (part): part is string => part !== null,
  )
  return parts.length === 0 ? null : [...new Set(parts)].join(', ')
}

/** A date inside the given month, for the formats above. */
export function utcDate(year: number, month: number, day = 1): Date {
  return new Date(Date.UTC(year, month - 1, day))
}
