'use client'
import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { withAdminAuth } from '@/components/auth'
import { useTeam } from '@/contexts/TeamContext'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api/client'

// Import shared types
import { Tournament } from '@/lib/types/tournaments'
import { Game } from '@/lib/types/games'
// Import specific Admin API response types
import {
  AdminListTournamentsApiResponse,
  AdminListTournamentsResponse,
  AdminDeleteApiResponse,
  AdminDeleteResponse,
  AdminTournamentGamesApiResponse,
  AdminTournamentGamesResponse
} from '@/lib/types/admin'
import { ErrorResponse } from '@/lib/types/api'

// Import components
import TournamentTable from '@/components/tournaments/TournamentTable'
import TournamentForm from '@/components/tournaments/TournamentForm'
import GameTable from '@/components/games/GameTable'
import GameForm from '@/components/games/GameForm'

// Type guard for ErrorResponse
function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string'
}

function TournamentsPage() {
  const { isDarkMode } = useTheme()
  const { selectedTeamId } = useTeam()
  
  // Tournament states
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [showTournamentModal, setShowTournamentModal] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  
  // Games management states
  const [tournamentGames, setTournamentGames] = useState<Game[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [selectedTournamentForGames, setSelectedTournamentForGames] = useState<Tournament | null>(null)
  const [showGameModal, setShowGameModal] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    setPageError(null)
    setLoading(true)
    try {
      const response = await apiClient.get<AdminListTournamentsApiResponse>('/api/admin/tournaments/list')
      if (isErrorResponse(response)) {
        setPageError(response.error)
        toast.error(`Failed to fetch tournaments: ${response.error}`)
        setTournaments([])
      } else if (response && 'tournaments' in response) {
        setTournaments((response as AdminListTournamentsResponse).tournaments || [])
      } else {
        setPageError('Invalid response when fetching tournaments.')
        toast.error('Failed to fetch tournaments: Invalid response.')
        setTournaments([])
      }
    } catch (error: any) {
      console.error('Error fetching tournaments:', error)
      setPageError(error.message || 'Failed to fetch tournaments.')
      toast.error(error.message || 'An unexpected error occurred while fetching tournaments.')
      setTournaments([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return

    try {
      const response = await apiClient.delete<AdminDeleteApiResponse>(`/api/admin/tournaments/${id}/delete`)
      if (isErrorResponse(response)) {
        toast.error(response.error || 'Error deleting tournament')
      } else {
        toast.success((response as AdminDeleteResponse)?.message || 'Tournament deleted successfully')
        fetchTournaments()
        if (selectedTournamentForGames?.id === id) {
          setSelectedTournamentForGames(null)
          setTournamentGames([])
        }
      }
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

  // Fetch games for a specific tournament
  const fetchTournamentGames = async (tournamentId: string) => {
    setLoadingGames(true)
    try {
      const response = await apiClient.get<AdminTournamentGamesApiResponse>(`/api/admin/tournaments/${tournamentId}/games`)
      
      if (isErrorResponse(response)) {
        toast.error(response.error || 'Failed to load games')
        setTournamentGames([])
      } else if (response && 'games' in response) {
        setTournamentGames((response as AdminTournamentGamesResponse).games || [])
      } else {
        toast.error('Invalid response when fetching games.')
        setTournamentGames([])
      }
    } catch (error: any) {
      console.error('Error fetching tournament games:', error)
      toast.error(error.message || 'Failed to load games')
      setTournamentGames([])
    } finally {
      setLoadingGames(false)
    }
  }

  // Handle selecting a tournament for games management
  const handleSelectTournamentForGames = async (tournament: Tournament) => {
    if (selectedTournamentForGames?.id === tournament.id) {
      setSelectedTournamentForGames(null)
      setTournamentGames([])
      return
    }
    
    setSelectedTournamentForGames(tournament)
    await fetchTournamentGames(tournament.id)
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
  const handleEditGame = (game: Game) => {
    setEditingGame(game)
    setShowGameModal(true)
  }

  // Handle closing the game modal
  const handleCloseGameModal = () => {
    setShowGameModal(false)
    setEditingGame(null)
  }

  const handleSaveGame = async () => {
    setShowGameModal(false)
    setEditingGame(null)
    if (selectedTournamentForGames) {
      await fetchTournamentGames(selectedTournamentForGames.id)
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return

    try {
      const response = await apiClient.delete<AdminDeleteApiResponse>(`/api/admin/games/${gameId}/delete`)
      if (isErrorResponse(response)) {
        toast.error(response.error || 'Error deleting game')
      } else {
        toast.success((response as AdminDeleteResponse)?.message || 'Game deleted successfully')
        if (selectedTournamentForGames) {
          await fetchTournamentGames(selectedTournamentForGames.id)
        }
      }
    } catch (error: any) {
      console.error('Error deleting game:', error)
      toast.error(error.message || 'Error deleting game')
    }
  }

  return (
    <div className={`p-4 md:p-8 ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Manage Tournaments</h1>
        <button
          onClick={handleCreateClick}
          className={`px-4 py-2 rounded-md font-medium ${isDarkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-500 hover:bg-green-600'} text-white`}
        >
          Create New Tournament
        </button>
      </div>

      {pageError && (
        <div className={`p-3 mb-4 border rounded ${isDarkMode ? 'bg-red-800 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'}`} role="alert">
          <p>{pageError}</p>
          <button onClick={fetchTournaments} className="mt-2 text-xs underline">Try refreshing</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <TournamentTable
            tournaments={tournaments}
            isDarkMode={isDarkMode}
            onEdit={handleEditClick}
            onDelete={handleDelete}
            onSelectForGames={handleSelectTournamentForGames}
            selectedTournament={selectedTournamentForGames}
          />

          {selectedTournamentForGames && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Games for {selectedTournamentForGames.name}
                </h2>
                <button
                  onClick={handleCreateGameClick}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                >
                  Add Game
                </button>
              </div>

              {loadingGames ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <GameTable
                  games={tournamentGames}
                  isDarkMode={isDarkMode}
                  selectedTeamId={selectedTeamId}
                  onEdit={handleEditGame}
                  onDelete={handleDeleteGame}
                />
              )}
            </div>
          )}
        </div>
      )}

      {showTournamentModal && (
        <TournamentForm
          tournament={editingTournament}
          isDarkMode={isDarkMode}
          onClose={handleCloseTournamentModal}
          onSave={handleSaveTournament}
        />
      )}

      {showGameModal && (
        <GameForm
          game={editingGame}
          isDarkMode={isDarkMode}
          selectedFlight={selectedTournamentForGames?.flight}
          onClose={handleCloseGameModal}
          onSave={handleSaveGame}
        />
      )}
    </div>
  )
}

export default withAdminAuth(TournamentsPage, 'Manage Tournaments') 