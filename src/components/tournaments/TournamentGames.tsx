'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'react-toastify'
import { Plus } from 'lucide-react'
import GameTable from '@/components/games/GameTable'
import GameForm from '@/components/games/GameForm'

interface Game {
  id: string
  tournament_id: string
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

interface Team {
  id: string
  name: string
}

interface TournamentGamesProps {
  tournamentId: string
  isDarkMode: boolean
  selectedFlight: string | null
  editingGame?: any | null
  onEdit?: (game: any) => void
  onDelete?: (id: string) => void
  onClose?: () => void
  onSave?: () => void
}

export default function TournamentGames({
  tournamentId,
  isDarkMode,
  selectedFlight,
  editingGame,
  onEdit,
  onDelete,
  onClose,
  onSave
}: TournamentGamesProps) {
  const [games, setGames] = useState<Game[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGames()
  }, [tournamentId, selectedFlight])

  const fetchGames = async () => {
    setLoading(true)
    try {
      console.log("Fetching games for tournament:", tournamentId);
      console.log("Selected flight:", selectedFlight);

      // First get all games linked to this tournament
      const { data: tournamentGamesData, error: tournamentGamesError } = await supabase
        .from('tournament_games')
        .select('game_id')
        .eq('tournament_id', tournamentId)

      if (tournamentGamesError) {
        console.error("Error fetching tournament games:", tournamentGamesError);
        throw tournamentGamesError;
      }

      console.log("Tournament games data:", tournamentGamesData);

      if (!tournamentGamesData || tournamentGamesData.length === 0) {
        console.log("No games found for this tournament");
        setGames([])
        setLoading(false)
        return
      }

      // Get flight information separately to handle missing column
      let flightMap: Record<string, string | null> = {};
      
      try {
        const { data: flightData, error: flightError } = await supabase
          .from('tournament_games')
          .select('game_id, flight')
          .eq('tournament_id', tournamentId)
        
        if (flightError) {
          console.error("Error fetching flight data:", flightError);
          // Continue without flight data
        } else if (flightData) {
          flightMap = flightData.reduce((map, item) => {
            map[item.game_id] = item.flight || null;
            return map;
          }, {} as Record<string, string | null>);
          console.log("Flight map:", flightMap);
        }
      } catch (error) {
        console.error("Error processing flight data:", error);
        // Continue without flight data
      }

      // Then fetch the actual game details
      const gameIds = tournamentGamesData.map(item => item.game_id)
      console.log("Game IDs:", gameIds);
      
      // Create query
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

      // Filter by flight if needed
      let filteredGames = gamesData || [];
      if (selectedFlight) {
        filteredGames = filteredGames.filter(game => 
          flightMap[game.id] === selectedFlight
        );
        console.log("Filtered games by flight:", filteredGames);
      }

      // Map the fetched data to match our Game interface
      const formattedGames: Game[] = filteredGames.map(game => ({
        id: game.id,
        tournament_id: tournamentId,
        home_team: game.home_team_id,
        away_team: game.away_team_id,
        home_team_name: game.home_team?.name || 'Unknown Team',
        away_team_name: game.away_team?.name || 'Unknown Team',
        location: game.location,
        game_date: game.game_date,
        start_time: game.game_time,
        flight: flightMap[game.id] || null,
        status: game.status,
        score_home: game.score_home,
        score_away: game.score_away,
        created_at: game.created_at,
        updated_at: game.updated_at
      }))

      console.log("Formatted games:", formattedGames);
      setGames(formattedGames)
    } catch (error: any) {
      console.error('Error fetching games:', error)
      toast.error('Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')

      if (teamsError) throw teamsError
      setTeams(teamsData || [])
    } catch (error: any) {
      console.error('Error fetching teams:', error)
      toast.error('Failed to load teams')
    }
  }

  // If editingGame is provided, show the form modal
  if (editingGame !== undefined) {
    return (
      <GameForm
        game={editingGame}
        isDarkMode={isDarkMode}
        selectedFlight={selectedFlight}
        onClose={onClose!}
        onSave={onSave!}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <GameTable
      games={games}
      isDarkMode={isDarkMode}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  )
} 