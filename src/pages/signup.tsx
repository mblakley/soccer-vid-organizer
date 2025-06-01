'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { apiClient } from '@/lib/api/client'
import type { SignupRequest, SignupApiResponse, ErrorResponse } from '@/lib/types/auth'
import { AvailableTeam, AvailableTeamsResponse } from '@/lib/types/teams'
import { toast } from 'react-toastify'

function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string';
}

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<AvailableTeam[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<AvailableTeam | null>(null)
  const [requestedRole, setRequestedRole] = useState('player')
  const [showNewTeamForm, setShowNewTeamForm] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const { isDarkMode } = useTheme()
  const router = useRouter()

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await apiClient.get<AvailableTeamsResponse>('/api/teams/available')
      if (response && response.teams) {
        setTeams(response.teams)
      } else if (isErrorResponse(response)) {
        console.error('Error fetching teams:', response.error);
        toast.error(`Failed to fetch teams: ${response.error}`);
      } else {
        console.error('Error fetching teams: Invalid response');
        toast.error('Failed to fetch teams. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast.error('An unexpected error occurred while fetching teams.');
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      // Client-side validations
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false); // Stop loading
        return
      }

      if (!showNewTeamForm && !selectedTeam) {
        setError('Please select a team or request a new one')
        setLoading(false); // Stop loading
        return
      }

      if (showNewTeamForm && !newTeamName) {
        setError('Please enter a team name for the new team')
        setLoading(false); // Stop loading
        return
      }

      const signupData: SignupRequest = {
        email,
        password,
        full_name: fullName,
        role: requestedRole as 'admin' | 'coach' | 'player',
        team_id: selectedTeam?.id,
      };
      
      if (showNewTeamForm) {
        signupData.new_team_name = newTeamName;
        signupData.new_team_description = newTeamDescription;
      }

      const response = await apiClient.post<SignupApiResponse>('/api/auth/signup', signupData)
      
      if (isErrorResponse(response)) {
        toast.error(response.error)
        setError(response.error)
        return
      }

      if (!response.user && !showNewTeamForm) {
        toast.error('Signup failed: No user data returned.');
        setError('Signup failed: No user data returned.');
        return;
      }

      toast.success('Account created successfully! Please check your email to verify your account.')
      router.push('/login')
    } catch (err: any) {
      console.error('Error signing up:', err)
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className={`max-w-md w-full space-y-8 p-8 rounded-lg shadow-lg ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="full-name" className="sr-only">
                Full Name
              </label>
              <input
                id="full-name"
                name="full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`appearance-none rounded relative block w-full px-3 py-2 border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Full Name"
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`appearance-none rounded relative block w-full px-3 py-2 border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`appearance-none rounded relative block w-full px-3 py-2 border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`appearance-none rounded relative block w-full px-3 py-2 border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Confirm Password"
              />
            </div>
          </div>

          {/* Team Selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium">Team Selection</label>
              <button
                type="button"
                onClick={() => {
                  setShowNewTeamForm(!showNewTeamForm)
                  setSelectedTeam(null)
                }}
                className={`text-sm ${
                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                {showNewTeamForm ? 'Select Existing Team' : 'Request New Team'}
              </button>
            </div>

            {showNewTeamForm ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Team Name</label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className={`appearance-none rounded relative block w-full px-3 py-2 border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    placeholder="Enter team name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Team Description (Optional)</label>
                  <textarea
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    className={`appearance-none rounded relative block w-full px-3 py-2 border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    placeholder="Enter team description"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Search Teams</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`appearance-none rounded relative block w-full px-3 py-2 border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    placeholder="Search teams..."
                  />
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {filteredTeams.map(team => (
                    <div
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className={`p-4 mb-2 rounded cursor-pointer ${
                        selectedTeam?.id === team.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <h3 className="font-medium">{team.name}</h3>
                      {team.description && (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {team.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {selectedTeam && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Requested Role</label>
                    <select
                      value={requestedRole}
                      onChange={(e) => setRequestedRole(e.target.value)}
                      className={`appearance-none rounded relative block w-full px-3 py-2 border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      } text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    >
                      <option value="player">Player</option>
                      <option value="coach">Coach</option>
                      <option value="parent">Parent</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
