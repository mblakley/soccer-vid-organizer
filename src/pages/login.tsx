'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getRedirectPath, refreshUserSession } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api/client'
import { AuthLoginRequest, AuthSessionApiResponse, GoogleOAuthApiResponse, ErrorResponse } from '@/lib/types/auth'

// Type guard to check for ErrorResponse
function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string';
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState<AuthLoginRequest>({
    email: '',
    password: '',
  })
  const { isDarkMode } = useTheme()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await apiClient.post<AuthSessionApiResponse>('/api/auth/login', formData)
      if (isErrorResponse(response)) {
        throw new Error(response.error)
      }
      if (!response.session) {
        throw new Error('Login successful, but no session data received.')
      }

      toast.success('Logged in successfully!')
      await refreshUserSession()
      const user = await apiClient.get<AuthSessionApiResponse>('/api/auth/session')
      if (user && !isErrorResponse(user) && user.session) {
        const refreshedCurrentUser = await refreshUserSession()
        const redirectPath = getRedirectPath(refreshedCurrentUser, router.query.team_id ? { team_id: router.query.team_id as string } : undefined)
        router.push(redirectPath)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    try {
      await apiClient.post('/api/auth/reset-password', { email: formData.email })
      toast.success('Password reset email sent!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email. Please try again.')
    }
  }

  const handleGoogleLogin = async () => {
    console.log("[Login] Starting Google login...")
    setLoading(true)
    
    try {
      // Get team_id from URL if it exists
      const teamId = router.query.team_id as string
      console.log("[Login] Preserving team_id for Google login:", teamId)
      
      // Call our API endpoint to initiate Google OAuth
      const response = await apiClient.post<GoogleOAuthApiResponse>('/api/auth/google', { team_id: teamId })
      
      if (isErrorResponse(response)) {
        throw new Error(response.error)
      }

      if (!response.url) {
        throw new Error('No OAuth URL received')
      }
      
      // Store the team_id in sessionStorage as a backup
      if (teamId) {
        sessionStorage.setItem('pending_team_id', teamId)
        console.log("[Login] Stored team_id in sessionStorage:", teamId)
      }
      
      // Redirect to Google OAuth URL
      window.location.href = response.url
      
      
      console.log("[Login] Google OAuth initiated, waiting for redirect back")
    } catch (error) {
      console.error("[Login] Google login error:", error)
      setError(error instanceof Error ? error.message : 'Failed to initiate Google login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log("[Login] Login page loaded, checking session...")
    const handleAuthRedirect = async () => {
      setError('') // Clear error on auth check
      setLoading(true)
      
      try {
        // Check if user is already logged in
        const response = await apiClient.get<AuthSessionApiResponse>('/api/auth/session')
        if (!response || isErrorResponse(response)) {
          console.log("[Login] No session data received or error fetching session")
          setLoading(false)
          return
        }
        
        // Get team_id from URL query if it exists (for later use in redirect)
        const teamId = router.query.team_id as string
        console.log("[Login] URL team_id parameter:", teamId)
        
        // Check sessionStorage for pending team_id
        const pendingTeamId = sessionStorage.getItem('pending_team_id')
        console.log("[Login] Pending team_id from sessionStorage:", pendingTeamId)
        
        // Use either URL team_id or pending team_id
        const finalTeamId = teamId || pendingTeamId
        if (finalTeamId) {
          console.log("[Login] Using final team_id:", finalTeamId)
          // Clear the pending team_id
          sessionStorage.removeItem('pending_team_id')
        }
        
        // Refresh token to get the latest team roles
        const refreshedUser = await refreshUserSession()
        console.log("[Login] Session refreshed, user data:", refreshedUser)
        
        if (refreshedUser) {
          // Determine redirect path with updated claims
          const queryParams = finalTeamId ? { team_id: finalTeamId } : undefined
          const redirectPath = getRedirectPath(refreshedUser, queryParams)
          console.log("[Login] Redirecting to:", redirectPath)
          
          // Use replace instead of push to avoid adding to browser history
          router.replace(redirectPath)
        } else {
          console.log("[Login] No user data after refresh - remaining on login page")
        }
      } catch (error) {
        console.error("[Login] Error processing session:", error)
        setError(error instanceof Error ? error.message : 'An error occurred while processing your session. Please try logging in again.')
      } finally {
        setLoading(false)
      }
    }

    handleAuthRedirect()
  }, [router])

  // Login page uses full screen layout without AppLayout
  return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className={`max-w-md w-full space-y-8 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} p-8 rounded-lg shadow relative`}>
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-center">Soccer Video Organizer</h1>
          <h2 className="text-xl text-center mt-2">Log In</h2>
          {loading && (
            <p className="text-center text-sm mt-2 text-blue-500">Loading...</p>
          )}
        </div>
        <div className="space-y-4">
          <input 
            className={`border px-4 py-2 w-full rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} 
            placeholder="Email" 
            type="email"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} 
          />
          <input 
            type="password" 
            className={`border px-4 py-2 w-full rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} 
            placeholder="Password" 
            value={formData.password}
            onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))} 
          />
          <div className="text-right">
            <button 
              type="button"
              className={`text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} hover:underline`}
              onClick={handleResetPassword}
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full" 
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button 
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full" 
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              Log in with Google
            </button>
          </div>
          <div className="text-center">
            <button 
              className={`text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} hover:underline`} 
              onClick={() => router.push('/signup')}
            >
              Don't have an account? Sign Up
            </button>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}
        </div>
      </div>
    </div>
  )
}
