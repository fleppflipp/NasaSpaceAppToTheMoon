import { useEffect, useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../constants/languages.constants'
import type { Language, LanguageCode } from '../constants/languages.constants'
import { setLanguage } from '../i18n'
import Flag from './Flag'
import './LanguageSelect.css'

/** Lower case without accents, so "romana" finds "Română". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

/** Whether a typed query is the language's code (best match). */
function isCode(language: Language, query: string): boolean {
  return (
    query === normalize(language.code) || query === normalize(language.short)
  )
}

function matchesQuery(language: Language, query: string): boolean {
  if (query === '') {
    return true
  }
  const terms: readonly string[] = [
    language.code,
    language.name,
    ...language.keywords,
  ]
  return terms.some((term) => normalize(term).startsWith(query))
}

/**
 * Language picker: a combobox showing the current flag and code. It opens a
 * list of all languages and can be typed into (code, language or country name).
 */
export default function LanguageSelect() {
  const { t, i18n } = useTranslation()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [typing, setTyping] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const current =
    LANGUAGES.find((language) => language.code === i18n.language) ??
    LANGUAGES.find((language) => language.code === 'en') ??
    LANGUAGES[0]
  const normalizedQuery = normalize(typing ? query : '')
  // An exact code ("ro") comes first, then everything that starts with the text.
  const options = LANGUAGES.filter((language) =>
    matchesQuery(language, normalizedQuery),
  ).sort(
    (a, b) =>
      Number(isCode(b, normalizedQuery)) - Number(isCode(a, normalizedQuery)),
  )

  const showList = open && options.length > 0
  const optionId = (index: number) => `${listId}-option-${String(index)}`

  // Keep the highlighted option visible in the scrollable list.
  useEffect(() => {
    if (showList) {
      document
        .getElementById(`${listId}-option-${String(activeIndex)}`)
        ?.scrollIntoView({ block: 'nearest' })
    }
  }, [showList, activeIndex, listId])

  const close = () => {
    setOpen(false)
    setTyping(false)
    setQuery('')
  }

  const choose = (code: LanguageCode) => {
    void setLanguage(code)
    close()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setOpen(true)
        setActiveIndex((index) =>
          options.length === 0 ? 0 : (index + 1) % options.length,
        )
        break
      case 'ArrowUp':
        event.preventDefault()
        setOpen(true)
        setActiveIndex((index) =>
          options.length === 0
            ? 0
            : (index - 1 + options.length) % options.length,
        )
        break
      case 'Enter': {
        event.preventDefault()
        const picked = options[activeIndex]
        if (open && picked) {
          choose(picked.code)
        } else {
          setOpen(true)
        }
        break
      }
      case 'Escape':
        close()
        break
      default:
        break
    }
  }

  return (
    <div className="language-select">
      <span className="language-select__current-flag">
        <Flag code={current.flag} />
      </span>
      <input
        type="text"
        className="form-control language-select__input"
        role="combobox"
        aria-label={`${t('language.label')}: ${current.name}`}
        title={t('language.placeholder')}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? optionId(activeIndex) : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={current.short}
        value={typing ? query : ''}
        onChange={(event) => {
          setTyping(true)
          setQuery(event.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => {
          setActiveIndex(
            Math.max(
              0,
              LANGUAGES.findIndex((language) => language.code === current.code),
            ),
          )
          setOpen(true)
        }}
        onClick={() => {
          setOpen(true)
        }}
        onBlur={close}
        onKeyDown={handleKeyDown}
      />
      <span className="language-select__chevron" aria-hidden="true" />
      <ul
        id={listId}
        role="listbox"
        className="language-select__list"
        aria-label={t('language.label')}
        hidden={!showList}
      >
        {options.map((language, index) => (
          <li
            key={language.code}
            id={optionId(index)}
            role="option"
            lang={language.code}
            aria-selected={language.code === current.code}
            className="language-select__option"
            data-active={index === activeIndex}
            // Keep input focus so the blur handler does not close the list first.
            onMouseDown={(event) => {
              event.preventDefault()
            }}
            onClick={() => {
              choose(language.code)
            }}
          >
            <Flag code={language.flag} />
            <span className="language-select__short">{language.short}</span>
            <span className="language-select__name">{language.name}</span>
          </li>
        ))}
      </ul>
      <p className="language-select__message" role="status">
        {open && options.length === 0 ? t('language.noResults') : null}
      </p>
    </div>
  )
}
