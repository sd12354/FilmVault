import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'
type ThemeMode = 'default' | 'batman' | 'the-flash' | 'invincible'

interface ThemeContextType {
  theme: Theme
  themeMode: ThemeMode
  setTheme: (theme: Theme) => void
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('themeMode') as ThemeMode | null
    if (stored && ['default', 'batman', 'the-flash', 'invincible'].includes(stored)) {
      return stored
    }
    return 'default'
  })

  useEffect(() => {
    const root = window.document.documentElement
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'theme-batman', 'theme-the-flash', 'theme-invincible', 'theme-default')
    // Add current theme
    root.classList.add(theme)
    // Add theme mode class (only if not default)
    if (themeMode !== 'default') {
      root.classList.add(`theme-${themeMode}`)
    }
    localStorage.setItem('theme', theme)
    localStorage.setItem('themeMode', themeMode)
  }, [theme, themeMode])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
  }

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setTheme, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

