'use client'
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api/client'
import GameTable from '@/components/games/GameTable'
import GameForm from '@/components/games/GameForm'
import { Game, GamesListResponse } from '@/lib/types/games'

interface TournamentGamesProps {
  tournamentId: string
  isDarkMode: boolean
}

export default function TournamentGames({
  tournamentId,
  isDarkMode
}: TournamentGamesProps) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showGameForm, setShowGameForm] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null)

  useEffect(() => {
    fetchGames()
  }, [tournamentId])

  const fetchGames = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get<GamesListResponse>(`/api/tournaments/${tournamentId}/games`)
      if ('error' in response) throw response.error
      setGames(response.games || [])
    } catch (error: any) {
      console.error('Error fetching games:', error)
      toast.error(error.message || 'Failed to fetch games')
    } finally {
      setLoading(false)
    }
  }

  const handleEditGame = (game: Game) => {
    setSelectedGame(game)
    setSelectedFlight(game.flight)
    setShowGameForm(true)
  }

  const handleAddGame = () => {
    setSelectedGame(null)
    setSelectedFlight(null)
    setShowGameForm(true)
  }

  const handleCloseGameForm = () => {
    setShowGameForm(false)
    setSelectedGame(null)
    setSelectedFlight(null)
  }

  const handleSaveGame = () => {
    fetchGames()
    handleCloseGameForm()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Tournament Games</h2>
        <button
          onClick={handleAddGame}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Game
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <GameTable
          games={games}
          isDarkMode={isDarkMode}
          onEdit={handleEditGame}
          selectedTeamId={null}
          onDelete={() => {}}
        />
      )}

      {showGameForm && (
        <GameForm
          game={selectedGame}
          isDarkMode={isDarkMode}
          selectedFlight={selectedFlight}
          onClose={handleCloseGameForm}
          onSave={handleSaveGame}
        />
      )}
    </div>
  )
} 