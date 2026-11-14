import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, SubmitEvent } from 'react'
import { suggestPlaces } from '../services/places'
import type { Place } from '../services/places'
import './SearchBar.css'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250

interface SearchBarProps {
  onResult: (place: Place) => void
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export default function SearchBar({ onResult }: SearchBarProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Place[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const timerRef = useRef<number | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)

  const cancelPending = () => {
    window.clearTimeout(timerRef.current)
    timerRef.current = undefined
    abortRef.current?.abort()
    abortRef.current = null
  }

  useEffect(() => cancelPending, [])

  /** Fetches suggestions; resolves to [] when aborted or failed. */
  const search = async (text: string): Promise<Place[]> => {
    cancelPending()
    const controller = new AbortController()
    abortRef.current = controller
    setMessage('')
    try {
      const places = await suggestPlaces(text, controller.signal)
      setSuggestions(places)
      setActiveIndex(-1)
      setOpen(places.length > 0)
      if (places.length === 0) {
        setMessage('No place found.')
      }
      return places
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        setMessage('Search failed. Please try again.')
      }
      return []
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }

  const choose = (place: Place) => {
    cancelPending()
    setQuery(place.label)
    setSuggestions([])
    setActiveIndex(-1)
    setOpen(false)
    setMessage('')
    onResult(place)
  }

  const handleChange = (value: string) => {
    setQuery(value)
    cancelPending()
    setMessage('')

    const trimmed = value.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setActiveIndex(-1)
      setOpen(false)
      return
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined
      void search(trimmed)
    }, DEBOUNCE_MS)
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed === '') {
      return
    }

    const highlighted = suggestions[activeIndex]
    if (highlighted) {
      choose(highlighted)
      return
    }

    // Suggestions may be stale or still loading: use the latest text instead.
    const stale = timerRef.current !== undefined || abortRef.current !== null
    const first = suggestions[0]
    if (first && !stale) {
      choose(first)
      return
    }
    void search(trimmed).then((places) => {
      const best = places[0]
      if (best) {
        choose(best)
      }
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = suggestions.length
    switch (event.key) {
      case 'ArrowDown':
        if (count > 0) {
          event.preventDefault()
          setOpen(true)
          setActiveIndex((index) => (index + 1) % count)
        }
        break
      case 'ArrowUp':
        if (count > 0) {
          event.preventDefault()
          setOpen(true)
          setActiveIndex((index) => (index <= 0 ? count - 1 : index - 1))
        }
        break
      case 'Escape':
        setOpen(false)
        setActiveIndex(-1)
        break
      default:
        break
    }
  }

  const showList = open && suggestions.length > 0
  const optionId = (index: number) => `${listId}-option-${String(index)}`

  return (
    <search className="search-bar">
      <form className="search-bar__form" onSubmit={handleSubmit}>
        <input
          type="search"
          className="form-control"
          placeholder="Search for a place"
          aria-label="Search for a place"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          autoComplete="off"
          value={query}
          onChange={(event) => {
            handleChange(event.target.value)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setOpen(true)
            }
          }}
          onBlur={() => {
            setOpen(false)
          }}
        />
        <button type="submit">Search</button>
      </form>
      <ul
        id={listId}
        role="listbox"
        className="search-bar__list"
        hidden={!showList}
      >
        {suggestions.map((place, index) => (
          <li
            key={`${place.label}-${String(place.lng)}-${String(place.lat)}`}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            className="search-bar__option"
            // Keep input focus so the blur handler does not close the list first.
            onMouseDown={(event) => {
              event.preventDefault()
            }}
            onClick={() => {
              choose(place)
            }}
          >
            {place.label}
          </li>
        ))}
      </ul>
      <p className="search-bar__message" role="status">
        {message}
      </p>
    </search>
  )
}
