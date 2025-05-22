'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { withAdminAuth } from '@/components/auth'
import { useTeam } from '@/contexts/TeamContext'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-toastify'
import Link from 'next/link'

// Import new components
import LeagueTable from '@/components/leagues/LeagueTable'
import LeagueForm from '@/components/leagues/LeagueForm'
import GameTable from '@/components/games/GameTable'
import GameForm from '@/components/games/GameForm'

interface League {
  id: string
  name: string
  season: string
  age_group: string | null
  gender: string | null
  start_date: string | null
  end_date: string | null
  additional_info: any
  created_at: string | null
  updated_at: string | null
  league_divisions: { name: string }[]
}

interface Game {
  id: string
  league_id: string
  home_team: string
  away_team: string
  home_team_name: string
  away_team_name: string
  location: string | null
  game_date: string | null
  start_time: string | null
  flight: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed'
  score_home: number | null
  score_away: number | null
  created_at: string | null
  updated_at: string | null
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
      const { data, error } = await supabase
        .from('leagues')
        .select('*, league_divisions(name)')
        .order('name')

      if (error) throw error

      setLeagues(data || [])
    } catch (error: any) {
      console.error('Error fetching leagues:', error)
      setPageError(error.message || 'Failed to fetch leagues.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this league?')) return

    try {
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('League deleted successfully')
      fetchLeagues()
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
      console.log("Fetching games for league:", leagueId);
      
      // First get all divisions for this league
      const { data: leagueDivisions, error: divisionsError } = await supabase
        .from('league_divisions')
        .select('name')
        .eq('league_id', leagueId)

      if (divisionsError) throw divisionsError

      // Initialize division options with just the league divisions
      const divisionOptions = leagueDivisions ? leagueDivisions.map(d => d.name) : []
      console.log("League divisions:", divisionOptions);

      // First get all games linked to this league
      const { data: leagueGamesData, error: leagueGamesError } = await supabase
        .from('league_games')
        .select('game_id')
        .eq('league_id', leagueId)

      if (leagueGamesError) {
        console.error("Error fetching league games:", leagueGamesError);
        throw leagueGamesError;
      }

      console.log("League games data:", leagueGamesData);

      if (!leagueGamesData || leagueGamesData.length === 0) {
        console.log("No games found for this league");
        setLeagueGames([])
        setAvailableDivisions(divisionOptions)
        setSelectedDivisionTab(divisionOptions[0] || null)
        setLoadingGames(false)
        return
      }

      // Get division information separately to handle missing column
      let divisionMap: Record<string, string | null> = {};
      
      try {
        const { data: divisionData, error: divisionError } = await supabase
          .from('league_games')
          .select('game_id, division')
          .eq('league_id', leagueId)
        
        if (divisionError) {
          console.error("Error fetching division data:", divisionError);
          // Continue without division data
        } else if (divisionData) {
          divisionMap = divisionData.reduce((map, item) => {
            map[item.game_id] = item.division || null;
            return map;
          }, {} as Record<string, string | null>);
          console.log("Division map:", divisionMap);
        }
      } catch (error) {
        console.error("Error processing division data:", error);
        // Continue without division data
      }

      // Then fetch the actual game details
      const gameIds = leagueGamesData.map(item => item.game_id)
      console.log("Game IDs:", gameIds);
      
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*, home_team:home_team_id(id, name), away_team:away_team_id(id, name)')
        .in('id', gameIds)
        .order('game_date', { ascending: true })

      if (gamesError) {
        console.error("Error fetching games:", gamesError);
        throw gamesError;
      }

      console.log("Games data:", gamesData);

      // Map the fetched data to match our Game interface
      const formattedGames: Game[] = (gamesData || []).map(game => {
        return {
          id: game.id,
          league_id: leagueId,
          home_team: game.home_team_id,
          away_team: game.away_team_id,
          home_team_name: game.home_team?.name || 'Unknown Team',
          away_team_name: game.away_team?.name || 'Unknown Team',
          location: game.location,
          game_date: game.game_date,
          start_time: game.game_time,
          flight: divisionMap[game.id] || null, // Use division from junction table
          status: game.status,
          score_home: game.score_home,
          score_away: game.score_away,
          created_at: game.created_at,
          updated_at: game.updated_at
        }
      })

      console.log("Formatted games:", formattedGames);
      setLeagueGames(formattedGames)
      
      // Collect all division values from the games
      const divisionValues = Object.values(divisionMap).filter(Boolean) as string[];
      const uniqueDivisions = [...new Set(divisionValues)];
      console.log("Unique divisions from games:", uniqueDivisions);
      
      // Add divisions from games to options
      uniqueDivisions.forEach(div => {
        if (!divisionOptions.includes(div)) {
          divisionOptions.push(div);
        }
      });
      
      // Check if there are any games without a division
      const hasGamesWithoutDivision = Object.values(divisionMap).some(div => !div);
      
      // Add "No Division" tab if needed
      if (hasGamesWithoutDivision && !divisionOptions.includes("No Division")) {
        divisionOptions.push("No Division");
      }
      
      console.log("Final division options:", divisionOptions);
      setAvailableDivisions(divisionOptions);
      // Select first division in the list
      setSelectedDivisionTab(divisionOptions[0] || null);
      
    } catch (error: any) {
      console.error('Error fetching league games:', error)
      toast.error('Failed to load games')
    } finally {
      setLoadingGames(false)
    }
  }

  // Handle selecting a league for games management
  const handleSelectLeagueForGames = async (league: League) => {
    // If already selected, deselect it
    if (selectedLeagueForGames?.id === league.id) {
      setSelectedLeagueForGames(null)
      setLeagueGames([])
      setSelectedDivisionTab(null)
      setAvailableDivisions([])
      return
    }
    
    setSelectedLeagueForGames(league)
    
    // Fetch games for this league
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
      // First delete the league_games relationship
      const { error: leagueGameError } = await supabase
        .from('league_games')
        .delete()
        .eq('game_id', gameId)
        .eq('league_id', selectedLeagueForGames.id)

      if (leagueGameError) throw leagueGameError

      // Then delete the game itself
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId)

      if (error) throw error
      toast.success('Game deleted successfully')
      
      // Refresh games list
      fetchLeagueGames(selectedLeagueForGames.id)
    } catch (error: any) {
      console.error('Error deleting game:', error)
      toast.error(error.message || 'Error deleting game')
    }
  }

  // Filter games based on selected division
  const getFilteredGames = () => {
    if (!selectedDivisionTab) return leagueGames;
    
    if (selectedDivisionTab === "No Division") {
      return leagueGames.filter(g => !g.flight);
    }
    
    return leagueGames.filter(g => g.flight === selectedDivisionTab);
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

        {/* Leagues List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">All Leagues</h2>
            <button
              onClick={handleCreateClick}
              className={`px-4 py-2 rounded-md ${
                isDarkMode
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
                    className={`px-4 py-2 rounded-md ${
                      isDarkMode
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Add Game
                  </button>
                  <button
                    onClick={() => setSelectedLeagueForGames(null)}
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
                        className={`inline-block p-4 ${
                          selectedDivisionTab === division
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