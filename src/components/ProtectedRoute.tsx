import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoadingScreen from './LoadingScreen'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return <LoadingScreen message="Authenticating..." />
  }

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  return <div className="page-enter">{children}</div>
}

