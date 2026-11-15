// Calls to the fire cause service (`cause-service/`): the fires inside the drawn
// area, and the likely cause of them. Answers are untrusted: every field is
// checked, and unknown codes are dropped.

import type { Polygon } from 'geojson'
import {
  CAUSE_API_ERRORS,
  CAUSE_API_URL,
  CAUSE_CATEGORIES,
  CAUSE_CONFIDENCES,
  CAUSE_REASONS,
  CAUSE_WARNINGS,
  LAND_CLASSES,
} from '../constants/cause.constants'
import { periodDateRange } from './period'
import type { Period } from './period'

export type CauseCategory = (typeof CAUSE_CATEGORIES)[number]
export type CauseConfidence = (typeof CAUSE_CONFIDENCES)[number]
export type LandClass = (typeof LAND_CLASSES)[number]
export type CauseReasonCode = (typeof CAUSE_REASONS)[number]
export type CauseWarning = (typeof CAUSE_WARNINGS)[number]
/** Why a request failed: a service error code, or the connection/answer itself. */
export type CauseErrorCode =
  (typeof CAUSE_API_ERRORS)[number] | 'unreachable' | 'badAnswer'

export class CauseApiError extends Error {
  readonly code: CauseErrorCode

  constructor(code: CauseErrorCode) {
    super(code)
    this.code = code
  }
}

export interface FireSummary {
  count: number
  totalFrpMw: number
  maxFrpMw: number
  /** ISO dates of the first and last fire, null when there are none. */
  firstDate: string | null
  lastDate: string | null
}

export interface LandUse {
  land: LandClass
  where: 'inside' | 'near'
  /** How many of the checked fires have this land class. */
  fires: number
}

/** One reason behind the answer; only the fields of its code are set. */
export interface CauseReason {
  code: CauseReasonCode
  count: number | null
  land: LandClass | null
  fires: number | null
  months: number[]
  years: number[]
  maxFrpMw: number | null
  first: CauseCategory | null
  second: CauseCategory | null
}

export interface CauseSource {
  url: string
  domain: string
  title: string
  snippet: string
  titleEn: string
  snippetEn: string
  /** Detected language of the original text (ISO 639-1), may be empty. */
  language: string
  /** The matched phrases of the rules (English). */
  phrases: string[]
}

/** A photo from the scene: the cover photo of a matching news article. */
export interface ScenePhoto {
  /** Served by the cause service (never loaded from the news site directly). */
  src: string
  /** The article the photo comes from. */
  pageUrl: string
  domain: string
  /** The article title, in English when it was translated. */
  title: string
}

export interface CauseAnswer {
  fires: FireSummary
  /** Null when no matching article had a photo (no stock picture is ever used). */
  photo: ScenePhoto | null
  /** The nearest settlement and the country, when the geocoder answered. */
  placeName: string | null
  country: string | null
  landUse: LandUse[]
  landUseChecked: number
  recurringYears: number[]
  sources: CauseSource[]
  category: CauseCategory
  confidence: CauseConfidence
  reasons: CauseReason[]
  warnings: CauseWarning[]
}

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

function oneOf<T extends string>(
  values: readonly T[],
  value: unknown,
): T | null {
  return values.find((item) => item === value) ?? null
}

const text = (value: unknown): string =>
  typeof value === 'string' ? value : ''

const textOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null

const numbers = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter(isNumber) : []

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

function parseFires(value: unknown): FireSummary {
  if (
    !isObject(value) ||
    !isNumber(value['count']) ||
    !isNumber(value['totalFrpMw']) ||
    !isNumber(value['maxFrpMw'])
  ) {
    throw new CauseApiError('badAnswer')
  }
  return {
    count: value['count'],
    totalFrpMw: value['totalFrpMw'],
    maxFrpMw: value['maxFrpMw'],
    firstDate: textOrNull(value['firstDate']),
    lastDate: textOrNull(value['lastDate']),
  }
}

function parseLandUse(value: unknown): LandUse | null {
  if (!isObject(value) || !isNumber(value['fires'])) {
    return null
  }
  const land = oneOf(LAND_CLASSES, value['cls'])
  const where = oneOf(['inside', 'near'] as const, value['where'])
  return land === null || where === null
    ? null
    : { land, where, fires: value['fires'] }
}

function parseReason(value: unknown): CauseReason | null {
  if (!isObject(value)) {
    return null
  }
  const code = oneOf(CAUSE_REASONS, value['code'])
  const params = isObject(value['params']) ? value['params'] : {}
  if (code === null) {
    return null
  }
  const count = params['count']
  const fires = params['fires']
  const maxFrpMw = params['maxFrpMw']
  return {
    code,
    count: isNumber(count) ? count : null,
    land: oneOf(LAND_CLASSES, params['cls']),
    fires: isNumber(fires) ? fires : null,
    months: numbers(params['months']).filter((m) => m >= 1 && m <= 12),
    years: numbers(params['years']),
    maxFrpMw: isNumber(maxFrpMw) ? maxFrpMw : null,
    first: oneOf(CAUSE_CATEGORIES, params['first']),
    second: oneOf(CAUSE_CATEGORIES, params['second']),
  }
}

function parseSource(value: unknown): CauseSource | null {
  if (!isObject(value)) {
    return null
  }
  const url = text(value['url'])
  if (!/^https?:\/\//.test(url)) {
    return null // only web links are shown as links
  }
  const phrases = list(value['matches'])
    .map((match) => (isObject(match) ? text(match['phrase']) : ''))
    .filter((phrase) => phrase !== '')
  return {
    url,
    domain: text(value['domain']),
    title: text(value['title']),
    snippet: text(value['snippet']),
    titleEn: text(value['titleEn']),
    snippetEn: text(value['snippetEn']),
    language: text(value['language']),
    phrases: [...new Set(phrases)],
  }
}

function parsePhoto(value: unknown): ScenePhoto | null {
  if (!isObject(value)) {
    return null
  }
  const id = text(value['id'])
  const pageUrl = text(value['pageUrl'])
  if (!/^[0-9a-f]{32}$/.test(id) || !/^https?:\/\//.test(pageUrl)) {
    return null
  }
  return {
    src: `${CAUSE_API_URL}/api/image/${id}`,
    pageUrl,
    domain: text(value['domain']),
    title: text(value['titleEn']) || text(value['title']),
  }
}

function parseAnswer(value: unknown): CauseAnswer {
  if (!isObject(value)) {
    throw new CauseApiError('badAnswer')
  }
  const fires = parseFires(value['fires'])
  const place = isObject(value['place']) ? value['place'] : {}
  const cause = isObject(value['cause']) ? value['cause'] : {}
  const checked = value['landUseChecked']
  return {
    fires,
    photo: parsePhoto(value['photo']),
    placeName: textOrNull(place['name']),
    country: textOrNull(place['country']),
    landUse: list(value['landUse'])
      .map(parseLandUse)
      .filter((item) => item !== null),
    landUseChecked: isNumber(checked) ? checked : 0,
    recurringYears: numbers(value['recurringYears']),
    sources: list(value['sources'])
      .map(parseSource)
      .filter((item) => item !== null),
    category: oneOf(CAUSE_CATEGORIES, cause['category']) ?? 'unknown',
    confidence: oneOf(CAUSE_CONFIDENCES, cause['confidence']) ?? 'none',
    reasons: list(cause['reasons'])
      .map(parseReason)
      .filter((item) => item !== null),
    warnings: list(value['warnings'])
      .map((warning) => oneOf(CAUSE_WARNINGS, warning))
      .filter((warning) => warning !== null),
  }
}

async function post(
  path: string,
  area: Polygon,
  period: Period,
  signal: AbortSignal,
): Promise<unknown> {
  const { startDate, endDate } = periodDateRange(period)
  let response: Response
  try {
    response = await fetch(`${CAUSE_API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area, startDate, endDate }),
      signal,
    })
  } catch (error) {
    if (signal.aborted) {
      throw error
    }
    throw new CauseApiError('unreachable')
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new CauseApiError(response.ok ? 'badAnswer' : 'unreachable')
  }
  if (!response.ok) {
    const code = isObject(body) ? oneOf(CAUSE_API_ERRORS, body['error']) : null
    throw new CauseApiError(code ?? 'unreachable')
  }
  return body
}

/** The fires whose centre lies inside the area during the period. */
export async function fetchFiresInArea(
  area: Polygon,
  period: Period,
  signal: AbortSignal,
): Promise<FireSummary> {
  const body = await post('/api/fires', area, period, signal)
  return parseFires(isObject(body) ? body['fires'] : null)
}

/** The likely cause of those fires, with the evidence (can take a minute). */
export async function fetchFireCause(
  area: Polygon,
  period: Period,
  signal: AbortSignal,
): Promise<CauseAnswer> {
  return parseAnswer(await post('/api/fire-cause', area, period, signal))
}
