'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/router'
import { jwtDecode, JwtPayload } from 'jwt-decode'

// Extend JwtPayload to include user_role
interface CustomJwtPayload extends JwtPayload {
  user_roles?: string[] | null;
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else {
      const user = (await supabase.auth.getUser()).data.user
      const roles = user?.user_metadata?.roles || []
      if (!Array.isArray(roles) || roles.includes('pending') || roles.length === 0) {
        await supabase.auth.updateUser({ data: { roles: ['pending'] } })
        alert('Your account is awaiting role approval. Please contact an admin.')
        await supabase.auth.signOut()
        router.push('/login')
      } else if (roles.includes('admin')) {
        router.push('/admin/roles')
      } else if (roles.includes('coach')) {
        router.push('/coach')
      } else {
        router.push('/')
      }
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
            console.log("No user roles assigned, setting to pending");
            // User doesn't have a role yet, set pending
            await supabase.auth.updateUser({ data: { roles: ['pending'] } });
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

  return (
    <div className="p-8 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Login</h1>
      <input className="border px-4 py-2 w-full" placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input type="password" className="border px-4 py-2 w-full" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <div className="space-x-2">
        <button className="bg-blue-500 text-white px-4 py-2" onClick={handleLogin}>Login</button>
        <button className="bg-red-500 text-white px-4 py-2" onClick={handleGoogleLogin}>Log in with Google</button>
      </div>
      <button className="text-sm text-blue-600 underline" onClick={() => router.push('/signup')}>Don't have an account? Sign Up</button>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}
