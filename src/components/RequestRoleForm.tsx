import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabaseClient'

const ALL_ROLES = [
  { value: 'coach', label: 'Coach' },
  { value: 'player', label: 'Player' },
  { value: 'parent', label: 'Parent' },
]

export default function RequestRoleForm({ userRoles = [], pendingRoles = [] }: { userRoles?: string[]; pendingRoles?: string[] }) {
  const [requestedRole, setRequestedRole] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isDarkMode } = useTheme()

  // Exclude roles the user already has (active or pending)
  const unavailableRoles = new Set([...(userRoles || []), ...(pendingRoles || [])])
  const availableRoles = ALL_ROLES.filter(r => !unavailableRoles.has(r.value))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!requestedRole) {
      setError('Please select a role to request')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    setMessage('')
    
    try {
      // Get the session
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        setError('Not authenticated. Please log in again.')
        return
      }

      const response = await fetch('/api/request-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({ requestedRole })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to request role')
      } else {
        setMessage(data.message || 'Role request submitted successfully')
        setRequestedRole('')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting your request')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className={`p-4 border rounded-lg ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'} shadow-sm max-w-md`}>
      <h2 className="text-xl font-semibold mb-4">Request a Role</h2>
      
      {message && (
        <div className={`${isDarkMode ? 'bg-green-900 border-green-800 text-green-200' : 'bg-green-100 border-green-400 text-green-700'} px-4 py-3 rounded mb-4 border`}>
          {message}
        </div>
      )}
      
      {error && (
        <div className={`${isDarkMode ? 'bg-red-900 border-red-800 text-red-200' : 'bg-red-100 border-red-400 text-red-700'} px-4 py-3 rounded mb-4 border`}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`}>
            Select Role
          </label>
          <select
            className={`shadow appearance-none border rounded w-full py-2 px-3 ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-700'
            } leading-tight focus:outline-none focus:shadow-outline`}
            value={requestedRole}
            onChange={(e) => setRequestedRole(e.target.value)}
            disabled={isSubmitting || availableRoles.length === 0}
          >
            <option value="">-- Select a role --</option>
            {availableRoles.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            After requesting a role, an administrator will need to approve it.
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
            disabled={isSubmitting || availableRoles.length === 0}
          >
            {isSubmitting ? 'Submitting...' : 'Request Role'}
          </button>
        </div>
        {availableRoles.length === 0 && (
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>You have already requested or been assigned all available roles.</p>
        )}
      </form>
    </div>
  )
} 