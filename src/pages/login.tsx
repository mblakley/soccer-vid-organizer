'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getRedirectPath, refreshUserSession } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { toast } from 'react-toastify'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'
import { AuthLoginRequest } from '@/lib/types/auth'
import { ErrorResponse } from '@/lib/types/api'
import { AuthError, Session, User } from '@supabase/supabase-js'

// Type guard for Supabase AuthError
function isAuthError(error: any): error is AuthError {
  return error && typeof error.message === 'string' && typeof error.status === 'number';
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
  const supabase = getSupabaseBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        throw signInError
      }

      if (!data.session) {
        throw new Error('Login successful, but no session data received.')
      }

      toast.success('Logged in successfully!')
      const refreshedCurrentUser = await refreshUserSession()
      if (refreshedCurrentUser) {
        const redirectPath = getRedirectPath(refreshedCurrentUser, router.query.team_id ? { team_id: router.query.team_id as string } : undefined)
        router.push(redirectPath)
      } else {
        console.warn("Login successful with Supabase, but refreshUserSession returned no user. Redirecting to dashboard.")
        router.push('/dashboard')
      }
    } catch (error) {
      console.error("[Login] handleSubmit error:", error)
      const errorMessage = isAuthError(error) ? error.message : 'Failed to log in. Please check your credentials and try again.';
      toast.error(errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email, {
        // redirectTo: `${window.location.origin}/reset-password` // Optional: specify where user is redirected after clicking link in email
      });
      if (resetError) {
        throw resetError;
      }
      toast.success('Password reset email sent! Check your inbox.')
    } catch (error) {
      console.error("[Login] handleResetPassword error:", error);
      const errorMessage = isAuthError(error) ? error.message : 'Failed to send reset email. Please try again.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleLogin = async () => {
    console.log("[Login] Starting Google login...")
    setLoading(true)
    setError('');
    
    try {
      const teamId = router.query.team_id as string
      console.log("[Login] Preserving team_id for Google login:", teamId)
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: teamId ? { team_id: teamId } : undefined,
        },
      })

      if (oauthError) {
        throw oauthError;
      }

      if (!data.url) { // The URL is directly in data.url for OAuth
        throw new Error('No OAuth URL received')
      }
      
      if (teamId) {
        sessionStorage.setItem('pending_team_id', teamId)
        console.log("[Login] Stored team_id in sessionStorage:", teamId)
      }
      
      window.location.href = data.url
      
      console.log("[Login] Google OAuth initiated, waiting for redirect back")
    } catch (error) {
      console.error("[Login] Google login error:", error)
      const errorMessage = isAuthError(error) ? error.message : 'Failed to initiate Google login';
      toast.error(errorMessage);
      setError(errorMessage); 
    } finally {
      // setLoading(false) // Page will redirect, so this might not be necessary
    }
  }

  useEffect(() => {
    console.log("[Login] Login page loaded, checking for existing session or auth redirect...");
    setLoading(true);
    setError('');

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Login] onAuthStateChange event:", event, "session:", session);
      setLoading(false); // Stop loading once auth state is determined

      if (event === 'SIGNED_IN' && session) {
        console.log("[Login] User signed in via onAuthStateChange or initial session detected.");
        const user = session.user;
        // refreshUserSession might still be important here for custom claims
        const refreshedCurrentUser = await refreshUserSession(); 
        if (refreshedCurrentUser) {
          const teamIdFromUrl = router.query.team_id as string;
          const pendingTeamId = sessionStorage.getItem('pending_team_id');
          const finalTeamId = teamIdFromUrl || pendingTeamId;

          if (finalTeamId) {
            console.log("[Login] Using final team_id from URL/sessionStorage:", finalTeamId);
            sessionStorage.removeItem('pending_team_id');
          }
          
          const queryParams = finalTeamId ? { team_id: finalTeamId } : undefined;
          const redirectPath = getRedirectPath(refreshedCurrentUser, queryParams);
          console.log("[Login] Redirecting to:", redirectPath);
          router.replace(redirectPath);
        } else {
          console.warn("[Login] Signed in, but refreshUserSession returned no user. Staying on login or redirecting to dashboard as fallback.");
          // Potentially redirect to a generic dashboard if user refresh fails but session exists
          // router.replace('/dashboard'); 
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out, ensure we are on login page, or handle if already on login
        console.log("[Login] User signed out.");
        // No action needed if already on login page
      }
    });

    // Initial check for session (optional, as onAuthStateChange might cover it, but good for immediate UI update)
    // This part is more for the initial page load before onAuthStateChange fires with an initial session.
    const checkInitialSession = async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error("[Login] Error getting initial session:", sessionError.message);
            setLoading(false);
            return;
        }
        if (session) {
            console.log("[Login] Initial session found on page load:", session);
            // If a session exists, onAuthStateChange will likely fire with SIGNED_IN shortly.
            // Or, you could trigger the redirect logic here too, but it might be redundant.
            // For now, let onAuthStateChange handle the redirect to keep logic centralized.
        } else {
            console.log("[Login] No initial session found on page load.");
        }
        setLoading(false); // Ensure loading is false if no session and no redirect happens
    };
    checkInitialSession();

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase, router]); // Add supabase and router to dependencies

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
