import { useTranslation } from 'react-i18next'
import './CalendarView.css'
// Placeholder: the burning activity calendar will be built here later.
export default function CalendarView() {
  const { t } = useTranslation()
  return <section className="calendar-view" aria-label={t('calendar.label')} />
}
