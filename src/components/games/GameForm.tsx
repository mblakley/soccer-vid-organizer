'use client'
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api/client'
import { Team, TeamsApiResponse } from '@/lib/types/teams'
import { Game, GameApiResponse } from '@/lib/types/games'
import { ErrorResponse } from '@/lib/types/api'

// Define the league game response type
type LeagueGameResponse = { id: string }[] | ErrorResponse;

interface GameFormProps {
  game?: Game | null
  isDarkMode: boolean
  selectedFlight?: string | null
  leagueId?: string
  onClose: () => void
  onSave: () => void
}

export default function GameForm({
  game,
  isDarkMode,
  selectedFlight,
  leagueId,
  onClose,
  onSave
}: GameFormProps) {
  const [newGame, setNewGame] = useState<Omit<Game, 'id' | 'created_at' | 'updated_at'>>({
    home_team_id: null,
    away_team_id: null,
    home_team_name: null,
    away_team_name: null,
    location: null,
    game_date: null,
    start_time: null,
    flight: selectedFlight || null,
    status: 'scheduled',
    score_home: null,
    score_away: null,
    type: null,
    league_id: null,
    tournament_id: null,
    notes: null
  })
  
  const [teamSearchQuery, setTeamSearchQuery] = useState({ home: '', away: '' })
  const [teamSearchResults, setTeamSearchResults] = useState<{ home: Team[], away: Team[] }>({ home: [], away: [] })
  const [selectedTeams, setSelectedTeams] = useState<{ home: Team | null, away: Team | null }>({ home: null, away: null })
  const [isSearching, setIsSearching] = useState({ home: false, away: false })
  const [showTeamResults, setShowTeamResults] = useState({ home: false, away: false })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize the form with game data when editing
    if (game) {
      setNewGame({
        home_team_id: game.home_team_id,
        away_team_id: game.away_team_id,
        home_team_name: game.home_team_name,
        away_team_name: game.away_team_name,
        location: game.location || '',
        game_date: game.game_date || '',
        start_time: game.start_time || '',
        flight: game.flight || '',
        status: game.status,
        score_home: game.score_home,
        score_away: game.score_away,
        type: game.type,
        league_id: game.league_id,
        tournament_id: game.tournament_id,
        notes: game.notes
      })
      
      // Load team data
      loadTeamsForGame(game)
    } else if (selectedFlight) {
      // Set the flight from prop if creating a new game
      setNewGame(prev => ({
        ...prev,
        flight: selectedFlight
      }))
    }
  }, [game, selectedFlight])

  // Load team data when editing a game
  const loadTeamsForGame = async (game: Game) => {
    try {
      const homeTeamResp = await apiClient.get<TeamsApiResponse>(`/api/teams/${game.home_team_id}`);
      if ('error' in homeTeamResp && homeTeamResp.error) throw homeTeamResp.error;
      const homeTeam = 'teams' in homeTeamResp ? homeTeamResp.teams[0] : undefined;
      const awayTeamResp = await apiClient.get<TeamsApiResponse>(`/api/teams/${game.away_team_id}`);
      if ('error' in awayTeamResp && awayTeamResp.error) throw awayTeamResp.error;
      const awayTeam = 'teams' in awayTeamResp ? awayTeamResp.teams[0] : undefined;

      if (homeTeam) {
        setTeamSearchQuery(prev => ({ ...prev, home: homeTeam.name }))
        setSelectedTeams(prev => ({ ...prev, home: homeTeam }))
      }
      if (awayTeam) {
        setTeamSearchQuery(prev => ({ ...prev, away: awayTeam.name }))
        setSelectedTeams(prev => ({ ...prev, away: awayTeam }))
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load team information');
    }
  }

  // Effect to close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // Only handle clicks if team search results are showing
      if (!showTeamResults.home && !showTeamResults.away) return
      
      const target = e.target as Element
      
      // Close team search results
      if (!target.closest('.team-search-container')) {
        setShowTeamResults({ home: false, away: false })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTeamResults])

  // Handle searching for teams
  const searchTeams = async (query: string, type: 'home' | 'away') => {
    if (query.trim().length < 2) {
      setTeamSearchResults(prev => ({ ...prev, [type]: [] }))
      return
    }

    setIsSearching(prev => ({ ...prev, [type]: true }))
    try {
      const resp = await apiClient.get<TeamsApiResponse>(`/api/teams?name=${query}&type=${type}&limit=5`)
      if ('error' in resp && resp.error) throw resp.error
      const teams = 'teams' in resp ? resp.teams : []
      setTeamSearchResults(prev => ({ ...prev, [type]: teams }))
      setShowTeamResults(prev => ({ ...prev, [type]: true }))
    } catch (error: any) {
      console.error(`Error searching for ${type} teams:`, error)
    } finally {
      setIsSearching(prev => ({ ...prev, [type]: false }))
    }
  }

  // Handle selecting a team from search results
  const handleSelectTeam = (team: Team, type: 'home' | 'away') => {
    setSelectedTeams(prev => ({ ...prev, [type]: team }))
    setTeamSearchQuery(prev => ({ ...prev, [type]: team.name }))
    setShowTeamResults(prev => ({ ...prev, [type]: false }))
    
    // Update the new game state with both ID and name
    setNewGame(prev => {
      const newState = { ...prev }
      if (type === 'home') {
        newState.home_team_id = team.id
        newState.home_team_name = team.name
      } else {
        newState.away_team_id = team.id
        newState.away_team_name = team.name
      }
      return newState
    })
  }

  // Handle saving a game
  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    
    try {
      // Validate required fields
      if (!teamSearchQuery.home.trim() || !teamSearchQuery.away.trim()) {
        throw new Error('Home team and away team are required')
      }

      // Create or get team IDs
      const homeTeamId = await createTeamIfNeeded(teamSearchQuery.home, 'home')
      const awayTeamId = await createTeamIfNeeded(teamSearchQuery.away, 'away')

      // Prepare the game data WITHOUT flight
      const gameData = {
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        location: newGame.location,
        game_date: newGame.game_date,
        game_time: newGame.start_time,
        status: newGame.status,
        score_home: newGame.score_home,
        score_away: newGame.score_away,
        type: newGame.type,
        league_id: newGame.league_id,
        tournament_id: newGame.tournament_id,
        notes: newGame.notes
      }

      let gameId: string;

      if (game && game.id) {
        const resp = await apiClient.put<GameApiResponse>(`/api/games/${game.id}`, gameData)
        if ('error' in resp && resp.error) throw resp.error
        gameId = game.id;
      } else {
        const resp = await apiClient.post<GameApiResponse>('/api/games', gameData)
        if ('error' in resp && resp.error) throw resp.error
        if (!('game' in resp) || !resp.game || !resp.game.id) throw new Error('Failed to create game')
        gameId = resp.game.id;
      }

      // Now handle flight/division in the junction tables
      if (leagueId) {
        const resp = await apiClient.get<LeagueGameResponse>(`/api/league_games?league_id=${leagueId}&game_id=${gameId}`)
        if ('error' in resp && resp.error) throw resp.error
        const existingConnection = Array.isArray(resp) ? resp : []
        if (existingConnection && existingConnection.length > 0) {
          const updateResp = await apiClient.put<GameApiResponse>(`/api/league_games/${existingConnection[0].id}`, { division: newGame.flight })
          if ('error' in updateResp && updateResp.error) throw updateResp.error
        } else {
          const insertResp = await apiClient.post<GameApiResponse>('/api/league_games', { 
            league_id: leagueId, 
            game_id: gameId,
            division: newGame.flight
          })
          if ('error' in insertResp && insertResp.error) throw insertResp.error
        }
      }
      
      toast.success(game ? 'Game updated successfully!' : 'Game added successfully!')
      onSave()
    } catch (error: any) {
      console.error('Error saving game:', error)
      setFormError(error.message || 'Failed to save game')
    }
  }

  // Handle creating a new team if it doesn't exist
  const createTeamIfNeeded = async (teamName: string, type: 'home' | 'away'): Promise<string> => {
    if (!teamName.trim()) {
      throw new Error(`${type === 'home' ? 'Home' : 'Away'} team name is required`)
    }

    if (selectedTeams[type]?.id) {
      return selectedTeams[type]!.id
    }

    const resp = await apiClient.get<TeamsApiResponse>(`/api/teams?name=${teamName.trim()}&type=${type}&limit=1`)
    if ('error' in resp && resp.error) throw resp.error
    const existingTeams = 'teams' in resp ? resp.teams : []
    if (existingTeams && existingTeams.length > 0) {
      return existingTeams[0].id
    }

    const createResp = await apiClient.post<TeamsApiResponse>('/api/teams', {
      name: teamName.trim()
    })

    if ('error' in createResp && createResp.error) throw createResp.error
    const createdTeams = 'teams' in createResp ? createResp.teams : []
    if (!createdTeams || createdTeams.length === 0) throw new Error(`Failed to create ${type === 'home' ? 'home' : 'away'} team`)
    
    return createdTeams[0].id
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            {game ? 'Edit Game' : 'Add New Game'}
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

        <form onSubmit={handleSaveGame} className="space-y-4">
          <div className="relative team-search-container">
            <label className="block text-sm font-medium mb-2">Home Team *</label>
            <input
              type="text"
              value={teamSearchQuery.home}
              onChange={(e) => {
                const query = e.target.value
                setTeamSearchQuery(prev => ({ ...prev, home: query }))
                
                // If text has been changed after a team was selected, clear the selection
                if (selectedTeams.home && selectedTeams.home.name !== query) {
                  setSelectedTeams(prev => ({ ...prev, home: null }))
                  // Also clear the game's team ID and name so a new team will be created
                  setNewGame(prev => ({ 
                    ...prev, 
                    home_team_id: null,
                    home_team_name: query // Set name to current query for new team creation
                  }))
                }
                
                searchTeams(query, 'home')
              }}
              onFocus={() => {
                if (teamSearchQuery.home.trim().length >= 2) {
                  setShowTeamResults(prev => ({ ...prev, home: true }))
                }
              }}
              placeholder="Search or enter new team name"
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              required
            />
            {showTeamResults.home && teamSearchResults.home.length > 0 && (
              <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-md shadow-lg ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border border-gray-200'
              }`}>
                {isSearching.home ? (
                  <div className="p-2 text-center">
                    <div className="animate-spin inline-block h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Searching...</span>
                  </div>
                ) : (
                  <ul>
                    {teamSearchResults.home.map(team => (
                      <li 
                        key={team.id}
                        onClick={() => handleSelectTeam(team, 'home')}
                        className={`p-2 cursor-pointer ${
                          isDarkMode 
                            ? 'hover:bg-gray-600' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">{team.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {[
                            team.club_affiliation,
                            team.season, 
                            team.age_group, 
                            team.gender
                          ].filter(Boolean).join(' • ')}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {selectedTeams.home && (
              <div className="mt-1 text-xs text-blue-500 dark:text-blue-400">
                Selected existing team: {selectedTeams.home.name}
              </div>
            )}
          </div>
          
          <div className="relative team-search-container">
            <label className="block text-sm font-medium mb-2">Away Team *</label>
            <input
              type="text"
              value={teamSearchQuery.away}
              onChange={(e) => {
                const query = e.target.value
                setTeamSearchQuery(prev => ({ ...prev, away: query }))
                
                // If text has been changed after a team was selected, clear the selection
                if (selectedTeams.away && selectedTeams.away.name !== query) {
                  setSelectedTeams(prev => ({ ...prev, away: null }))
                  // Also clear the game's team ID and name so a new team will be created
                  setNewGame(prev => ({ 
                    ...prev, 
                    away_team_id: null,
                    away_team_name: query // Set name to current query for new team creation
                  }))
                }
                
                searchTeams(query, 'away')
              }}
              onFocus={() => {
                if (teamSearchQuery.away.trim().length >= 2) {
                  setShowTeamResults(prev => ({ ...prev, away: true }))
                }
              }}
              placeholder="Search or enter new team name"
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              required
            />
            {showTeamResults.away && teamSearchResults.away.length > 0 && (
              <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-md shadow-lg ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border border-gray-200'
              }`}>
                {isSearching.away ? (
                  <div className="p-2 text-center">
                    <div className="animate-spin inline-block h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Searching...</span>
                  </div>
                ) : (
                  <ul>
                    {teamSearchResults.away.map(team => (
                      <li 
                        key={team.id}
                        onClick={() => handleSelectTeam(team, 'away')}
                        className={`p-2 cursor-pointer ${
                          isDarkMode 
                            ? 'hover:bg-gray-600' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">{team.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {[
                            team.club_affiliation,
                            team.season, 
                            team.age_group, 
                            team.gender
                          ].filter(Boolean).join(' • ')}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {selectedTeams.away && (
              <div className="mt-1 text-xs text-blue-500 dark:text-blue-400">
                Selected existing team: {selectedTeams.away.name}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Game Date</label>
            <input
              type="date"
              value={newGame.game_date || ''}
              onChange={(e) => setNewGame({ ...newGame, game_date: e.target.value || null })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Start Time</label>
            <input
              type="time"
              value={newGame.start_time || ''}
              onChange={(e) => setNewGame({ ...newGame, start_time: e.target.value || null })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={newGame.location || ''}
              onChange={(e) => setNewGame({ ...newGame, location: e.target.value || null })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              placeholder="Field or venue name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Flight</label>
            <input
              type="text"
              value={newGame.flight || ''}
              onChange={(e) => setNewGame({ ...newGame, flight: e.target.value || null })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
              placeholder="e.g., A, B, C"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={newGame.status}
              onChange={(e) => setNewGame({ 
                ...newGame, 
                status: e.target.value as 'scheduled' | 'completed' | 'cancelled' | 'postponed' 
              })}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
            </select>
          </div>
          
          {newGame.status === 'completed' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Home Score</label>
                <input
                  type="number"
                  min="0"
                  value={newGame.score_home !== null ? newGame.score_home : ''}
                  onChange={(e) => setNewGame({ 
                    ...newGame, 
                    score_home: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  className={`w-full p-2 rounded border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Away Score</label>
                <input
                  type="number"
                  min="0"
                  value={newGame.score_away !== null ? newGame.score_away : ''}
                  onChange={(e) => setNewGame({ 
                    ...newGame, 
                    score_away: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  className={`w-full p-2 rounded border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
            </div>
          )}
          
          <div className="flex space-x-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {game ? 'Update Game' : 'Add Game'}
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