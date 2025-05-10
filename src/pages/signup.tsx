'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/router'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [requestedRole, setRequestedRole] = useState('player')
  const [error, setError] = useState('')
  const router = useRouter()

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
    <div className="p-8 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Sign Up</h1>
      <input className="border px-4 py-2 w-full" placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input type="password" className="border px-4 py-2 w-full" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <select className="border px-4 py-2 w-full" value={requestedRole} onChange={e => setRequestedRole(e.target.value)}>
        <option value="coach">Coach</option>
        <option value="player">Player</option>
        <option value="parent">Parent</option>
      </select>
      <button className="bg-green-600 text-white px-4 py-2 w-full" onClick={handleSignup}>Create Account</button>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}
