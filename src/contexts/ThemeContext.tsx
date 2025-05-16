'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

// Create context with a default value
const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
})

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext)

type ThemeProviderProps = {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Check for saved theme preference or OS preference on mount
  useEffect(() => {
    // First check localStorage
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    } else if (savedTheme === 'light') {
      setIsDarkMode(false)
      document.documentElement.classList.remove('dark')
    } else {
      // Then check OS preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(prefersDark)
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  // Toggle theme function
  const toggleTheme = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    
    // Save to localStorage
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
    
    // Trigger storage event for other components
    window.dispatchEvent(new Event('storage'))
    
    // Apply to HTML element for global CSS
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
} 