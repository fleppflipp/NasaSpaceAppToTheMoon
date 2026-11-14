import { Navigate, Route, Routes } from 'react-router'
import { ROUTES } from '../constants/routes.constants'
import AppLayout from '../layouts/AppLayout'
import NotFound from '../pages/NotFound'
export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path={ROUTES.home}
          element={<Navigate to={ROUTES.map} replace />}
        />
        <Route path={ROUTES.map} element={null} />
        <Route path={ROUTES.calendar} element={null} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
