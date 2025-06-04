'use client'
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api/client'

interface Tournament {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  location: string | null
  age_group: string | null
  gender: string | null
  created_at: string | null
  updated_at: string | null
}

interface TournamentResponse {
  tournament: Tournament;
}

interface TournamentFormProps {
  tournament?: Tournament | null
  isDarkMode: boolean
  onClose: () => void
  onSave: () => void
}

export default function TournamentForm({
  tournament,
  isDarkMode,
  onClose,
  onSave
}: TournamentFormProps) {
  const [newTournament, setNewTournament] = useState<Omit<Tournament, 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    start_date: '',
    end_date: '',
    location: '',
    age_group: '',
    gender: ''
  })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (tournament) {
      setNewTournament({
        name: tournament.name,
        start_date: tournament.start_date || '',
        end_date: tournament.end_date || '',
        location: tournament.location || '',
        age_group: tournament.age_group || '',
        gender: tournament.gender || ''
      })
    }
  }, [tournament])

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    try {
      const tournamentData = {
        name: newTournament.name,
        start_date: newTournament.start_date || null,
        end_date: newTournament.end_date || null,
        location: newTournament.location || null,
        age_group: newTournament.age_group || null,
        gender: newTournament.gender || null
      }

      // Validate required fields
      if (!tournamentData.name) {
        throw new Error('Tournament name is required')
      }
      
      // Validate dates if both are provided
      if (tournamentData.start_date && tournamentData.end_date && new Date(tournamentData.start_date) > new Date(tournamentData.end_date)) {
        throw new Error('Start date must be before end date')
      }

      if (tournament) {
        // Update existing tournament
        const response = await apiClient.put<TournamentResponse>(`/api/tournaments/${tournament.id}`, tournamentData)
        if ('error' in response) throw response.error
        toast.success('Tournament updated successfully!')
      } else {
        // Create new tournament
        const response = await apiClient.post<TournamentResponse>('/api/tournaments', tournamentData)
        if ('error' in response) throw response.error
        toast.success('Tournament created successfully!')
      }

      // Reset form and notify parent
      setNewTournament({
        name: '',
        start_date: '',
        end_date: '',
        location: '',
        age_group: '',
        gender: ''
      })
      onSave()
    } catch (error: any) {
      console.error('Error saving tournament:', error)
      setFormError(error.message || 'Failed to save tournament. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            {tournament ? `Edit Tournament: ${tournament.name}` : 'Create New Tournament'}
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

        <form onSubmit={handleSaveTournament} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tournament Name *</label>
            <input
              type="text"
              value={newTournament.name}
              onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Age Group</label>
            <input
              type="text"
              value={newTournament.age_group || ''}
              onChange={(e) => setNewTournament({ ...newTournament, age_group: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              placeholder="e.g., U12, U14"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gender</label>
            <select
              value={newTournament.gender || ''}
              onChange={(e) => setNewTournament({ ...newTournament, gender: e.target.value })}
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
              value={newTournament.start_date || ''}
              onChange={(e) => setNewTournament({ ...newTournament, start_date: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={newTournament.end_date || ''}
              onChange={(e) => setNewTournament({ ...newTournament, end_date: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={newTournament.location || ''}
              onChange={(e) => setNewTournament({ ...newTournament, location: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              placeholder="Field or venue name"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {tournament ? 'Update Tournament' : 'Create Tournament'}
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