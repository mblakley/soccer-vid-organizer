'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/router'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [requestedRole, setRequestedRole] = useState('player')
  const [error, setError] = useState('')
  const router = useRouter()
  const { isDarkMode } = useTheme()

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'pending',
          requested_role: requestedRole
        }
      }
    })
    if (error) setError(error.message)
    else router.push('/login')
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className={`max-w-md w-full space-y-4 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} p-8 rounded-lg shadow relative`}>
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <h1 className="text-2xl font-bold text-center">Sign Up</h1>
        <input 
          className={`border px-4 py-2 w-full rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          placeholder="Email" 
          onChange={e => setEmail(e.target.value)} 
        />
        <input 
          type="password" 
          className={`border px-4 py-2 w-full rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          placeholder="Password" 
          onChange={e => setPassword(e.target.value)} 
        />
        <select 
          className={`border px-4 py-2 w-full rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          value={requestedRole} 
          onChange={e => setRequestedRole(e.target.value)}
        >
          <option value="coach">Coach</option>
          <option value="player">Player</option>
          <option value="parent">Parent</option>
        </select>
        <button 
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 w-full rounded" 
          onClick={handleSignup}
        >
          Create Account
        </button>
        <div className="text-center">
          <button 
            className={`text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} hover:underline`}
            onClick={() => router.push('/login')}
          >
            Already have an account? Log In
          </button>
        </div>
        {error && <p className={`${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>}
      </div>
    </div>
  )
}
