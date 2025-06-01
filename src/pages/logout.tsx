'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '@/contexts/ThemeContext'
import { apiClient } from '@/lib/api/client'
import type { SignoutResponse } from '@/lib/types/auth'

export default function LogoutPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const logout = async () => {
      try {
        await apiClient.post<SignoutResponse>('/api/auth/signout')
      } catch (error) {
        console.error('Error during logout:', error)
      } finally {
        router.push('/login')
      }
    }
    logout()
  }, [router])

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <p className="p-8 text-xl">Logging out...</p>
    </div>
  )
}