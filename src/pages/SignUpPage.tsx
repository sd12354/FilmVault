import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from '@/components/ThemeProvider'
import { Film, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft, Moon, Sun, Loader2 } from 'lucide-react'
import Footer from '@/components/Footer'

// Password validation function
const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('At least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('One number')
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('One special character')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (value.length > 0) {
      setShowPasswordRequirements(true)
      const validation = validatePassword(value)
      setPasswordErrors(validation.errors)
    } else {
      setShowPasswordRequirements(false)
      setPasswordErrors([])
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate password
    const validation = validatePassword(password)
    if (!validation.valid) {
      setError('Please fix password requirements')
      setShowPasswordRequirements(true)
      return
    }

    setLoading(true)

    if (!auth) {
      setError('Firebase is not configured. Please check your environment variables.')
      setLoading(false)
      return
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password)
      // Don't navigate - let auth state change handle it
      // The App component will detect the auth change and redirect
    } catch (err: any) {
      let errorMessage = 'Failed to sign up'
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.'
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.'
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setLoading(true)

    if (!auth) {
      setError('Firebase is not configured. Please check your environment variables.')
      setLoading(false)
      return
    }

    try {
      const provider = new GoogleAuthProvider()
      // Try popup first, fall back to redirect if popup is blocked
      try {
        await signInWithPopup(auth, provider)
        // Sign-in successful - reset loading state
        // The auth state change handler will handle navigation
        setLoading(false)
      } catch (popupError: any) {
        // If popup is blocked or fails due to COOP, use redirect
        if (
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.message?.includes('Cross-Origin-Opener-Policy')
        ) {
          // Use redirect as fallback
          await signInWithRedirect(auth, provider)
          // Note: signInWithRedirect will navigate away, so we don't need to handle the result here
          // But reset loading in case redirect doesn't happen immediately
          setTimeout(() => {
            setLoading(false)
          }, 1000)
          return
        }
        throw popupError
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup - not really an error
        setLoading(false)
      } else {
        setError(err.message || 'Failed to sign up with Google')
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex justify-center mb-4">
            <Film className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>Create your FilmVault account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {showPasswordRequirements && (
              <div className="mt-2 text-sm space-y-1">
                <div className="font-medium text-muted-foreground mb-1">Password must contain:</div>
                {[
                  'At least 8 characters',
                  'One uppercase letter',
                  'One lowercase letter',
                  'One number',
                  'One special character',
                ].map((req) => {
                  const isValid = !passwordErrors.includes(req)
                  return (
                    <div
                      key={req}
                      className={`flex items-center gap-2 ${
                        isValid ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      {isValid ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span>{req}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignUp}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>
          <div className="text-center text-sm">
            <Link to="/signin" className="text-primary hover:underline">
              Already have an account? Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
      <Footer />
    </div>
  )
}

