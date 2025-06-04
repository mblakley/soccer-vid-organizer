'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '@/contexts/ThemeContext'
// import { apiClient } from '@/lib/api/client' // No longer needed
// import type { SignoutResponse } from '@/lib/types/auth' // No longer needed
import { useAuth } from '@/lib/hooks/useAuth' // Import useAuth

export default function LogoutPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const { signOut } = useAuth() // Get signOut from useAuth

  useEffect(() => {
    const performLogout = async () => {
      try {
        await signOut() // Call signOut from the hook
        // Force a full page reload to clear any cached state
        window.location.href = '/login'
      } catch (error) {
        console.error('Error during logout:', error)
        // Even if there's an error, try to redirect
        window.location.href = '/login'
      }
    }
    performLogout()
  }, [signOut]) // Add signOut to dependencies

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <p className="p-8 text-xl">Logging out...</p>
    </div>
  )
}