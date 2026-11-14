import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { DRAW_MIN_ZOOM } from '../constants/map.constants'
import './DrawControl.css'

interface DrawControlProps {
  /** The map is zoomed in far enough to draw. */
  canDraw: boolean
  /** Draw mode is on. */
  drawing: boolean
  /** A selected area exists. */
  hasSelection: boolean
  onToggle: () => void
  onClear: () => void
}

function PencilIcon() {
  return (
    <svg
      className="draw-control__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg
      className="draw-control__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/** Map overlay buttons: start/cancel drawing an area, and remove the selection. */
export default function DrawControl({
  canDraw,
  drawing,
  hasSelection,
  onToggle,
  onClear,
}: DrawControlProps) {
  const { t } = useTranslation()
  const hintId = useId()
  // While drawing the button must stay usable to cancel, even if the gate closes.
  const disabled = !canDraw && !drawing

  return (
    <div className="draw-control">
      <div className="draw-control__row">
        {disabled ? (
          <span id={hintId} className="draw-control__hint">
            {t('draw.zoomHint')}
          </span>
        ) : null}
        <button
          type="button"
          className="draw-control__button"
          aria-label={drawing ? t('draw.cancel') : t('draw.draw')}
          aria-pressed={drawing}
          aria-describedby={disabled ? hintId : undefined}
          title={
            disabled
              ? `${t('draw.zoomHint')} (zoom ${String(DRAW_MIN_ZOOM)} or closer)`
              : undefined
          }
          disabled={disabled}
          onClick={onToggle}
        >
          <PencilIcon />
        </button>
      </div>
      {hasSelection ? (
        <button
          type="button"
          className="draw-control__button"
          aria-label={t('draw.remove')}
          onClick={onClear}
        >
          <ClearIcon />
        </button>
      ) : null}
    </div>
  )
}
