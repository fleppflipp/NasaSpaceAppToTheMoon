import { useEffect, useId, useRef } from 'react'
import {
  HOTSPOT_COPY as copy,
  HOTSPOT_SENSORS,
} from '../constants/hotspot.constants'
import { hotspotDate } from '../services/hotspot'
import type { HotspotDetails as Hotspot } from '../services/hotspot'
import './HotspotDetails.css'

interface HotspotDetailsProps {
  hotspot: Hotspot
  calendarOpen: boolean
  onClose: () => void
}

export default function HotspotDetails({
  hotspot,
  calendarOpen,
  onClose,
}: HotspotDetailsProps) {
  const titleId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Localization is deliberately deferred; no locale dictionaries are changed.
  const number = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })
  const coordinate = new Intl.NumberFormat('en', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
  const date = new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  })
  const formatDay = (day: number | null) =>
    day === null ? copy.unavailable : date.format(hotspotDate(day))

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    scrollRef.current?.scrollTo({ top: 0 })
  }, [hotspot])

  return (
    <aside
      className={`hotspot-details card${calendarOpen ? ' hotspot-details--calendar' : ''}`}
      aria-labelledby={titleId}
      lang="en"
    >
      <header className="hotspot-details__header">
        <div className="stack hotspot-details__heading">
          <span className="hotspot-details__eyebrow">
            {hotspot.kind === 'point' ? copy.point : copy.area}
          </span>
          <h2 id={titleId} ref={headingRef} tabIndex={-1}>
            {copy.title}
          </h2>
        </div>
        <button
          type="button"
          className="hotspot-details__close"
          aria-label={calendarOpen ? copy.backToCalendar : copy.close}
          title={calendarOpen ? copy.backToCalendar : copy.close}
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div ref={scrollRef} className="hotspot-details__body stack">
        <section
          className="hotspot-details__power stack"
          aria-label={copy.power}
        >
          <span className="hotspot-details__label">
            {hotspot.kind === 'point' ? copy.eventFrp : copy.maximumFrp}
          </span>
          <p className="hotspot-details__value">
            {hotspot.frp === null ? (
              <span className="hotspot-details__missing">
                {copy.unavailable}
              </span>
            ) : (
              <>
                {number.format(hotspot.frp)} <span>MW</span>
              </>
            )}
          </p>
          <p className="hotspot-details__note">
            {hotspot.kind === 'point'
              ? copy.pointExplanation
              : copy.areaExplanation}
          </p>
        </section>

        <dl className="hotspot-details__facts">
          {hotspot.kind === 'point' ? (
            <>
              <div>
                <dt>{copy.day}</dt>
                <dd>{formatDay(hotspot.firstDay)}</dd>
              </div>
              <div>
                <dt>{copy.radius}</dt>
                <dd>
                  {hotspot.radiusKm === null
                    ? copy.unavailable
                    : `${number.format(hotspot.radiusKm)} km`}
                </dd>
              </div>
              <div className="hotspot-details__wide">
                <dt>{copy.centre}</dt>
                <dd className="hotspot-details__coordinates">
                  {hotspot.coordinates === null ? (
                    copy.unavailable
                  ) : (
                    <>
                      <span>
                        {copy.latitude}{' '}
                        {coordinate.format(hotspot.coordinates[1])}°
                      </span>
                      <span>
                        {copy.longitude}{' '}
                        {coordinate.format(hotspot.coordinates[0])}°
                      </span>
                    </>
                  )}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div className="hotspot-details__wide">
                <dt>{copy.count}</dt>
                <dd>
                  {hotspot.eventCount === null
                    ? copy.unavailable
                    : number.format(hotspot.eventCount)}
                </dd>
              </div>
              <div>
                <dt>{copy.firstDay}</dt>
                <dd>{formatDay(hotspot.firstDay)}</dd>
              </div>
              <div>
                <dt>{copy.lastDay}</dt>
                <dd>{formatDay(hotspot.lastDay)}</dd>
              </div>
            </>
          )}
        </dl>

        <section
          className="stack hotspot-details__sensors"
          aria-label={copy.sensors}
        >
          <h3>{copy.sensors}</h3>
          {hotspot.sensors.length === 0 ? <p>{copy.unavailable}</p> : null}
          {hotspot.sensors.map((name) => {
            const sensor = HOTSPOT_SENSORS[name]
            return (
              <figure className="hotspot-sensor" key={name}>
                <img
                  src={sensor.image}
                  alt={sensor.alt}
                  width={name === 'MODIS' ? 300 : 1000}
                  height={name === 'MODIS' ? 223 : 625}
                />
                <figcaption className="stack">
                  <strong>{sensor.name}</strong>
                  <span>{sensor.fullName}</span>
                  <small>
                    {copy.imageCredit}{' '}
                    <a href={sensor.source} target="_blank" rel="noreferrer">
                      {sensor.credit}
                    </a>
                  </small>
                </figcaption>
              </figure>
            )
          })}
        </section>
        <p className="hotspot-details__note">{copy.dates}</p>
        {calendarOpen ? (
          <button
            type="button"
            className="hotspot-details__calendar-return"
            onClick={onClose}
          >
            {copy.backToCalendar}
          </button>
        ) : null}
      </div>
    </aside>
  )
}
