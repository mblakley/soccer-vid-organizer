'use client'
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api/client'
import { 
  League, 
  LeagueDivision, 
  CreateLeagueRequest, 
  CreateLeagueDivisionRequest,
  LeagueApiResponse,
  LeaguesListApiResponse
} from '@/lib/types/leagues'

interface LeagueFormProps {
  league?: League | null
  isDarkMode: boolean
  onClose: () => void
  onSave: () => void
}

export default function LeagueForm({
  league,
  isDarkMode,
  onClose,
  onSave
}: LeagueFormProps) {
  const [newLeague, setNewLeague] = useState<CreateLeagueRequest>({
    name: '',
    season: '',
    age_group: '',
    gender: '',
    start_date: '',
    end_date: '',
    additional_info: {}
  })
  const [newDivision, setNewDivision] = useState<CreateLeagueDivisionRequest>({ name: '', league_id: '', description: '' })
  const [currentDivisions, setCurrentDivisions] = useState<LeagueDivision[]>([])
  const [loadingDivisions, setLoadingDivisions] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (league) {
      setNewLeague({
        name: league.name,
        season: league.season,
        age_group: league.age_group || '',
        gender: league.gender || '',
        start_date: league.start_date ? new Date(league.start_date).toISOString().split('T')[0] : '',
        end_date: league.end_date ? new Date(league.end_date).toISOString().split('T')[0] : '',
        additional_info: league.additional_info || {}
      })
      
      fetchLeagueDivisions(league.id)
    }
  }, [league])

  // Fetch divisions for a specific league
  const fetchLeagueDivisions = async (leagueId: string) => {
    setLoadingDivisions(true)
    try {
      const response = await apiClient.get<LeaguesListApiResponse>(`/api/leagues/divisions?league_id=${leagueId}`)
      if ('error' in response) throw response.error
      if ('leagues' in response) {
        const divisions = response.leagues.flatMap(league => 
          league.league_divisions?.map(div => ({
            ...div,
            league_id: league.id
          })) || []
        )
        setCurrentDivisions(divisions)
      }
    } catch (error: any) {
      console.error('Error fetching league divisions:', error)
      toast.error(error.message || 'Failed to fetch divisions')
    } finally {
      setLoadingDivisions(false)
    }
  }

  // Add division to the league
  const handleAddDivision = async () => {
    if (!newDivision.name.trim()) {
      toast.error('Division name cannot be empty')
      return
    }

    if (!league) {
      toast.error('Please save the league first before adding divisions')
      return
    }

    try {
      const response = await apiClient.post<LeagueApiResponse>('/api/leagues/divisions', {
        ...newDivision,
        league_id: league.id
      })

      if ('error' in response) throw response.error

      // Add the new division to our current list
      if ('league' in response && response.league.league_divisions) {
        const newDivision = response.league.league_divisions[0]
        if (newDivision) {
          setCurrentDivisions([...currentDivisions, {
            ...newDivision,
            league_id: league.id
          }])
        }
      }

      // Reset the form
      setNewDivision({ name: '', league_id: '', description: '' })
      toast.success('Division added successfully')
    } catch (error: any) {
      console.error('Error adding division:', error)
      toast.error(error.message || 'Failed to add division')
    }
  }

  // Delete a division from the league
  const handleDeleteDivision = async (divisionId: string) => {
    if (!league) return
    
    try {
      const response = await apiClient.delete<LeagueApiResponse>(`/api/leagues/divisions/${divisionId}`)
      if ('error' in response) throw response.error

      // Remove from our list
      setCurrentDivisions(currentDivisions.filter(d => d.id !== divisionId))
      toast.success('Division deleted successfully')
    } catch (error: any) {
      console.error('Error deleting division:', error)
      toast.error(error.message || 'Failed to delete division')
    }
  }

  const handleSaveLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    try {
      const leagueData = {
        name: newLeague.name,
        season: newLeague.season,
        age_group: newLeague.age_group || null,
        gender: newLeague.gender || null,
        start_date: newLeague.start_date || null,
        end_date: newLeague.end_date || null,
        additional_info: newLeague.additional_info || {}
      }

      // Validate required fields
      if (!leagueData.name) {
        throw new Error('League name is required')
      }
      if (!leagueData.season) {
        throw new Error('Season is required')
      }
      
      // Validate dates if both are provided
      if (leagueData.start_date && leagueData.end_date && new Date(leagueData.start_date) > new Date(leagueData.end_date)) {
        throw new Error('Start date must be before end date')
      }

      if (league) {
        // Update existing league
        const response = await apiClient.put<LeagueApiResponse>(`/api/leagues/${league.id}`, leagueData)
        if ('error' in response) throw response.error
        toast.success('League updated successfully!')
      } else {
        // Create new league
        const response = await apiClient.post<LeagueApiResponse>('/api/leagues', leagueData)
        if ('error' in response) throw response.error
        
        toast.success('League created successfully!')
      }

      // Reset form and notify parent
      setNewLeague({
        name: '',
        season: '',
        age_group: '',
        gender: '',
        start_date: '',
        end_date: '',
        additional_info: {}
      })
      setCurrentDivisions([])
      onSave()
    } catch (error: any) {
      console.error('Error saving league:', error)
      setFormError(error.message || 'Failed to save league. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            {league ? `Edit League: ${league.name}` : 'Create New League'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {formError && (
          <div className={`mb-4 p-3 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSaveLeague} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">League Name *</label>
            <input
              type="text"
              value={newLeague.name}
              onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Season *</label>
            <input
              type="text"
              value={newLeague.season}
              onChange={(e) => setNewLeague({ ...newLeague, season: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              placeholder="e.g., Fall 2023"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Age Group</label>
            <input
              type="text"
              value={newLeague.age_group || ''}
              onChange={(e) => setNewLeague({ ...newLeague, age_group: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              placeholder="e.g., U12, U14"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gender</label>
            <select
              value={newLeague.gender || ''}
              onChange={(e) => setNewLeague({ ...newLeague, gender: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={newLeague.start_date || ''}
              onChange={(e) => setNewLeague({ ...newLeague, start_date: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={newLeague.end_date || ''}
              onChange={(e) => setNewLeague({ ...newLeague, end_date: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
          
          {/* Divisions section - only shown for existing leagues */}
          {league && (
            <div>
              <label className="block text-sm font-medium mb-2">League Divisions</label>
              
              {/* Add division form */}
              <div className="mb-4 p-4 border rounded border-gray-300 dark:border-gray-700">
                <h4 className="text-sm font-medium mb-2">Add New Division</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newDivision.name}
                    onChange={(e) => setNewDivision({ ...newDivision, name: e.target.value })}
                    placeholder="Division name (e.g. 'Premier', 'Division 1')"
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="text"
                    value={newDivision.description || ''}
                    onChange={(e) => setNewDivision({ ...newDivision, description: e.target.value })}
                    placeholder="Description (optional)"
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddDivision}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Add Division
                  </button>
                </div>
              </div>
              
              {/* Existing divisions */}
              <div className="mb-2">
                <h4 className="text-sm font-medium mb-2">Current Divisions</h4>
                
                {loadingDivisions ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                ) : currentDivisions.length > 0 ? (
                  <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Division</th>
                          <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Teams</th>
                          <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                          <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-600">
                        {currentDivisions.map((division) => (
                          <tr key={division.id}>
                            <td className="py-2">{division.name}</td>
                            <td className="py-2">{division.team_count}</td>
                            <td className="py-2">{division.description || '-'}</td>
                            <td className="py-2">
                              {division.team_count === 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDivision(division.id)}
                                  className="text-red-500 hover:text-red-700"
                                  title="Delete Division"
                                >
                                  ✕
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No divisions have been created yet.</p>
                )}
              </div>
              
              <div className="mt-2 p-3 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                <p className="text-sm">
                  <b>Note:</b> Divisions are automatically created when teams join this league with a new division.
                  You can also pre-create divisions here if you want them available for selection.
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {league ? 'Update League' : 'Create League'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 