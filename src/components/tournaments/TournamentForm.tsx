'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'react-toastify'

interface Tournament {
  id: string
  name: string
  start_date: string
  end_date: string
  location: string | null
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  format: string | null
  description: string | null
  flight: string | null
  age_group: string | null
  additional_info: any
  created_at: string | null
  updated_at: string | null
}

interface TournamentFormProps {
  tournament: Tournament | null
  isDarkMode: boolean
  onClose: () => void
  onSave: () => void
}

export default function TournamentForm({
  tournament,
  isDarkMode,
  onClose,
  onSave,
}: TournamentFormProps) {
  const [newTournament, setNewTournament] = useState({
    name: '',
    start_date: '',
    end_date: '',
    location: '',
    status: 'upcoming' as 'upcoming' | 'in_progress' | 'completed' | 'cancelled',
    format: '',
    description: '',
    additional_info: {}
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [loadingFlights, setLoadingFlights] = useState(false)
  const [currentFlights, setCurrentFlights] = useState<{ flight: string; team_count: number }[]>([])

  useEffect(() => {
    if (tournament) {
      setNewTournament({
        name: tournament.name,
        start_date: tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : '',
        end_date: tournament.end_date ? new Date(tournament.end_date).toISOString().split('T')[0] : '',
        location: tournament.location || '',
        status: tournament.status,
        format: tournament.format || '',
        description: tournament.description || '',
        additional_info: tournament.additional_info || {}
      })
      fetchCurrentFlights(tournament.id)
    }
  }, [tournament])

  const fetchCurrentFlights = async (tournamentId: string) => {
    setLoadingFlights(true)
    try {
      const { data: flightsData, error: flightsError } = await supabase
        .from('tournament_teams')
        .select('flight')
        .eq('tournament_id', tournamentId)
        .not('flight', 'is', null)

      if (flightsError) throw flightsError
      
      const flightCounts: Record<string, number> = {}
      
      flightsData.forEach((item: { flight: string }) => {
        if (flightCounts[item.flight]) {
          flightCounts[item.flight]++
        } else {
          flightCounts[item.flight] = 1
        }
      })
      
      const flightsWithCounts = Object.entries(flightCounts).map(
        ([flight, count]) => ({
          flight,
          team_count: count
        })
      )

      setCurrentFlights(flightsWithCounts)
    } catch (error: any) {
      console.error('Error fetching current flights:', error)
    } finally {
      setLoadingFlights(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    try {
      const tournamentData = {
        name: newTournament.name,
        start_date: newTournament.start_date || null,
        end_date: newTournament.end_date || null,
        location: newTournament.location || null,
        status: newTournament.status,
        format: newTournament.format || null,
        description: newTournament.description || null,
        additional_info: newTournament.additional_info || {}
      }

      // Validate required fields
      if (!tournamentData.name) {
        throw new Error('Tournament name is required')
      }
      if (!tournamentData.start_date) {
        throw new Error('Start date is required')
      }
      if (!tournamentData.end_date) {
        throw new Error('End date is required')
      }
      
      // Validate dates
      if (new Date(tournamentData.start_date) > new Date(tournamentData.end_date)) {
        throw new Error('Start date must be before end date')
      }

      if (tournament) {
        // Update existing tournament
        const { error } = await supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('id', tournament.id)
        if (error) throw error
        toast.success('Tournament updated successfully!')
      } else {
        // Create new tournament
        const { error } = await supabase
          .from('tournaments')
          .insert([tournamentData])
        if (error) throw error
        toast.success('Tournament created successfully!')
      }

      onSave()
    } catch (error: any) {
      console.error('Error saving tournament:', error)
      setFormError(error.message || 'Failed to save tournament. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto`}>
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

        <form onSubmit={handleSave} className="space-y-4">
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
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={newTournament.location}
              onChange={(e) => setNewTournament({ ...newTournament, location: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              placeholder="e.g., Main Stadium"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <input
              type="text"
              value={newTournament.format}
              onChange={(e) => setNewTournament({ ...newTournament, format: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              placeholder="e.g., Group Stage + Knockout"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={newTournament.description}
              onChange={(e) => setNewTournament({ ...newTournament, description: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              placeholder="Enter tournament details, scoring rules, and other important information"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status *</label>
            <select
              value={newTournament.status}
              onChange={(e) => setNewTournament({ ...newTournament, status: e.target.value as 'upcoming' | 'in_progress' | 'completed' | 'cancelled' })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              required
            >
              <option value="upcoming">Upcoming</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Start Date *</label>
            <input
              type="date"
              value={newTournament.start_date}
              onChange={(e) => setNewTournament({ ...newTournament, start_date: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date *</label>
            <input
              type="date"
              value={newTournament.end_date}
              onChange={(e) => setNewTournament({ ...newTournament, end_date: e.target.value })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              required
            />
          </div>

          {/* Current flights section - only shown for existing tournaments */}
          {tournament && (
            <div>
              <label className="block text-sm font-medium mb-2">Flights Currently In Use</label>
              
              {loadingFlights ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              ) : currentFlights.length > 0 ? (
                <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Flight</th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Teams</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {currentFlights.map((flight, index) => (
                        <tr key={index}>
                          <td className="py-2">{flight.flight}</td>
                          <td className="py-2">{flight.team_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No flights are currently in use.</p>
              )}
              
              <div className="mt-2 p-3 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                <p className="text-sm">
                  <b>Note:</b> Flights are created dynamically when teams register for this tournament. When registering a team, you can specify any flight name, and it will be automatically created.
                </p>
              </div>
            </div>
          )}

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