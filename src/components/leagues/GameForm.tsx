'use client'
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { supabase } from '@/lib/supabaseClient'

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
  division: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed'
  score_home: number | null
  score_away: number | null
  created_at: string | null
  updated_at: string | null
}

interface Team {
  id: string
  name: string
  club_affiliation?: string
  season?: string
  age_group?: string
  gender?: string
}

interface LeagueDivision {
  id: string
  league_id: string
  name: string
  description: string | null
  team_count?: number
  created_at: string | null
  updated_at: string | null
}

interface GameFormProps {
  leagueId: string
  game?: Game | null
  isDarkMode: boolean
  selectedDivision?: string | null
  onClose: () => void
  onSave: () => void
}

export default function GameForm({
  leagueId,
  game,
  isDarkMode,
  selectedDivision,
  onClose,
  onSave
}: GameFormProps) {
  const [newGame, setNewGame] = useState<Omit<Game, 'id' | 'created_at' | 'updated_at'>>({
    league_id: leagueId,
    home_team: '',
    away_team: '',
    home_team_name: '',
    away_team_name: '',
    location: '',
    game_date: '',
    start_time: '',
    division: selectedDivision || '',
    status: 'scheduled',
    score_home: null,
    score_away: null
  })
  
  const [teamSearchQuery, setTeamSearchQuery] = useState({ home: '', away: '' })
  const [teamSearchResults, setTeamSearchResults] = useState<{ home: Team[], away: Team[] }>({ home: [], away: [] })
  const [selectedTeams, setSelectedTeams] = useState<{ home: Team | null, away: Team | null }>({ home: null, away: null })
  const [isSearching, setIsSearching] = useState({ home: false, away: false })
  const [showTeamResults, setShowTeamResults] = useState({ home: false, away: false })
  
  const [divisionSearchQuery, setDivisionSearchQuery] = useState('')
  const [divisionSearchResults, setDivisionSearchResults] = useState<LeagueDivision[]>([])
  const [selectedDivisionEntity, setSelectedDivisionEntity] = useState<LeagueDivision | null>(null)
  const [isSearchingDivision, setIsSearchingDivision] = useState(false)
  const [showDivisionResults, setShowDivisionResults] = useState(false)
  
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize the form with game data when editing
    if (game) {
      setNewGame({
        league_id: game.league_id,
        home_team: game.home_team,
        away_team: game.away_team,
        home_team_name: game.home_team_name,
        away_team_name: game.away_team_name,
        location: game.location || '',
        game_date: game.game_date || '',
        start_time: game.start_time || '',
        division: game.division || '',
        status: game.status,
        score_home: game.score_home,
        score_away: game.score_away
      })
      
      // Load team and division data
      loadTeamsForGame(game)
    } else if (selectedDivision) {
      // Set the division from prop if creating a new game
      setNewGame(prev => ({
        ...prev,
        division: selectedDivision
      }))
      setDivisionSearchQuery(selectedDivision)
    }
  }, [game, selectedDivision])

  // Load team and division data when editing a game
  const loadTeamsForGame = async (game: Game) => {
    try {
      // Get home team details
      const { data: homeTeam, error: homeError } = await supabase
        .from('teams')
        .select('id, name, club_affiliation, season, age_group, gender')
        .eq('id', game.home_team)
        .single()
        
      if (homeError) throw homeError
      
      // Get away team details
      const { data: awayTeam, error: awayError } = await supabase
        .from('teams')
        .select('id, name, club_affiliation, season, age_group, gender')
        .eq('id', game.away_team)
        .single()
        
      if (awayError) throw awayError
      
      // Set the team search state
      if (homeTeam) {
        setTeamSearchQuery(prev => ({ ...prev, home: homeTeam.name }))
        setSelectedTeams(prev => ({ ...prev, home: homeTeam }))
      }
      
      if (awayTeam) {
        setTeamSearchQuery(prev => ({ ...prev, away: awayTeam.name }))
        setSelectedTeams(prev => ({ ...prev, away: awayTeam }))
      }
      
      // If game has a division, try to get division details
      if (game.division) {
        setDivisionSearchQuery(game.division)
        
        const { data: divisionData, error: divisionError } = await supabase
          .from('league_divisions')
          .select('*')
          .eq('league_id', game.league_id)
          .eq('name', game.division)
          .single()
          
        if (!divisionError && divisionData) {
          setSelectedDivisionEntity(divisionData)
        }
      }
    } catch (error: any) {
      console.error('Error fetching details:', error)
      // If we fail to get team details, we still want to show the game form
      // We'll just use the IDs as the search query
      setTeamSearchQuery({ 
        home: game.home_team_name, 
        away: game.away_team_name 
      })
      
      // Also set the division search query if available
      if (game.division) {
        setDivisionSearchQuery(game.division)
      }
    }
  }

  // Effect to close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // Only handle clicks if team search results or division search results are showing
      if (!showTeamResults.home && !showTeamResults.away && !showDivisionResults) return
      
      const target = e.target as Element
      
      // Close team search results
      if (!target.closest('.team-search-container')) {
        setShowTeamResults({ home: false, away: false })
      }
      
      // Close division search results
      if (!target.closest('.division-search-container')) {
        setShowDivisionResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTeamResults, showDivisionResults])

  // Handle searching for teams
  const searchTeams = async (query: string, type: 'home' | 'away') => {
    if (query.trim().length < 2) {
      setTeamSearchResults(prev => ({ ...prev, [type]: [] }))
      return
    }

    setIsSearching(prev => ({ ...prev, [type]: true }))
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, club_affiliation, season, age_group, gender')
        .ilike('name', `%${query}%`)
        .limit(5)

      if (error) throw error
      
      setTeamSearchResults(prev => ({ ...prev, [type]: data || [] }))
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
        newState.home_team = team.id
        newState.home_team_name = team.name
      } else {
        newState.away_team = team.id
        newState.away_team_name = team.name
      }
      return newState
    })
  }

  // Handle searching for divisions
  const searchDivisions = async (query: string) => {
    if (query.trim().length < 2) {
      setDivisionSearchResults([])
      return
    }

    setIsSearchingDivision(true)
    try {
      const { data, error } = await supabase
        .from('league_divisions')
        .select('*')
        .eq('league_id', leagueId)
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(5)

      if (error) throw error
      
      setDivisionSearchResults(data || [])
      setShowDivisionResults(true)
    } catch (error: any) {
      console.error('Error searching for divisions:', error)
    } finally {
      setIsSearchingDivision(false)
    }
  }

  // Handle selecting a division from search results
  const handleSelectDivision = (division: LeagueDivision) => {
    setSelectedDivisionEntity(division)
    setDivisionSearchQuery(division.name)
    setShowDivisionResults(false)
    
    // Update the new game state
    setNewGame(prev => ({
      ...prev,
      division: division.name
    }))
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
      
      // Create or get division if entered
      let division = null
      if (divisionSearchQuery.trim()) {
        division = await createDivisionIfNeeded(divisionSearchQuery)
      }

      // Prepare the game data
      const gameData = {
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        location: newGame.location,
        game_date: newGame.game_date,
        game_time: newGame.start_time,
        status: newGame.status,
        score_home: newGame.score_home,
        score_away: newGame.score_away
      }

      if (game) {
        // Update existing game
        const { error } = await supabase
          .from('games')
          .update(gameData)
          .eq('id', game.id)

        if (error) throw error
        toast.success('Game updated successfully!')
      } else {
        // Create new game
        const { data, error } = await supabase
          .from('games')
          .insert([gameData])
          .select()

        if (error) throw error
        if (data && data.length > 0) {
          const gameId = data[0].id
          
          // Create the league_games relation
          const { error: leagueGameError } = await supabase
            .from('league_games')
            .insert([{
              league_id: leagueId,
              game_id: gameId
            }])
            
          if (leagueGameError) throw leagueGameError

          // Automatically add teams to this league if they're not already members
          await ensureTeamsInLeague(homeTeamId, awayTeamId, leagueId, division)
        }
        
        toast.success('Game added successfully!')
      }

      // Reset form and notify parent
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

    // Check if there's already a selected team with an ID
    if (selectedTeams[type]?.id) {
      return selectedTeams[type]!.id
    }

    // Try to find an existing team with this exact name
    const { data: existingTeams, error: searchError } = await supabase
      .from('teams')
      .select('id')
      .eq('name', teamName.trim())
      .limit(1)

    if (searchError) throw searchError

    // If team already exists, return its ID
    if (existingTeams && existingTeams.length > 0) {
      return existingTeams[0].id
    }

    // Otherwise create a new team
    // Use context from the league or the other team if available
    const otherType = type === 'home' ? 'away' : 'home'
    const otherTeam = selectedTeams[otherType]
    
    // Get league info if available
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('season, age_group, gender')
      .eq('id', leagueId)
      .single()
    
    const newTeamData = {
      name: teamName.trim(),
      season: leagueData?.season || otherTeam?.season || null,
      age_group: leagueData?.age_group || otherTeam?.age_group || null,
      gender: leagueData?.gender || otherTeam?.gender || null,
    }

    const { data: createdTeam, error: createError } = await supabase
      .from('teams')
      .insert([newTeamData])
      .select('id')
      .single()

    if (createError) throw createError
    
    // If created successfully, return the new ID
    if (createdTeam) {
      return createdTeam.id
    }

    throw new Error(`Failed to create ${type === 'home' ? 'home' : 'away'} team`)
  }

  // Handle creating a new division if it doesn't exist
  const createDivisionIfNeeded = async (divisionName: string): Promise<string | null> => {
    if (!divisionName.trim() || !leagueId) {
      return null
    }

    // Check if there's already a selected division
    if (selectedDivisionEntity?.name === divisionName.trim()) {
      return selectedDivisionEntity.name
    }

    // Try to find an existing division with this exact name
    const { data: existingDivisions, error: searchError } = await supabase
      .from('league_divisions')
      .select('id, name')
      .eq('league_id', leagueId)
      .eq('name', divisionName.trim())
      .limit(1)

    if (searchError) throw searchError

    // If division already exists, return its name
    if (existingDivisions && existingDivisions.length > 0) {
      return existingDivisions[0].name
    }

    // Otherwise create a new division
    const { data: createdDivision, error: createError } = await supabase
      .from('league_divisions')
      .insert([{
        league_id: leagueId,
        name: divisionName.trim(),
        description: `Auto-created for game on ${new Date().toLocaleDateString()}`
      }])
      .select('name')
      .single()

    if (createError) throw createError
    
    // If created successfully, return the new division name
    if (createdDivision) {
      return createdDivision.name
    }

    return null
  }

  // Ensure teams are members of the league
  const ensureTeamsInLeague = async (homeTeamId: string, awayTeamId: string, leagueId: string, division: string | null = null) => {
    try {
      // Check which teams are already in the league
      const { data: existingMemberships, error: membershipError } = await supabase
        .from('team_league_memberships')
        .select('team_id, division')
        .eq('league_id', leagueId)
        .in('team_id', [homeTeamId, awayTeamId])
      
      if (membershipError) throw membershipError
      
      const existingTeamIds = existingMemberships?.map(m => m.team_id) || []
      const teamsToAdd = []
      const teamsToUpdate = []
      
      // Add home team if not already in league
      if (!existingTeamIds.includes(homeTeamId)) {
        teamsToAdd.push({
          team_id: homeTeamId,
          league_id: leagueId,
          division: division
        })
      } else if (division && existingMemberships?.find(m => m.team_id === homeTeamId)?.division !== division) {
        // Update division if it's different and provided
        teamsToUpdate.push({
          team_id: homeTeamId,
          division: division
        })
      }
      
      // Add away team if not already in league
      if (!existingTeamIds.includes(awayTeamId)) {
        teamsToAdd.push({
          team_id: awayTeamId,
          league_id: leagueId,
          division: division
        })
      } else if (division && existingMemberships?.find(m => m.team_id === awayTeamId)?.division !== division) {
        // Update division if it's different and provided
        teamsToUpdate.push({
          team_id: awayTeamId,
          division: division
        })
      }
      
      // Add teams to league if necessary
      if (teamsToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('team_league_memberships')
          .insert(teamsToAdd)
          
        if (addError) throw addError
      }
      
      // Update team divisions if necessary
      for (const team of teamsToUpdate) {
        const { error: updateError } = await supabase
          .from('team_league_memberships')
          .update({ division: team.division })
          .eq('team_id', team.team_id)
          .eq('league_id', leagueId)
          
        if (updateError) throw updateError
      }
    } catch (error: any) {
      console.error('Error ensuring teams in league:', error)
      // We don't want to fail the entire operation if this part fails
      // So we just log the error and continue
    }
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
                    home_team: '',
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
                    away_team: '',
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
          
          <div className="relative division-search-container">
            <label className="block text-sm font-medium mb-2">Division</label>
            <input
              type="text"
              value={divisionSearchQuery}
              onChange={(e) => {
                const query = e.target.value
                setDivisionSearchQuery(query)
                
                // If text has been changed after a division was selected, clear the selection
                if (selectedDivisionEntity && selectedDivisionEntity.name !== query) {
                  setSelectedDivisionEntity(null)
                }
                
                setNewGame(prev => ({ ...prev, division: query || null }))
                searchDivisions(query)
              }}
              onFocus={() => {
                if (divisionSearchQuery.trim().length >= 2) {
                  setShowDivisionResults(true)
                }
              }}
              placeholder="Search or enter new division name"
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
            {showDivisionResults && divisionSearchResults.length > 0 && (
              <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-md shadow-lg ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border border-gray-200'
              }`}>
                {isSearchingDivision ? (
                  <div className="p-2 text-center">
                    <div className="animate-spin inline-block h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Searching...</span>
                  </div>
                ) : (
                  <ul>
                    {divisionSearchResults.map(division => (
                      <li 
                        key={division.id}
                        onClick={() => handleSelectDivision(division)}
                        className={`p-2 cursor-pointer ${
                          isDarkMode 
                            ? 'hover:bg-gray-600' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">{division.name}</div>
                        {division.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {division.description}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {selectedDivisionEntity && (
              <div className="mt-1 text-xs text-blue-500 dark:text-blue-400">
                Selected existing division: {selectedDivisionEntity.name}
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