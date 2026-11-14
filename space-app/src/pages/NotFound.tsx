import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '../constants/routes.constants'
export default function NotFound() {
  const { t } = useTranslation()
  return (
    <main
      className="section stack"
      style={{
        paddingInline: 'var(--space-4)',
        marginBlockStart: 'var(--layout-header-height)',
      }}
    >
      <h2>{t('notFound.heading')}</h2>
      <Link to={ROUTES.map}>{t('notFound.backToMap')}</Link>
    </main>
  )
}
