import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { auth } from './lib/firebase'
import { useAuthStore } from './store/authStore'
import { useUser } from './hooks/useUser'
import { ThemeProvider } from './components/ThemeProvider'

import LandingPage from './pages/LandingPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LibraryPage from './pages/LibraryPage'
import MovieDetailPage from './pages/MovieDetailPage'
import ScanPage from './pages/ScanPage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import SharePage from './pages/SharePage'
import FriendsPage from './pages/FriendsPage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

// Component to handle auth-based navigation
function AuthHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuthStore()

  useEffect(() => {
    if (!loading && user) {
      // If user is authenticated and on auth pages, redirect to library
      if (location.pathname === '/signin' || location.pathname === '/signup') {
        navigate('/library', { replace: true })
      }
    } else if (!loading && !user) {
      // If user is not authenticated and on protected routes, redirect to signin
      const protectedRoutes = ['/library', '/settings', '/search', '/scan', '/movie', '/share', '/friends', '/profile']
      if (protectedRoutes.some(route => location.pathname.startsWith(route))) {
        navigate('/signin', { replace: true })
      }
    }
  }, [user, loading, location.pathname, navigate])

  return null
}

function App() {
  const { setFirebaseUser, setLoading } = useAuthStore()
  const { fetchUser } = useUser()

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    // Check for redirect result first (for Google Sign-In redirect flow)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          // User signed in via redirect, fetchUser will be called by onAuthStateChanged
        }
      })
      .catch((error) => {
        console.error('Error getting redirect result:', error)
      })

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setFirebaseUser(firebaseUser)
        if (firebaseUser) {
          try {
            await fetchUser(firebaseUser.uid)
          } catch (error) {
            console.error('Error fetching user:', error)
            // Still set user from Firebase auth even if Firestore fetch fails
            useAuthStore.getState().setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              createdAt: new Date(),
            })
          } finally {
            // Always set loading to false after fetchUser completes
            setLoading(false)
          }
        } else {
          useAuthStore.getState().setUser(null)
          setLoading(false)
        }
      },
      (error) => {
        console.error('Auth state change error:', error)
        setLoading(false)
      }
    )

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthHandler />
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <LibraryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/movie/:id"
            element={
              <ProtectedRoute>
                <MovieDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <ScanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/share/:collectionId"
            element={
              <ProtectedRoute>
                <SharePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <FriendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:uid"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App

