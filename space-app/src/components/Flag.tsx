import './Flag.css'

// Flag SVGs come from the flag-icons package (MIT); only the files that are
// shown are downloaded, because the images load lazily.
const FLAG_FOLDER = '/node_modules/flag-icons/flags/4x3/'
const FLAG_URLS = import.meta.glob<string>(
  '/node_modules/flag-icons/flags/4x3/*.svg',
  { query: '?url', import: 'default', eager: true },
)

interface FlagProps {
  /** A flag-icons code: a country ("hu") or a region ("gb-wls"). */
  code: string
}

/** A small decorative flag; the text next to it names the language. */
export default function Flag({ code }: FlagProps) {
  const url = FLAG_URLS[`${FLAG_FOLDER}${code}.svg`]
  if (url === undefined) {
    return null
  }
  return (
    <img className="flag" src={url} alt="" loading="lazy" decoding="async" />
  )
}
