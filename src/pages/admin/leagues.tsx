'use client'
import { useState, useEffect } from 'react'
// import { supabase } from '@/lib/supabaseClient' // Will be removed
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { withAdminAuth } from '@/components/auth'
import { useTeam } from '@/contexts/TeamContext'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-toastify'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client' // Existing apiClient

// Import shared types
import { League, LeagueDivision } from '@/lib/types/leagues';
import { Game } from '@/lib/types/games';
// Import specific Admin API response types
import {
  AdminListLeaguesApiResponse,
  AdminListLeaguesResponse,
  AdminDeleteApiResponse,
  AdminDeleteResponse,
  AdminLeagueGamesApiResponse,
  AdminLeagueGamesResponse
} from '@/lib/types/admin';
import { ErrorResponse } from '@/lib/types/auth';

// Import new components
import LeagueTable from '@/components/leagues/LeagueTable'
import LeagueForm from '@/components/leagues/LeagueForm'
import GameTable from '@/components/games/GameTable'
import GameForm from '@/components/games/GameForm'

// Type guard for ErrorResponse
function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string';
}

function LeaguesPage() {
  const { isDarkMode } = useTheme()
  const { selectedTeamId } = useTeam()
  
  // League states
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [showLeagueModal, setShowLeagueModal] = useState(false)
  const [editingLeague, setEditingLeague] = useState<League | null>(null)
  
  // Games management states
  const [leagueGames, setLeagueGames] = useState<Game[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [selectedLeagueForGames, setSelectedLeagueForGames] = useState<League | null>(null)
  const [showGameModal, setShowGameModal] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [selectedDivisionTab, setSelectedDivisionTab] = useState<string | null>(null)
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([])

  useEffect(() => {
    fetchLeagues()
  }, [])

  const fetchLeagues = async () => {
    setPageError(null)
    setLoading(true)
    try {
      const response = await apiClient.get<AdminListLeaguesApiResponse>('/api/admin/leagues/list')
      if (isErrorResponse(response)) {
        setPageError(response.error);
        toast.error(`Failed to fetch leagues: ${response.error}`);
        setLeagues([]);
      } else if (response && 'leagues' in response) {
        setLeagues((response as AdminListLeaguesResponse).leagues || [])
      } else {
        setPageError('Invalid response when fetching leagues.');
        toast.error('Failed to fetch leagues: Invalid response.');
        setLeagues([]);
      }
    } catch (error: any) {
      console.error('Error fetching leagues:', error)
      setPageError(error.message || 'Failed to fetch leagues.')
      toast.error(error.message || 'An unexpected error occurred while fetching leagues.');
      setLeagues([]);
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this league?')) return

    try {
      const response = await apiClient.delete<AdminDeleteApiResponse>(`/api/admin/leagues/${id}/delete`)
      if (isErrorResponse(response)) {
        toast.error(response.error || 'Error deleting league');
      } else {
        toast.success((response as AdminDeleteResponse)?.message || 'League deleted successfully')
        fetchLeagues()
        if (selectedLeagueForGames?.id === id) {
          setSelectedLeagueForGames(null);
          setLeagueGames([]);
          setAvailableDivisions([]);
          setSelectedDivisionTab(null);
        }
      }
    } catch (error: any) {
      console.error('Error deleting league:', error)
      toast.error(error.message || 'Error deleting league')
    }
  }

  const handleEditClick = (league: League) => {
    setEditingLeague(league)
    setShowLeagueModal(true)
  }

  const handleCreateClick = () => {
    setEditingLeague(null)
    setShowLeagueModal(true)
  }

  const handleCloseLeagueModal = () => {
    setShowLeagueModal(false)
    setEditingLeague(null)
  }

  const handleSaveLeague = async () => {
    setShowLeagueModal(false)
    setEditingLeague(null)
    await fetchLeagues()
  }

  // Fetch games for a specific league
  const fetchLeagueGames = async (leagueId: string) => {
    setLoadingGames(true)
    try {
      console.log("Fetching games for league:", leagueId)
      const response = await apiClient.get<AdminLeagueGamesApiResponse>(`/api/admin/leagues/${leagueId}/games`)
      
      if (isErrorResponse(response)){
        toast.error(response.error || 'Failed to load games');
        setLeagueGames([]);
        setAvailableDivisions([]);
        setSelectedDivisionTab(null);
      } else if (response && 'games' in response && 'availableDivisions' in response) {
        setLeagueGames((response as AdminLeagueGamesResponse).games || [])
        setAvailableDivisions((response as AdminLeagueGamesResponse).availableDivisions || [])
        setSelectedDivisionTab((response as AdminLeagueGamesResponse).availableDivisions?.[0] || null)
      } else {
        toast.error('Invalid response when fetching games.');
        setLeagueGames([]); 
        setAvailableDivisions([])
        setSelectedDivisionTab(null)
      }
    } catch (error: any) {
      console.error('Error fetching league games:', error)
      toast.error(error.message || 'Failed to load games')
      setLeagueGames([]) 
      setAvailableDivisions([])
      setSelectedDivisionTab(null)
    } finally {
      setLoadingGames(false)
    }
  }

  // Handle selecting a league for games management
  const handleSelectLeagueForGames = async (league: League) => {
    if (selectedLeagueForGames?.id === league.id) {
      setSelectedLeagueForGames(null)
      setLeagueGames([])
      setSelectedDivisionTab(null)
      setAvailableDivisions([])
      return
    }
    
    setSelectedLeagueForGames(league)
    await fetchLeagueGames(league.id)
  }

  // Handle creating a new game
  const handleCreateGameClick = () => {
    if (!selectedLeagueForGames) {
      toast.error('Please select a league first')
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

  // Handle saving a game
  const handleSaveGame = async () => {
    setShowGameModal(false)
    setEditingGame(null)
    if (selectedLeagueForGames) {
      await fetchLeagueGames(selectedLeagueForGames.id)
    }
  }

  // Handle deleting a game
  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return
    if (!selectedLeagueForGames) return

    try {
      const response = await apiClient.delete<AdminDeleteApiResponse>(`/api/admin/games/${gameId}/delete?leagueId=${selectedLeagueForGames.id}`)
      if(isErrorResponse(response)) {
        toast.error(response.error || 'Error deleting game');
      } else {
        toast.success((response as AdminDeleteResponse)?.message || 'Game deleted successfully')
        fetchLeagueGames(selectedLeagueForGames.id)
      }
    } catch (error: any) {
      console.error('Error deleting game:', error)
      toast.error(error.message || 'Error deleting game')
    }
  }

  // Filter games based on selected division
  const getFilteredGames = () => {
    if (!selectedDivisionTab) return leagueGames;
    
    if (selectedDivisionTab === "No Division") {
      return leagueGames.filter((g: Game) => !g.flight);
    }
    
    return leagueGames.filter((g: Game) => g.flight === selectedDivisionTab);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="mb-6">
          <Link 
            href="/admin" 
            className={`inline-flex items-center px-4 py-2 rounded-md ${isDarkMode 
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Leagues List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">All Leagues</h2>
            <button
              onClick={handleCreateClick}
              className={`px-4 py-2 rounded-md ${isDarkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Create New League
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
            <LeagueTable 
              leagues={leagues}
              isDarkMode={isDarkMode}
              onEdit={handleEditClick}
              onDelete={handleDelete}
              onSelectForGames={handleSelectLeagueForGames}
              selectedLeagueId={selectedLeagueForGames?.id || null}
            />
          )}
        </div>

        {/* Games Management Section */}
        {selectedLeagueForGames && (
          <div className="mt-8 mb-12">
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{selectedLeagueForGames.name} Games</h3>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={handleCreateGameClick}
                    className={`px-4 py-2 rounded-md ${isDarkMode
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Add Game
                  </button>
                  <button
                    onClick={() => setSelectedLeagueForGames(null)}
                    className={`px-4 py-2 rounded-md ${isDarkMode
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-gray-400 text-white hover:bg-gray-500'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Season: {selectedLeagueForGames.season} 
                {selectedLeagueForGames.age_group ? ` | Age Group: ${selectedLeagueForGames.age_group}` : ''}
                {selectedLeagueForGames.gender ? ` | Gender: ${selectedLeagueForGames.gender}` : ''}
              </p>
            </div>
            
            {/* Division tabs */}
            {availableDivisions.length > 0 ? (
              <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                <ul className="flex flex-wrap -mb-px">
                  {availableDivisions.map(division => (
                    <li key={division} className="mr-2">
                      <button
                        onClick={() => setSelectedDivisionTab(division)}
                        className={`inline-block p-4 ${selectedDivisionTab === division
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                            : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                        }`}
                      >
                        {division}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              leagueGames.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200 rounded">
                  <p className="text-sm">
                    <b>Note:</b> No divisions are assigned to any games yet. Create or edit games to assign divisions.
                  </p>
                </div>
              )
            )}
            
            {/* Games list */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {loadingGames ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <GameTable 
                  games={getFilteredGames()}
                  isDarkMode={isDarkMode}
                  selectedTeamId={selectedTeamId}
                  onEdit={handleEditGame}
                  onDelete={handleDeleteGame}
                />
              )}
            </div>
          </div>
        )}

        {/* League Form Modal */}
        {showLeagueModal && (
          <LeagueForm
            league={editingLeague}
            isDarkMode={isDarkMode}
            onClose={handleCloseLeagueModal}
            onSave={handleSaveLeague}
          />
        )}

        {/* Game Form Modal */}
        {showGameModal && selectedLeagueForGames && (
          <GameForm
            leagueId={selectedLeagueForGames.id}
            game={editingGame}
            isDarkMode={isDarkMode}
            selectedFlight={selectedDivisionTab === "No Division" ? "" : selectedDivisionTab}
            onClose={handleCloseGameModal}
            onSave={handleSaveGame}
          />
        )}
      </div>
    </div>
  )
}

export default withAdminAuth(LeaguesPage, 'League Management') 