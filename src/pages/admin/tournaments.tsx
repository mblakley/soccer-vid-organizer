'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { withAdminAuth } from '@/components/auth'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'

// Import new components
import TournamentTable from '@/components/tournaments/TournamentTable'
import TournamentForm from '@/components/tournaments/TournamentForm'
import TournamentGames from '@/components/tournaments/TournamentGames'

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

function TournamentsPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  
  // Tournament states
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [showTournamentModal, setShowTournamentModal] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  
  // Games management states
  const [selectedTournamentForGames, setSelectedTournamentForGames] = useState<Tournament | null>(null)
  const [showGameModal, setShowGameModal] = useState(false)
  const [editingGame, setEditingGame] = useState<any | null>(null)
  const [selectedFlightTab, setSelectedFlightTab] = useState<string | null>(null)
  const [availableFlights, setAvailableFlights] = useState<string[]>([])

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    setPageError(null)
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setTournaments(data || [])
    } catch (error: any) {
      console.error('Error fetching tournaments:', error)
      setPageError(error.message || 'Failed to fetch tournaments.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Tournament deleted successfully')
      fetchTournaments()
    } catch (error: any) {
      console.error('Error deleting tournament:', error)
      toast.error(error.message || 'Error deleting tournament')
    }
  }

  const handleEditClick = (tournament: Tournament) => {
    setEditingTournament(tournament)
    setShowTournamentModal(true)
  }

  const handleCreateClick = () => {
    setEditingTournament(null)
    setShowTournamentModal(true)
  }

  const handleCloseTournamentModal = () => {
    setShowTournamentModal(false)
    setEditingTournament(null)
  }

  const handleSaveTournament = async () => {
    setShowTournamentModal(false)
    setEditingTournament(null)
    await fetchTournaments()
  }

  // Handle selecting a tournament for games management
  const handleSelectTournamentForGames = async (tournament: Tournament) => {
    // If already selected, deselect it
    if (selectedTournamentForGames?.id === tournament.id) {
      setSelectedTournamentForGames(null)
      setSelectedFlightTab(null)
      setAvailableFlights([])
      return
    }
    
    setSelectedTournamentForGames(tournament)
    
    // Fetch flights for this tournament from both tournament_teams and tournament_games
    try {
      // Get flights from tournament_teams
      const { data: teamFlightsData, error: teamFlightsError } = await supabase
        .from('tournament_teams')
        .select('flight')
        .eq('tournament_id', tournament.id)
        .not('flight', 'is', null)

      if (teamFlightsError) throw teamFlightsError
      
      // Get flights from tournament_games
      const { data: gameFlightsData, error: gameFlightsError } = await supabase
        .from('tournament_games')
        .select('flight')
        .eq('tournament_id', tournament.id)
        .not('flight', 'is', null)

      if (gameFlightsError) throw gameFlightsError
      
      // Combine flights from both sources
      const teamFlights = teamFlightsData.map(item => item.flight);
      const gameFlights = gameFlightsData.map(item => item.flight);
      const allFlights = [...teamFlights, ...gameFlights];
      
      // Remove duplicates
      const uniqueFlights = [...new Set(allFlights)];
      
      setAvailableFlights(uniqueFlights)
      setSelectedFlightTab(uniqueFlights.length > 0 ? uniqueFlights[0] : null)
      
      if (uniqueFlights.length === 0) {
        console.log("No flights found for this tournament");
      }
    } catch (error: any) {
      console.error('Error fetching flights:', error)
      toast.error('Failed to load flights')
    }
  }

  // Handle creating a new game
  const handleCreateGameClick = () => {
    if (!selectedTournamentForGames) {
      toast.error('Please select a tournament first')
      return
    }

    setEditingGame(null)
    setShowGameModal(true)
  }

  // Handle editing a game
  const handleEditGame = (game: any) => {
    setEditingGame(game)
    setShowGameModal(true)
  }

  // Handle closing the game modal
  const handleCloseGameModal = () => {
    setShowGameModal(false)
    setEditingGame(null)
  }

  // Handle saving a game
  const handleSaveGame = async () => {
    setShowGameModal(false)
    setEditingGame(null)
    
    if (selectedTournamentForGames) {
      // Refresh the games list
      handleSelectTournamentForGames(selectedTournamentForGames)
    }
  }

  // Add a delete game handler
  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return
    if (!selectedTournamentForGames) return

    try {
      // First delete the tournament_games relationship
      const { error: relationshipError } = await supabase
        .from('tournament_games')
        .delete()
        .eq('game_id', gameId)
        .eq('tournament_id', selectedTournamentForGames.id)

      if (relationshipError) throw relationshipError

      // Then delete the game itself
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId)

      if (error) throw error
      toast.success('Game deleted successfully')
      
      // Refresh games list
      if (selectedTournamentForGames) {
        // Refresh the games list
        handleSelectTournamentForGames(selectedTournamentForGames)
      }
    } catch (error: any) {
      console.error('Error deleting game:', error)
      toast.error(error.message || 'Error deleting game')
    }
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="mb-6">
          <Link 
            href="/admin" 
            className={`inline-flex items-center px-4 py-2 rounded-md ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Tournaments List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">All Tournaments</h2>
            <button
              onClick={handleCreateClick}
              className={`px-4 py-2 rounded-md ${
                isDarkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Create New Tournament
            </button>
          </div>
          
          {pageError && (
            <div className={`mb-4 p-3 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
              {pageError}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <TournamentTable 
              tournaments={tournaments}
              isDarkMode={isDarkMode}
              onEdit={handleEditClick}
              onDelete={handleDelete}
              onManageGames={handleSelectTournamentForGames}
              selectedTournamentId={selectedTournamentForGames?.id || null}
            />
          )}
        </div>

        {/* Games Management Section */}
        {selectedTournamentForGames && (
          <div className="mt-8 mb-12">
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{selectedTournamentForGames.name} Games</h3>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={handleCreateGameClick}
                    className={`px-4 py-2 rounded-md ${
                      isDarkMode
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Add Game
                  </button>
                  <button
                    onClick={() => setSelectedTournamentForGames(null)}
                    className={`px-4 py-2 rounded-md ${
                      isDarkMode
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-gray-400 text-white hover:bg-gray-500'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedTournamentForGames.format ? `Format: ${selectedTournamentForGames.format}` : ''}
                {selectedTournamentForGames.location ? ` | Location: ${selectedTournamentForGames.location}` : ''}
              </p>
            </div>
            
            {/* Flight tabs */}
            {availableFlights.length > 0 ? (
              <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                <ul className="flex flex-wrap -mb-px">
                  {availableFlights.map(flight => (
                    <li key={flight} className="mr-2">
                      <button
                        onClick={() => setSelectedFlightTab(flight)}
                        className={`inline-block p-4 ${
                          selectedFlightTab === flight
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                            : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                        }`}
                      >
                        {flight}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200 rounded">
                <p className="text-sm">
                  <b>Note:</b> No flights are assigned to any games yet. Create or edit games to assign flights.
                </p>
              </div>
            )}
            
            {/* Games list */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <TournamentGames
                tournamentId={selectedTournamentForGames.id}
                isDarkMode={isDarkMode}
                selectedFlight={selectedFlightTab}
                onEdit={handleEditGame}
                onDelete={handleDeleteGame}
                onClose={() => setSelectedTournamentForGames(null)}
              />
            </div>
          </div>
        )}

        {/* Tournament Form Modal */}
        {showTournamentModal && (
          <TournamentForm
            tournament={editingTournament}
            isDarkMode={isDarkMode}
            onClose={handleCloseTournamentModal}
            onSave={handleSaveTournament}
          />
        )}

        {/* Game Form Modal */}
        {showGameModal && selectedTournamentForGames && (
          <TournamentGames
            tournamentId={selectedTournamentForGames.id}
            isDarkMode={isDarkMode}
            selectedFlight={selectedFlightTab}
            editingGame={editingGame}
            onClose={handleCloseGameModal}
            onSave={handleSaveGame}
          />
        )}
      </div>
    </div>
  )
}

export default withAdminAuth(TournamentsPage, 'Tournament Management') 