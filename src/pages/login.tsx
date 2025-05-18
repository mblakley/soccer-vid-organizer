'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/router'
import { getCurrentUser, getRedirectPath } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { toast } from 'react-toastify'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { isDarkMode } = useTheme()

  const handleLogin = async () => {
    try {
      console.log("[Login] Starting login process")
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error("[Login] Login error:", error)
        setError(error.message)
        return
      }
      
      // Pass the team_id from URL if it exists
      const teamId = router.query.team_id as string
      console.log("[Login] URL team_id parameter for redirect:", teamId)
      const queryParams = teamId ? { team_id: teamId } : undefined
      console.log("[Login] Query params for redirect:", queryParams)
      
      const userData = await getCurrentUser()
      console.log("[Login] User data after login:", userData)
      const redirectPath = getRedirectPath(userData, queryParams)
      console.log("[Login] Redirecting to after login:", redirectPath)
      router.push(redirectPath)
    } catch (error: any) {
      console.error("[Login] Error during login:", error)
      setError(error.message || 'An error occurred during login')
    }
  }

  const handleGoogleLogin = async () => {
    console.log("[Login] Starting Google login...")
    // Get team_id from URL if it exists
    const teamId = router.query.team_id as string
    console.log("[Login] Preserving team_id for Google login:", teamId)
    
    // Build the full redirect URL with team_id
    const redirectUrl = new URL('/login', window.location.origin)
    if (teamId) {
      redirectUrl.searchParams.set('team_id', teamId)
    }
    console.log("[Login] Full redirect URL:", redirectUrl.toString())
    
    // Store the team_id in sessionStorage as a backup
    if (teamId) {
      sessionStorage.setItem('pending_team_id', teamId)
      console.log("[Login] Stored team_id in sessionStorage:", teamId)
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: redirectUrl.toString(),
        queryParams: teamId ? { team_id: teamId } : undefined
      }
    })
    
    if (error) {
      console.error("[Login] Google login error:", error)
      setError(error.message)
    } else {
      console.log("[Login] Google OAuth initiated, waiting for redirect back")
    }
  }

  useEffect(() => {
    console.log("[Login] Login page loaded, checking session...")
    const handleAuthRedirect = async () => {
      setError(''); // Clear error on auth check
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      
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
      
      if (session) {
        console.log("[Login] Found session after redirect:", session)
        try {
          const userData = await getCurrentUser()
          console.log("[Login] User data:", userData)
          
          // Don't pass team_id in query params, let TeamContext handle it
          const redirectPath = getRedirectPath(userData)
          console.log("[Login] Redirecting to:", redirectPath)
          
          // Use replace instead of push to avoid adding to browser history
          router.replace(redirectPath)
        } catch (error: any) {
          console.error("[Login] Error processing session:", error)
          setError(error.message || 'An error occurred while processing your session. Please try logging in again.');
        }
      } else {
        console.log("[Login] No session found - user needs to log in")
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
        </div>
        <div className="space-y-4">
          <input 
            className={`border px-4 py-2 w-full rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} 
            placeholder="Email" 
            type="email"
            onChange={e => setEmail(e.target.value)} 
          />
          <input 
            type="password" 
            className={`border px-4 py-2 w-full rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} 
            placeholder="Password" 
            onChange={e => setPassword(e.target.value)} 
          />
          <div className="flex flex-col gap-3">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full" 
              onClick={handleLogin}
            >
              Login
            </button>
            <button 
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full" 
              onClick={handleGoogleLogin}
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
        </div>
      </div>
    </div>
  )
}
