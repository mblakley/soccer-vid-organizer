import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeam } from '@/contexts/TeamContext';
import { useTheme } from '@/contexts/ThemeContext';
import GameTable from '@/components/leagues/GameTable';
import { withAuth } from '@/components/auth';

interface League {
  id: string;
  name: string;
  description: string;
  created_at: string;
  season: string;
  age_group: string | null;
  gender: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface Game {
  id: string;
  league_id: string;
  home_team: string;
  away_team: string;
  home_team_name: string;
  away_team_name: string;
  location: string | null;
  game_date: string | null;
  start_time: string | null;
  division: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed';
  score_home: number | null;
  score_away: number | null;
  created_at: string | null;
  updated_at: string | null;
}

function LeaguesPage({ user }: { user: any }) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueGames, setLeagueGames] = useState<Record<string, Game[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingGames, setLoadingGames] = useState<Record<string, boolean>>({});
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const router = useRouter();
  const { selectedTeamId, userTeams } = useTeam();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    fetchLeagues();
  }, [selectedTeamId]);

  // Get unique years from leagues
  const availableYears = useMemo(() => {
    const years = new Set(leagues.map(league => league.season));
    return Array.from(years).sort((a, b) => b.localeCompare(a)); // Sort descending
  }, [leagues]);

  // Filter leagues based on selected filters
  const filteredLeagues = useMemo(() => {
    return leagues.filter(league => {
      const matchesLeague = !selectedLeague || league.id === selectedLeague;
      const matchesYear = !selectedYear || league.season === selectedYear;
      return matchesLeague && matchesYear;
    });
  }, [leagues, selectedLeague, selectedYear]);

  const fetchLeagues = async () => {
    try {
      let query = supabase
        .from('leagues')
        .select('*')
        .order('name');

      // If a specific team is selected, only show leagues that team is in
      if (selectedTeamId) {
        // First get the league IDs for this team
        const { data: teamLeagues, error: teamLeaguesError } = await supabase
          .from('team_league_memberships')
          .select('league_id')
          .eq('team_id', selectedTeamId);

        if (teamLeaguesError) throw teamLeaguesError;

        if (teamLeagues && teamLeagues.length > 0) {
          const leagueIds = teamLeagues.map(tl => tl.league_id);
          query = query.in('id', leagueIds);
        } else {
          // If no leagues found, return empty array
          setLeagues([]);
          return;
        }
      } 
      // If no team is selected (All Teams), show leagues that any of the user's teams are in
      else if (userTeams.length > 0) {
        const teamIds = userTeams.map(team => team.id);
        
        // First get all league IDs for these teams
        const { data: teamLeagues, error: teamLeaguesError } = await supabase
          .from('team_league_memberships')
          .select('league_id')
          .in('team_id', teamIds);

        if (teamLeaguesError) throw teamLeaguesError;

        if (teamLeagues && teamLeagues.length > 0) {
          const leagueIds = teamLeagues.map(tl => tl.league_id);
          query = query.in('id', leagueIds);
        } else {
          // If no leagues found, return empty array
          setLeagues([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeagues(data || []);

      // Fetch games for each league
      if (data) {
        data.forEach(league => fetchLeagueGames(league.id));
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagueGames = async (leagueId: string) => {
    setLoadingGames(prev => ({ ...prev, [leagueId]: true }));
    try {
      // Get game IDs from league_games junction table
      const { data: leagueGamesData, error: leagueGamesError } = await supabase
        .from('league_games')
        .select('game_id')
        .eq('league_id', leagueId);

      if (leagueGamesError) throw leagueGamesError;

      if (!leagueGamesData || leagueGamesData.length === 0) {
        setLeagueGames(prev => ({ ...prev, [leagueId]: [] }));
        return;
      }

      // Fetch actual game details
      const gameIds = leagueGamesData.map(item => item.game_id);
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*, home_team:home_team_id(id, name), away_team:away_team_id(id, name)')
        .in('id', gameIds)
        .order('game_date', { ascending: true });

      if (gamesError) throw gamesError;

      // Format games to match our interface
      const formattedGames: Game[] = (gamesData || []).map(game => ({
        id: game.id,
        league_id: leagueId,
        home_team: game.home_team_id,
        away_team: game.away_team_id,
        home_team_name: game.home_team?.name || 'Unknown Team',
        away_team_name: game.away_team?.name || 'Unknown Team',
        location: game.location,
        game_date: game.game_date,
        start_time: game.game_time,
        division: null, // We'll add division info if needed
        status: game.status,
        score_home: game.score_home,
        score_away: game.score_away,
        created_at: game.created_at,
        updated_at: game.updated_at
      }));

      setLeagueGames(prev => ({ ...prev, [leagueId]: formattedGames }));
    } catch (error) {
      console.error('Error fetching league games:', error);
    } finally {
      setLoadingGames(prev => ({ ...prev, [leagueId]: false }));
    }
  };

  const handleEditGame = (game: Game) => {
    router.push(`/leagues/${game.league_id}/games/${game.id}/edit`);
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh the games for the league
      const game = Object.values(leagueGames)
        .flat()
        .find(g => g.id === id);
      if (game) {
        fetchLeagueGames(game.league_id);
      }
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  };

  if (loading) return <p className="p-8">Loading content...</p>

  return (
    <div className="p-8 space-y-8">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="league-filter" className="block text-sm font-medium mb-1">
            League
          </label>
          <select
            id="league-filter"
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All Leagues</option>
            {leagues.map(league => (
              <option key={league.id} value={league.id}>
                {league.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="year-filter" className="block text-sm font-medium mb-1">
            Year
          </label>
          <select
            id="year-filter"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredLeagues.length === 0 ? (
        <p className="py-4">No leagues available.</p>
      ) : (
        <div className="space-y-8">
          {filteredLeagues.map((league) => (
            <Card key={league.id} className={`hover:shadow-lg transition-shadow ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <CardHeader>
                <CardTitle>{league.name}</CardTitle>
                <div className="text-sm text-gray-500">
                  {league.season} {league.age_group && `• ${league.age_group}`} {league.gender && `• ${league.gender}`}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600">{league.description}</p>
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">Games</h3>
                    {loadingGames[league.id] ? (
                      <div>Loading games...</div>
                    ) : (
                      <GameTable
                        games={leagueGames[league.id] || []}
                        isDarkMode={isDarkMode}
                        selectedTeamId={selectedTeamId}
                        onEdit={handleEditGame}
                        onDelete={handleDeleteGame}
                        viewOnly={true}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default withAuth(
  LeaguesPage,
  {
    teamId: 'any',
    roles: ['coach', 'player', 'parent'],
    requireRole: true
  },
  'Leagues'
); 