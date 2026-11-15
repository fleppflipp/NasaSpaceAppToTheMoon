import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { Polygon } from 'geojson'
import { MAX_SHOWN_SOURCES } from '../constants/cause.constants'
import {
  CauseApiError,
  fetchFireCause,
  fetchFiresInArea,
} from '../services/fireCause'
import type {
  CauseAnswer,
  CauseErrorCode,
  CauseReason,
  FireSummary,
  ScenePhoto,
} from '../services/fireCause'
import { formatDate } from '../services/period'
import type { Period } from '../services/period'
import './CausePanel.css'

interface CausePanelProps {
  /** The drawn area. The parent remounts the panel when it or the period changes. */
  selection: Polygon
  period: Period
}

type FiresState =
  | { status: 'loading' }
  | { status: 'done'; fires: FireSummary }
  | { status: 'error'; code: CauseErrorCode }

type CauseState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; answer: CauseAnswer }
  | { status: 'error'; code: CauseErrorCode }

const errorCode = (error: unknown): CauseErrorCode =>
  error instanceof CauseApiError ? error.code : 'badAnswer'

function makeFormatters(language: string) {
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const list = new Intl.ListFormat(language, { type: 'conjunction' })
  const month = new Intl.DateTimeFormat(language, {
    month: 'long',
    timeZone: 'UTC',
  })
  return {
    number: (value: number) => number.format(value),
    list: (values: string[]) => list.format(values),
    month: (value: number) => month.format(Date.UTC(2000, value - 1, 1)),
  }
}

type Formatters = ReturnType<typeof makeFormatters>

function reasonText(
  reason: CauseReason,
  answer: CauseAnswer,
  t: TFunction,
  format: Formatters,
): string {
  const frp = t('cause.frp', { value: format.number(reason.maxFrpMw ?? 0) })
  const land = reason.land === null ? '' : t(`causeLand.${reason.land}`)
  switch (reason.code) {
    case 'webSources':
      return t('causeReason.webSources', { count: reason.count ?? 0 })
    case 'noWebReports':
      return t('causeReason.noWebReports')
    case 'landInside':
    case 'landNear':
      return t(`causeReason.${reason.code}`, {
        fires: format.number(reason.fires ?? 0),
        checked: format.number(answer.landUseChecked),
        land,
      })
    case 'season':
      return t('causeReason.season', {
        months: format.list(reason.months.map(format.month)),
      })
    case 'recurring':
      return t('causeReason.recurring', {
        years: format.list(reason.years.map(String)),
      })
    case 'smallFires':
    case 'largeFires':
      return t(`causeReason.${reason.code}`, { frp })
    case 'tie':
      return t('causeReason.tie', {
        first: t(`causeCategory.${reason.first ?? 'unknown'}`),
        second: t(`causeCategory.${reason.second ?? 'unknown'}`),
      })
  }
}

function FireFacts({
  fires,
  format,
}: {
  fires: FireSummary
  format: Formatters
}) {
  const { t, i18n } = useTranslation()
  const { firstDate, lastDate } = fires
  const dates =
    firstDate === null || lastDate === null
      ? ''
      : firstDate === lastDate
        ? formatDate(firstDate, i18n.language)
        : t('cause.range', {
            start: formatDate(firstDate, i18n.language),
            end: formatDate(lastDate, i18n.language),
          })
  return (
    <dl className="cause-panel__facts">
      <dt>{t('cause.fires')}</dt>
      <dd>{format.number(fires.count)}</dd>
      <dt>{t('cause.dates')}</dt>
      <dd>{dates}</dd>
      <dt>{t('cause.totalFrp')}</dt>
      <dd>{t('cause.frp', { value: format.number(fires.totalFrpMw) })}</dd>
      <dt>{t('cause.maxFrp')}</dt>
      <dd>{t('cause.frp', { value: format.number(fires.maxFrpMw) })}</dd>
    </dl>
  )
}

/** The cover photo of the best matching news article, credited and linked. */
function ScenePhotoFigure({ photo }: { photo: ScenePhoto }) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  if (failed) {
    return null // the news site refused or removed it: show nothing rather than a stand-in
  }
  return (
    <figure className="cause-panel__photo">
      <img
        src={photo.src}
        alt={t('cause.photoAlt', { title: photo.title || photo.domain })}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          setFailed(true)
        }}
      />
      <figcaption className="cause-panel__meta">
        {t('cause.photoCredit')}{' '}
        <a href={photo.pageUrl} target="_blank" rel="noopener noreferrer">
          {photo.domain}
        </a>
        . {t('cause.photoNote')}
      </figcaption>
    </figure>
  )
}

function CauseResult({
  answer,
  format,
}: {
  answer: CauseAnswer
  format: Formatters
}) {
  const { t } = useTranslation()
  const place =
    answer.placeName === null
      ? null
      : answer.country === null
        ? answer.placeName
        : t('cause.placeInCountry', {
            place: answer.placeName,
            country: answer.country,
          })
  return (
    <div className="stack cause-panel__result">
      <div className="cause-panel__answer">
        <h3 className="cause-panel__subheading">{t('cause.likelyCause')}</h3>
        <p className="cause-panel__category">
          {t(`causeCategory.${answer.category}`)}
        </p>
        {answer.confidence === 'none' ? null : (
          <p className="cause-panel__meta">
            {t('cause.confidence', {
              level: t(`causeConfidence.${answer.confidence}`),
            })}
          </p>
        )}
        {place === null ? null : (
          <p className="cause-panel__meta">{t('cause.near', { place })}</p>
        )}
      </div>

      {answer.photo === null ? null : <ScenePhotoFigure photo={answer.photo} />}

      {answer.reasons.length === 0 ? null : (
        <div>
          <h3 className="cause-panel__subheading">{t('cause.why')}</h3>
          <ul className="cause-panel__list">
            {answer.reasons.map((reason, index) => (
              <li key={`${reason.code}-${String(index)}`}>
                {reasonText(reason, answer, t, format)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {answer.warnings.length === 0 ? null : (
        <ul className="cause-panel__list cause-panel__warnings">
          {answer.warnings.map((warning) => (
            <li key={warning}>{t(`causeWarning.${warning}`)}</li>
          ))}
        </ul>
      )}

      {answer.sources.length === 0 ? null : (
        <div>
          <h3 className="cause-panel__subheading">{t('cause.sources')}</h3>
          <ul className="cause-panel__sources">
            {answer.sources.slice(0, MAX_SHOWN_SOURCES).map((source) => (
              <li key={source.url} className="cause-panel__source">
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.titleEn || source.title || source.domain}
                </a>
                <span className="cause-panel__domain">{source.domain}</span>
                {source.snippetEn === '' ? null : <p>{source.snippetEn}</p>}
                {source.phrases.length === 0 ? null : (
                  <p className="cause-panel__meta">
                    {t('cause.matched', {
                      phrases: format.list(source.phrases),
                    })}
                  </p>
                )}
                {source.language === '' || source.language === 'en' ? null : (
                  <details>
                    <summary>{t('cause.original')}</summary>
                    <p lang={source.language}>
                      {source.title} {source.snippet}
                    </p>
                    <p className="cause-panel__meta">{t('cause.translated')}</p>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="cause-panel__meta">{t('cause.disclaimer')}</p>
    </div>
  )
}

/** Overlay on the map: the fires in the drawn area and, on request, their likely cause. */
export default function CausePanel({ selection, period }: CausePanelProps) {
  const { t, i18n } = useTranslation()
  const headingId = useId()
  const format = makeFormatters(i18n.language)
  const [attempt, setAttempt] = useState(0)
  const [firesState, setFiresState] = useState<FiresState>({
    status: 'loading',
  })
  const [causeState, setCauseState] = useState<CauseState>({ status: 'idle' })
  const causeRequestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchFiresInArea(selection, period, controller.signal).then(
      (fires) => {
        setFiresState({ status: 'done', fires })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setFiresState({ status: 'error', code: errorCode(error) })
        }
      },
    )
    return () => {
      controller.abort()
    }
  }, [selection, period, attempt])

  useEffect(() => {
    return () => {
      causeRequestRef.current?.abort()
    }
  }, [])

  const retryFires = () => {
    setFiresState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }

  const findCause = () => {
    causeRequestRef.current?.abort()
    const controller = new AbortController()
    causeRequestRef.current = controller
    setCauseState({ status: 'loading' })
    fetchFireCause(selection, period, controller.signal).then(
      (answer) => {
        setCauseState({ status: 'done', answer })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setCauseState({ status: 'error', code: errorCode(error) })
        }
      },
    )
  }

  return (
    <aside className="cause-panel card stack" aria-labelledby={headingId}>
      <h2 id={headingId} className="cause-panel__heading">
        {t('cause.heading')}
      </h2>

      {firesState.status === 'loading' ? (
        <p role="status">{t('cause.loadingFires')}</p>
      ) : null}

      {firesState.status === 'error' ? (
        <div className="stack">
          <p role="alert">{t(`causeError.${firesState.code}`)}</p>
          <button type="button" onClick={retryFires}>
            {t('cause.retry')}
          </button>
        </div>
      ) : null}

      {firesState.status === 'done' && firesState.fires.count === 0 ? (
        <p>{t('cause.noFires')}</p>
      ) : null}

      {firesState.status === 'done' && firesState.fires.count > 0 ? (
        <>
          <FireFacts fires={firesState.fires} format={format} />
          {causeState.status === 'idle' ? (
            <button type="button" onClick={findCause}>
              {t('cause.find')}
            </button>
          ) : null}
          {causeState.status === 'loading' ? (
            <p role="status" aria-busy="true">
              {t('cause.finding')}
            </p>
          ) : null}
          {causeState.status === 'error' ? (
            <div className="stack">
              <p role="alert">{t(`causeError.${causeState.code}`)}</p>
              <button type="button" onClick={findCause}>
                {t('cause.retry')}
              </button>
            </div>
          ) : null}
          {causeState.status === 'done' ? (
            <CauseResult answer={causeState.answer} format={format} />
          ) : null}
        </>
      ) : null}
    </aside>
  )
}
