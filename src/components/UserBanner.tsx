import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '@/contexts/ThemeContext'

interface User {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
  }
}

export default function UserBanner() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (!response.ok) {
          throw new Error('Failed to fetch user session')
        }
        const data = await response.json()
        setUser(data.session?.user || null)
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error('Failed to sign out')
      }
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="animate-pulse h-6 w-32 bg-gray-300 rounded"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow flex justify-between items-center`}>
        <div className="text-gray-500">Not signed in</div>
        <button
          onClick={() => router.push('/login')}
          className={`px-4 py-2 rounded ${
            isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow flex justify-between items-center`}>
      <div>
        <div className="font-semibold">
          {user.user_metadata?.full_name || user.email || 'User'}
        </div>
        <div className="text-sm text-gray-500">{user.email}</div>
      </div>
      <button
        onClick={handleSignOut}
        className={`px-4 py-2 rounded ${
          isDarkMode 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        Sign Out
      </button>
    </div>
  )
}
