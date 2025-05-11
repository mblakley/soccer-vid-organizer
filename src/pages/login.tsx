'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/router'
import { jwtDecode, JwtPayload } from 'jwt-decode'
import { getCurrentUser } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'

// Extend JwtPayload to include user_role
interface CustomJwtPayload extends JwtPayload {
  user_roles?: string[] | null;
}

// Use a plain component, not wrapped in withAuth
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { isDarkMode } = useTheme()

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        return
      }
      
      // Get user data with roles from JWT claims
      const userData = await getCurrentUser()
      const userRoles = userData?.roles || []
      
      if (!userRoles || userRoles.length === 0) {
        alert('Your account is awaiting role approval. Please contact an admin.')
        await supabase.auth.signOut()
        router.push('/login')
      } else if (userRoles.includes('admin')) {
        router.push('/admin/roles')
      } else if (userRoles.includes('coach')) {
        router.push('/coach')
      } else {
        router.push('/')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during login')
    }
  }

  const handleGoogleLogin = async () => {
    console.log("Starting Google login...");
    const { data, error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`
      }
    })
    
    if (error) {
      console.error("Google login error:", error);
      setError(error.message);
    } else {
      console.log("Google OAuth initiated, waiting for redirect back");
      // The rest will happen after redirect
    }
  }

  // This effect runs once when the component mounts
  useEffect(() => {
    console.log("Login page loaded, checking session...");
    const handleAuthRedirect = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      
      if (session) {
        console.log("Found session after redirect:", session);
        try {
          // Get user role from JWT
          const jwt = jwtDecode<CustomJwtPayload>(session.access_token);
          console.log("JWT decoded:", jwt);
          
          const userRoles = jwt.user_roles;
          console.log("User roles from JWT:", userRoles);
          
          if (!userRoles || userRoles.length === 0) {
            console.log("No user roles assigned or pending approval");
            alert('Your account is awaiting role approval. Please contact an admin.');
            await supabase.auth.signOut();
            router.push('/login');
          } else if (userRoles.includes('admin')) {
            console.log("Admin user detected, redirecting to admin page");
            router.push('/admin/roles');
          } else if (userRoles.includes('coach')) {
            console.log("Coach user detected, redirecting to coach page");
            router.push('/coach');
          } else {
            console.log("Regular user detected, redirecting to home page");
            router.push('/');
          }
        } catch (error) {
          console.error("Error processing JWT:", error);
          alert('An error occurred. Please try again.');
        }
      } else {
        console.log("No session found - user needs to log in");
      }
    };

    handleAuthRedirect();
  }, [router]);

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
