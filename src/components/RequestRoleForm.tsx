import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface RequestRoleFormProps {
  userRoles?: string[];
  pendingRoles?: string[];
  teamId?: string;
  teamName?: string;
  onSubmissionComplete?: () => void;
}

// Define incompatible role pairs
const INCOMPATIBLE_ROLES: Record<string, string[]> = {
  'parent': ['player'],
  'player': ['parent']
}

export default function RequestRoleForm({ userRoles = [], pendingRoles = [], teamId, teamName, onSubmissionComplete }: RequestRoleFormProps) {
  const [requestedRole, setRequestedRole] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<{ value: string, label: string }[]>([])
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/roles/list')
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch roles')
        }
        const data = await response.json()
        if (data.roles) {
          setAvailableRoles(data.roles)
        }
      } catch (error: any) {
        console.error('Error in fetchRoles:', error)
        setError(error.message || 'Could not load available roles.')
      }
    }

    fetchRoles()
  }, [])

  // Get roles that are unavailable due to existing assignments or pending requests
  const unavailableRoles = new Set([...(userRoles || []), ...(pendingRoles || [])])

  // Get roles that are incompatible with current roles
  const incompatibleRoles = new Set<string>()
  for (const existingRole of userRoles) {
    const incompatible = INCOMPATIBLE_ROLES[existingRole] || []
    incompatible.forEach(role => incompatibleRoles.add(role))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!requestedRole) {
      setError('Please select a role to request')
      return
    }

    // Prevent submitting incompatible roles
    if (incompatibleRoles.has(requestedRole)) {
      setError('This role is incompatible with your current roles')
      return
    }
    
    // Validate player name is provided for parent role
    if (requestedRole === 'parent' && !playerName.trim()) {
      setError('Please enter your player\'s name')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    setMessage('')
    
    try {
      // Get the session
      const sessionResponse = await fetch('/api/auth/session');
      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch session')
      }
      const sessionData = await sessionResponse.json()

      if (!sessionData.session?.access_token) {
        setError('Not authenticated. Please log in again.')
        return
      }

      const requestBody: any = { requestedRole }
      if (teamId) {
        requestBody.teamId = teamId
      }
      
      // Include player name for parent role requests
      if (requestedRole === 'parent') {
        requestBody.playerName = playerName.trim()
      }

      const response = await fetch('/api/request-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify(requestBody)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to request role')
      } else {
        setMessage(data.message || 'Role request submitted successfully')
        setRequestedRole('')
        setPlayerName('')
        
        // Call the onSubmissionComplete callback if provided
        if (onSubmissionComplete) {
          onSubmissionComplete()
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting your request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value
    setRequestedRole(role)
    // Clear player name if not selecting parent role
    if (role !== 'parent') {
      setPlayerName('')
    }
  }
  
  return (
    <div className={`p-4 border rounded-lg ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'} shadow-sm max-w-md`}>
      <h2 className="text-xl font-semibold mb-4">
        {teamId ? `Request a Role for ${teamName || 'Team'}` : 'Request a Role'}
      </h2>
      
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
            onChange={handleRoleChange}
            disabled={isSubmitting}
          >
            <option value="">-- Select a role --</option>
            {availableRoles
              .filter(role => !unavailableRoles.has(role.value))
              .map(role => (
                <option 
                  key={role.value} 
                  value={role.value}
                  disabled={incompatibleRoles.has(role.value)}
                  className={incompatibleRoles.has(role.value) ? 'text-gray-400' : ''}
                >
                  {role.label}
                  {incompatibleRoles.has(role.value) && ' (Incompatible with current role)'}
                </option>
              ))}
          </select>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            After requesting a role, an administrator will need to approve it.
          </p>
        </div>
        
        {requestedRole === 'parent' && (
          <div className="mb-4">
            <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`}>
              Player's Name
            </label>
            <input
              type="text"
              className={`shadow appearance-none border rounded w-full py-2 px-3 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-700'
              } leading-tight focus:outline-none focus:shadow-outline`}
              placeholder="Enter your player's name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={isSubmitting}
            />
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
              This helps us link you to the correct player.
            </p>
          </div>
        )}
        
        <div>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={isSubmitting || !requestedRole || incompatibleRoles.has(requestedRole) || (requestedRole === 'parent' && !playerName.trim())}
          >
            {isSubmitting ? 'Submitting...' : 'Request Role'}
          </button>
        </div>
      </form>
    </div>
  )
} 