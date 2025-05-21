'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { withAdminAuth } from '@/components/auth'
import { Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'react-toastify'
import Link from 'next/link'
import { useTeam } from '@/contexts/TeamContext'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table'

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

// Interface for divisions in use
interface LeagueDivision {
  id: string
  league_id: string
  name: string
  description: string | null
  team_count?: number
  created_at: string | null
  updated_at: string | null
}

// Interface for games within a league
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

// Interface for team data
interface Team {
  id: string
  name: string
  club_affiliation?: string
  season?: string
  age_group?: string
  gender?: string
}

// Interface for team context
interface TeamContextType {
  team: Team | null
  setTeam: (team: Team | null) => void
}

const columnHelper = createColumnHelper<League>()

function LeaguesPage() {
  const [newLeague, setNewLeague] = useState({
    name: '',
    season: '',
    age_group: '',
    gender: '',
    start_date: '',
    end_date: '',
    additional_info: {}
  })
  const [newDivision, setNewDivision] = useState({ name: '', description: '' })
  const { isDarkMode } = useTheme()
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDivisions, setLoadingDivisions] = useState(false)
  const [currentDivisions, setCurrentDivisions] = useState<LeagueDivision[]>([])
  const [editingLeagueId, setEditingLeagueId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [showLeagueModal, setShowLeagueModal] = useState(false)
  
  // Games management states
  const [leagueGames, setLeagueGames] = useState<Game[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [newGame, setNewGame] = useState<Omit<Game, 'id' | 'created_at' | 'updated_at'>>({
    league_id: '',
    home_team: '',
    away_team: '',
    home_team_name: '',
    away_team_name: '',
    location: '',
    game_date: '',
    start_time: '',
    division: '',
    status: 'scheduled',
    score_home: null,
    score_away: null
  })
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [showGameModal, setShowGameModal] = useState(false)
  const [gameFormError, setGameFormError] = useState<string | null>(null)
  const [selectedLeagueForGames, setSelectedLeagueForGames] = useState<League | null>(null)
  const [selectedDivisionTab, setSelectedDivisionTab] = useState<string | null>(null)
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([])
  
  // Team search states
  const [teamSearchQuery, setTeamSearchQuery] = useState({ home: '', away: '' })
  const [teamSearchResults, setTeamSearchResults] = useState<{ home: Team[], away: Team[] }>({ home: [], away: [] })
  const [selectedTeams, setSelectedTeams] = useState<{ home: Team | null, away: Team | null }>({ home: null, away: null })
  const [isSearching, setIsSearching] = useState({ home: false, away: false })
  const [showTeamResults, setShowTeamResults] = useState({ home: false, away: false })
  
  // Division search states
  const [divisionSearchQuery, setDivisionSearchQuery] = useState('')
  const [divisionSearchResults, setDivisionSearchResults] = useState<LeagueDivision[]>([])
  const [selectedDivision, setSelectedDivision] = useState<LeagueDivision | null>(null)
  const [isSearchingDivision, setIsSearchingDivision] = useState(false)
  const [showDivisionResults, setShowDivisionResults] = useState(false)

  const { selectedTeamId } = useTeam()
  const [gamesSorting, setGamesSorting] = useState<SortingState>([
    { id: 'game_date', desc: false }
  ])

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('season', {
      header: 'Season',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('age_group', {
      header: 'Age Group',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('gender', {
      header: 'Gender',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('start_date', {
      header: 'Start Date',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '-',
    }),
    columnHelper.accessor('end_date', {
      header: 'End Date',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '-',
    }),
    columnHelper.accessor('league_divisions', {
      id: 'divisions',
      header: 'Divisions',
      cell: info => {
        const divisionObjects = info.getValue() as { name: string }[];
        if (!divisionObjects || divisionObjects.length === 0) return '-';
        return (
          <ul className="list-disc list-inside">
            {divisionObjects.map(div => (
              <li key={div.name}>{div.name}</li>
            ))}
          </ul>
        );
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '-',
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditClick(props.row.original)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Edit League"
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => handleSelectLeagueForGames(props.row.original)}
            className={`text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
              selectedLeagueForGames?.id === props.row.original.id ? 'bg-blue-100 dark:bg-blue-900' : ''
            }`}
            title="Manage Games"
          >
            <span className="text-xs font-bold">Games</span>
          </button>
          <button
            onClick={() => handleDelete(props.row.original.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Delete League"
          >
            <Trash2 size={20} />
          </button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: leagues,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  useEffect(() => {
    fetchLeagues()
  }, [])

  // Fetch divisions for a specific league
  const fetchLeagueDivisions = async (leagueId: string) => {
    setLoadingDivisions(true)
    try {
      // Get all divisions for this league from league_divisions
      const { data: divisionsData, error: divisionsError } = await supabase
        .from('league_divisions')
        .select('*')
        .eq('league_id', leagueId)
        .order('name')

      if (divisionsError) throw divisionsError

      // Get team counts for each division
      const { data: membershipData, error: membershipError } = await supabase
        .from('team_league_memberships')
        .select('division')
        .eq('league_id', leagueId)
        .not('division', 'is', null)

      if (membershipError) throw membershipError

      // Count teams per division
      const teamCounts: Record<string, number> = {}
      
      membershipData.forEach((membership) => {
        if (!membership.division) return;
        
        if (!teamCounts[membership.division]) {
          teamCounts[membership.division] = 0
        }
        
        teamCounts[membership.division]++
      })

      // Add team counts to division objects
      const divisionsWithCounts = divisionsData.map(division => ({
        ...division,
        team_count: teamCounts[division.name] || 0
      }))

      console.log('fetchLeagueDivisions',divisionsWithCounts)
      setCurrentDivisions(divisionsWithCounts)
    } catch (error: any) {
      console.error('Error fetching league divisions:', error)
    } finally {
      setLoadingDivisions(false)
    }
  }

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

  // Handle clicking the Edit button for a league
  const handleEditClick = (leagueToEdit: League) => {
    setEditingLeagueId(leagueToEdit.id)
    setNewLeague({
      name: leagueToEdit.name,
      season: leagueToEdit.season,
      age_group: leagueToEdit.age_group || '',
      gender: leagueToEdit.gender || '',
      start_date: leagueToEdit.start_date ? new Date(leagueToEdit.start_date).toISOString().split('T')[0] : '',
      end_date: leagueToEdit.end_date ? new Date(leagueToEdit.end_date).toISOString().split('T')[0] : '',
      additional_info: leagueToEdit.additional_info || {}
    })
    
    // Fetch current divisions for this league
    fetchLeagueDivisions(leagueToEdit.id)
    
    setShowLeagueModal(true)
  }

  // Handle opening the create league modal
  const handleCreateClick = () => {
    setEditingLeagueId(null)
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
    setNewDivision({ name: '', description: '' })
    setShowLeagueModal(true)
  }

  // Handle closing the league modal
  const handleCloseLeagueModal = () => {
    setShowLeagueModal(false)
    setEditingLeagueId(null)
    setFormError(null)
    setCurrentDivisions([])
    setNewDivision({ name: '', description: '' })
    setLeagueGames([])
  }

  // Add division to the league
  const handleAddDivision = async () => {
    if (!newDivision.name.trim()) {
      toast.error('Division name cannot be empty')
      return
    }

    if (!editingLeagueId) {
      toast.error('Please save the league first before adding divisions')
      return
    }

    try {
      // First check if this division already exists
      const { data: existingDivisions, error: checkError } = await supabase
        .from('league_divisions')
        .select('id')
        .eq('league_id', editingLeagueId)
        .eq('name', newDivision.name.trim())

      if (checkError) throw checkError

      if (existingDivisions && existingDivisions.length > 0) {
        toast.error('This division already exists')
        return
      }

      // Add the division
      const { data, error } = await supabase
        .from('league_divisions')
        .insert([
          {
            league_id: editingLeagueId,
            name: newDivision.name.trim(),
            description: newDivision.description || null
          }
        ])
        .select()

      if (error) throw error

      // Add the new division to our current list
      if (data) {
        setCurrentDivisions([...currentDivisions, { ...data[0], team_count: 0 }])
      }

      // Reset the form
      setNewDivision({ name: '', description: '' })
      toast.success('Division added successfully')
    } catch (error: any) {
      console.error('Error adding division:', error)
      toast.error(error.message || 'Failed to add division')
    }
  }

  // Delete a division from the league
  const handleDeleteDivision = async (divisionId: string) => {
    try {
      // Check if the division is being used by any teams
      const { data: teams, error: checkError } = await supabase
        .from('team_league_memberships')
        .select('id')
        .eq('league_id', editingLeagueId!)
        .eq('division', currentDivisions.find(d => d.id === divisionId)?.name || '')

      if (checkError) throw checkError

      if (teams && teams.length > 0) {
        toast.error('Cannot delete a division that has teams assigned to it')
        return
      }

      // Delete the division
      const { error } = await supabase
        .from('league_divisions')
        .delete()
        .eq('id', divisionId)

      if (error) throw error

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

      if (editingLeagueId) {
        // Update existing league
        const { error } = await supabase
          .from('leagues')
          .update(leagueData)
          .eq('id', editingLeagueId)
        if (error) throw error
        toast.success('League updated successfully!')
      } else {
        // Create new league
        const { data, error } = await supabase
          .from('leagues')
          .insert([leagueData])
          .select()
          .single()
        if (error) throw error
        
        toast.success('League created successfully!')
      }

      // Reset form
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
      setShowLeagueModal(false)
      setEditingLeagueId(null)
      
      // Refresh data
      await fetchLeagues()
    } catch (error: any) {
      console.error('Error saving league:', error)
      setFormError(error.message || 'Failed to save league. Please try again.')
    }
  }

  // Fetch games for a specific league
  const fetchLeagueGames = async (leagueId: string) => {
    setLoadingGames(true)
    try {
      // First get the game IDs from the junction table
      const { data: leagueGamesData, error: leagueGamesError } = await supabase
        .from('league_games')
        .select('game_id')
        .eq('league_id', leagueId)

      if (leagueGamesError) throw leagueGamesError

      if (!leagueGamesData || leagueGamesData.length === 0) {
        setLeagueGames([])
        setAvailableDivisions(["All"])
        setSelectedDivisionTab("All")
        return
      }

      // Then fetch the actual game details
      const gameIds = leagueGamesData.map(item => item.game_id)
      
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*, home_team:home_team_id(id, name), away_team:away_team_id(id, name)')
        .in('id', gameIds)
        .order('game_date', { ascending: true })

      if (gamesError) throw gamesError

      // Get division information for these teams from team_league_memberships
      const teamIds = gamesData.reduce((acc, game) => {
        if (game.home_team_id) acc.add(game.home_team_id)
        if (game.away_team_id) acc.add(game.away_team_id)
        return acc
      }, new Set<string>())

      let teamDivisionsMap: Record<string, string | null> = {}
      if (teamIds.size > 0) {
        const { data: memberships, error: membershipError } = await supabase
          .from('team_league_memberships')
          // Select the team_id and then join with league_divisions to get the name
          .select('team_id, league_divisions(id, name)') 
          .eq('league_id', leagueId)
          .in('team_id', Array.from(teamIds))
          .not('division', 'is', null) // Only get memberships with a division

        if (membershipError) throw membershipError
        
        memberships?.forEach(mem => {
          // mem.league_divisions will be an object {id, name} if the join works, or null if no matching division found
          // If league_divisions is an array (e.g. one-to-many), take the first element.
          const divisionInfo = Array.isArray(mem.league_divisions) 
            ? mem.league_divisions[0] as { id: string; name: string } | null 
            : mem.league_divisions as { id: string; name: string } | null;
          teamDivisionsMap[mem.team_id] = divisionInfo ? divisionInfo.name : null;
        })
      }

      // Map the fetched data to match our Game interface
      const formattedGames: Game[] = (gamesData || []).map(game => {
        // Try to get division from home team, then away team
        const divisionName = teamDivisionsMap[game.home_team_id] || teamDivisionsMap[game.away_team_id] || null

        return {
          id: game.id,
          league_id: leagueId, // Add the league_id manually
          home_team: game.home_team_id,
          away_team: game.away_team_id,
          home_team_name: game.home_team?.name || 'Unknown Team',
          away_team_name: game.away_team?.name || 'Unknown Team',
          location: game.location,
          game_date: game.game_date,
          start_time: game.game_time,
          division: divisionName,
          status: game.status,
          score_home: game.score_home,
          score_away: game.score_away,
          created_at: game.created_at,
          updated_at: game.updated_at
        }
      })

      setLeagueGames(formattedGames)
      
      // Update division tabs
      const uniqueDivisions = Array.from(
        new Set(
          formattedGames
            .map(game => game.division)
            .filter(division => division !== null && division !== '')
        )
      ) as string[];
      
      const hasGamesWithoutDivision = formattedGames.some(game => !game.division);
      
      const divisionOptions = [];
      if (hasGamesWithoutDivision) divisionOptions.push("No Division");
      divisionOptions.push(...uniqueDivisions);
      
      setAvailableDivisions(divisionOptions);
      // Select first division in the list or "No Division" if that's the only option
      setSelectedDivisionTab(divisionOptions.length > 0 ? divisionOptions[0] : null);
      
    } catch (error: any) {
      console.error('Error fetching league games:', error)
      toast.error('Failed to load games')
    } finally {
      setLoadingGames(false)
    }
  }

  // Handle opening the create game modal
  const handleCreateGameClick = () => {
    if (!selectedLeagueForGames) {
      toast.error('Please select a league first')
      return
    }

    setEditingGameId(null)
    setNewGame({
      league_id: selectedLeagueForGames.id,
      home_team: '',
      away_team: '',
      home_team_name: '',
      away_team_name: '',
      location: '',
      game_date: '',
      start_time: '',
      division: '',
      status: 'scheduled',
      score_home: null,
      score_away: null
    })
    
    // Reset team search state
    setTeamSearchQuery({ home: '', away: '' })
    setSelectedTeams({ home: null, away: null })
    setShowTeamResults({ home: false, away: false })
    
    // Reset division search state
    setDivisionSearchQuery('')
    setSelectedDivision(null)
    setShowDivisionResults(false)
    
    setGameFormError(null)
    setShowGameModal(true)
  }

  // Handle editing a game
  const handleEditGame = async (game: Game) => {
    setEditingGameId(game.id)
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
    
    // When editing, we need to fetch team details to display the names
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
          setSelectedDivision(divisionData)
        }
      }
    } catch (error: any) {
      console.error('Error fetching details:', error)
      // If we fail to get team details, we still want to show the game form
      // We'll just use the IDs as the search query
      setTeamSearchQuery({ 
        home: game.home_team, 
        away: game.away_team 
      })
      
      // Also set the division search query if available
      if (game.division) {
        setDivisionSearchQuery(game.division)
      }
    }
    
    setShowTeamResults({ home: false, away: false })
    setShowDivisionResults(false)
    setGameFormError(null)
    setShowGameModal(true)
  }

  // Handle closing the game modal
  const handleCloseGameModal = () => {
    setShowGameModal(false)
    setEditingGameId(null)
    setGameFormError(null)
  }

  // Handle saving a game
  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault()
    setGameFormError(null)
    
    try {
      // Validate required fields
      if (!teamSearchQuery.home.trim() || !teamSearchQuery.away.trim()) {
        throw new Error('Home team and away team are required')
      }

      if (!selectedLeagueForGames) {
        throw new Error('No league selected')
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

      let gameId = editingGameId

      if (editingGameId) {
        // Update existing game
        const { error } = await supabase
          .from('games')
          .update(gameData)
          .eq('id', editingGameId)

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
          gameId = data[0].id
          
          // Create the league_games relation
          const { error: leagueGameError } = await supabase
            .from('league_games')
            .insert([{
              league_id: selectedLeagueForGames.id,
              game_id: gameId
            }])
            
          if (leagueGameError) throw leagueGameError

          // Automatically add teams to this league if they're not already members
          await ensureTeamsInLeague(homeTeamId, awayTeamId, selectedLeagueForGames.id, division)
        }
        
        toast.success('Game added successfully!')
      }

      // Reset team search state
      setTeamSearchQuery({ home: '', away: '' })
      setSelectedTeams({ home: null, away: null })
      setDivisionSearchQuery('')
      setSelectedDivision(null)
      
      // Close modal and refresh games
      setShowGameModal(false)
      fetchLeagueGames(selectedLeagueForGames.id)
    } catch (error: any) {
      console.error('Error saving game:', error)
      setGameFormError(error.message || 'Failed to save game')
    }
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
    
    // Fetch divisions for game form dropdown
    await fetchLeagueDivisions(league.id)
    
    // The division tab logic has been moved to fetchLeagueGames
  }

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
    
    const newTeamData = {
      name: teamName.trim(),
      // Use league info if available
      season: selectedLeagueForGames?.season || otherTeam?.season || null,
      age_group: selectedLeagueForGames?.age_group || otherTeam?.age_group || null,
      gender: selectedLeagueForGames?.gender || otherTeam?.gender || null,
      // Additional fields can be added here
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

  // Handle searching for divisions
  const searchDivisions = async (query: string) => {
    if (!selectedLeagueForGames || query.trim().length < 2) {
      setDivisionSearchResults([])
      return
    }

    setIsSearchingDivision(true)
    try {
      const { data, error } = await supabase
        .from('league_divisions')
        .select('*')
        .eq('league_id', selectedLeagueForGames.id)
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
    setSelectedDivision(division)
    setDivisionSearchQuery(division.name)
    setShowDivisionResults(false)
    
    // Update the new game state
    setNewGame(prev => ({
      ...prev,
      division: division.name
    }))
  }

  // Handle creating a new division if it doesn't exist
  const createDivisionIfNeeded = async (divisionName: string): Promise<string | null> => {
    if (!divisionName.trim() || !selectedLeagueForGames) {
      return null
    }

    // Check if there's already a selected division
    if (selectedDivision?.name === divisionName.trim()) {
      return selectedDivision.name
    }

    // Try to find an existing division with this exact name
    const { data: existingDivisions, error: searchError } = await supabase
      .from('league_divisions')
      .select('id, name')
      .eq('league_id', selectedLeagueForGames.id)
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
        league_id: selectedLeagueForGames.id,
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

  // Helper function to determine if a game is home or away for the selected team
  const getTeamContext = (game: Game) => {
    if (!selectedTeamId) return null
    if (game.home_team === selectedTeamId) return 'Home'
    if (game.away_team === selectedTeamId) return 'Away'
    return null
  }

  // Create column helper for games table
  const gameColumnHelper = createColumnHelper<Game>()

  // Define columns for games table
  const gameColumns = [
    gameColumnHelper.accessor('home_team_name', {
      header: 'Home Team',
      cell: info => info.getValue(),
    }),
    gameColumnHelper.accessor('away_team_name', {
      header: 'Away Team',
      cell: info => info.getValue(),
    }),
    gameColumnHelper.accessor(row => {
      if (!selectedTeamId) return null;
      if (row.home_team === selectedTeamId) return 'Home';
      if (row.away_team === selectedTeamId) return 'Away';
      return null;
    }, {
      id: 'location',
      header: 'Location',
      cell: info => info.getValue() || '-',
    }),
    gameColumnHelper.accessor('game_date', {
      header: 'Date',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '-',
    }),
    gameColumnHelper.accessor('start_time', {
      header: 'Time',
      cell: info => info.getValue() ? new Date(`2000-01-01T${info.getValue()}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    }),
    gameColumnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <span className={`inline-block px-2 py-1 text-xs rounded ${
          info.getValue() === 'completed' ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' :
          info.getValue() === 'cancelled' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
          info.getValue() === 'postponed' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
          'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
        }`}>
          {info.getValue().charAt(0).toUpperCase() + info.getValue().slice(1)}
        </span>
      ),
    }),
    gameColumnHelper.display({
      id: 'score',
      header: 'Score',
      cell: info => {
        const game = info.row.original
        return game.score_home !== null && game.score_away !== null 
          ? `${game.score_home} - ${game.score_away}` 
          : '-'
      },
    }),
    gameColumnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditGame(props.row.original)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
            title="Edit Game"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDeleteGame(props.row.original.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
            title="Delete Game"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    }),
  ]

  // Create games table instance
  const gamesTable = useReactTable({
    data: leagueGames,
    columns: gameColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setGamesSorting,
    state: {
      sorting: gamesSorting,
    },
  })

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
      <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                          className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? 'cursor-pointer select-none'
                                  : '',
                                onClick: header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: ' 🔼',
                                desc: ' 🔽',
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'}`}>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
          )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
                className={`px-3 py-1 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                }`}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {'<<'}
          </button>
          <button
                className={`px-3 py-1 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                }`}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {'<'}
          </button>
          <button
                className={`px-3 py-1 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                }`}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {'>'}
          </button>
          <button
                className={`px-3 py-1 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                }`}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            {'>>'}
          </button>
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
        </span>
          </div>
        </div>

        {/* Games Management Section */}
        {selectedLeagueForGames && (
          <div className="mt-8 mb-12">
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{selectedLeagueForGames.name} Games</h3>
                <div className="flex gap-2 items-center">
                                      <button
                    onClick={() => {
                      if (!selectedLeagueForGames) {
                        toast.error('Please select a league first')
                        return
                      }
                  
                      setEditingGameId(null)
                      setNewGame({
                        league_id: selectedLeagueForGames.id,
                        home_team: '',
                        away_team: '',
                        home_team_name: '',
                        away_team_name: '',
                        location: '',
                        game_date: '',
                        start_time: '',
                        division: '',
                        status: 'scheduled',
                        score_home: null,
                        score_away: null
                      })
                      
                      // Reset team search state
                      setTeamSearchQuery({ home: '', away: '' })
                      setSelectedTeams({ home: null, away: null })
                      setShowTeamResults({ home: false, away: false })
                      
                      // Reset division search state
                      setDivisionSearchQuery('')
                      setSelectedDivision(null)
                      setShowDivisionResults(false)
                      
                      setGameFormError(null)
                      setShowGameModal(true)
                    }}
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
              ) : leagueGames.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                      {gamesTable.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th
                              key={header.id}
                              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              {header.isPlaceholder ? null : (
                                <div
                                  {...{
                                    className: header.column.getCanSort()
                                      ? 'cursor-pointer select-none'
                                      : '',
                                    onClick: header.column.getToggleSortingHandler(),
                                  }}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  {{
                                    asc: ' 🔼',
                                    desc: ' 🔽',
                                  }[header.column.getIsSorted() as string] ?? null}
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {gamesTable.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <td
                              key={cell.id}
                              className={`px-6 py-4 whitespace-nowrap text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500 dark:text-gray-400">No games have been added to this league yet.</p>
                  <button
                    onClick={handleCreateGameClick}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Add Game
                  </button>
                </div>
              )}

              {/* Games table pagination */}
              {leagueGames.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1 rounded ${
                        isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => gamesTable.setPageIndex(0)}
                      disabled={!gamesTable.getCanPreviousPage()}
                    >
                      {'<<'}
                    </button>
                    <button
                      className={`px-3 py-1 rounded ${
                        isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => gamesTable.previousPage()}
                      disabled={!gamesTable.getCanPreviousPage()}
                    >
                      {'<'}
                    </button>
                    <button
                      className={`px-3 py-1 rounded ${
                        isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => gamesTable.nextPage()}
                      disabled={!gamesTable.getCanNextPage()}
                    >
                      {'>'}
                    </button>
                    <button
                      className={`px-3 py-1 rounded ${
                        isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => gamesTable.setPageIndex(gamesTable.getPageCount() - 1)}
                      disabled={!gamesTable.getCanNextPage()}
                    >
                      {'>>'}
                    </button>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {gamesTable.getState().pagination.pageIndex + 1} of{' '}
                    {gamesTable.getPageCount()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* League Form Modal */}
        {showLeagueModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {editingLeagueId ? `Edit League: ${leagues.find(l => l.id === editingLeagueId)?.name || ''}` : 'Create New League'}
                </h3>
                <button
                  onClick={handleCloseLeagueModal}
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
                    value={newLeague.age_group}
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
                    value={newLeague.gender}
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
                    value={newLeague.start_date}
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
                    value={newLeague.end_date}
                    onChange={(e) => setNewLeague({ ...newLeague, end_date: e.target.value })}
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                
                {/* Divisions section - only shown for existing leagues */}
                {editingLeagueId && (
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
                          value={newDivision.description}
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
                    {editingLeagueId ? 'Update League' : 'Create League'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseLeagueModal}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Game Form Modal */}
        {showGameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {editingGameId ? 'Edit Game' : 'Add New Game'}
                </h3>
                <button
                  onClick={() => {
                    setShowGameModal(false)
                    setEditingGameId(null)
                    setGameFormError(null)
                    setTeamSearchQuery({ home: '', away: '' })
                    setSelectedTeams({ home: null, away: null })
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {gameFormError && (
                <div className={`mb-4 p-3 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
                  {gameFormError}
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                setGameFormError(null);
                
                try {
                  // Validate required fields
                  if (!teamSearchQuery.home.trim() || !teamSearchQuery.away.trim()) {
                    throw new Error('Home team and away team are required');
                  }

                  if (!selectedLeagueForGames) {
                    throw new Error('No league selected');
                  }

                  // Create or get team IDs
                  Promise.all([
                    createTeamIfNeeded(teamSearchQuery.home, 'home'),
                    createTeamIfNeeded(teamSearchQuery.away, 'away')
                  ]).then(async ([homeTeamId, awayTeamId]) => {
                    // Create or get division if entered
                    let division = null;
                    if (divisionSearchQuery.trim()) {
                      division = await createDivisionIfNeeded(divisionSearchQuery);
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
                    };

                    let gameId = editingGameId;

                    if (editingGameId) {
                      // Update existing game
                      const { error } = await supabase
                        .from('games')
                        .update(gameData)
                        .eq('id', editingGameId);

                      if (error) throw error;
                      toast.success('Game updated successfully!');
                    } else {
                      // Create new game
                      const { data, error } = await supabase
                        .from('games')
                        .insert([gameData])
                        .select();

                      if (error) throw error;
                      if (data && data.length > 0) {
                        gameId = data[0].id;
                        
                        // Create the league_games relation
                        const { error: leagueGameError } = await supabase
                          .from('league_games')
                          .insert([{
                            league_id: selectedLeagueForGames.id,
                            game_id: gameId
                          }]);
                          
                        if (leagueGameError) throw leagueGameError;

                        // Automatically add teams to this league if they're not already members
                        await ensureTeamsInLeague(homeTeamId, awayTeamId, selectedLeagueForGames.id, division);
                      }
                      
                      toast.success('Game added successfully!');
                    }

                    // Reset team search state
                    setTeamSearchQuery({ home: '', away: '' });
                    setSelectedTeams({ home: null, away: null });
                    setDivisionSearchQuery('');
                    setSelectedDivision(null);
                    
                    // Close modal and refresh games
                    setShowGameModal(false);
                    fetchLeagueGames(selectedLeagueForGames.id);
                  }).catch(error => {
                    console.error('Error saving game:', error);
                    setGameFormError(error.message || 'Failed to save game');
                  });
                } catch (error: any) {
                  console.error('Error saving game:', error);
                  setGameFormError(error.message || 'Failed to save game');
                }
              }} className="space-y-4">
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
                      if (selectedDivision && selectedDivision.name !== query) {
                        setSelectedDivision(null)
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
                  {selectedDivision && (
                    <div className="mt-1 text-xs text-blue-500 dark:text-blue-400">
                      Selected existing division: {selectedDivision.name}
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
                    {editingGameId ? 'Update Game' : 'Add Game'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGameModal(false)
                      setEditingGameId(null)
                      setGameFormError(null)
                      setTeamSearchQuery({ home: '', away: '' })
                      setSelectedTeams({ home: null, away: null })
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default withAdminAuth(LeaguesPage, 'League Management')