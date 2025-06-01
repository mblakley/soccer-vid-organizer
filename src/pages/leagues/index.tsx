import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTeam } from '@/contexts/TeamContext';
import { useTheme } from '@/contexts/ThemeContext';
import { withAuth, User } from '@/components/auth';
import { apiClient } from '@/lib/api/client';
import { League, Game, TeamRole } from '@/lib/types';
import { List, CalendarDays, Users, Edit2, Trash2, ExternalLink, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

// API Response Interfaces
interface ListLeaguesApiResponse {
  leagues?: League[];
  message?: string;
}

interface LeagueGamesApiResponse {
  games?: Game[];
  message?: string;
}

interface DeleteGameApiResponse {
  message: string;
}

interface LeaguesPageProps {
  user: User; // from withAuth
}

function LeaguesPage({ user }: LeaguesPageProps) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueGames, setLeagueGames] = useState<Record<string, Game[]>>({});
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [loadingGames, setLoadingGames] = useState<Record<string, boolean>>({});
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [expandedLeagues, setExpandedLeagues] = useState<Record<string, boolean>>({});

  const router = useRouter();
  const { selectedTeamId, userTeams } = useTeam();
  const { isDarkMode } = useTheme();

  const fetchLeaguesCallback = useCallback(async () => {
    setLoadingLeagues(true);
    setPageError(null);
    let queryString = '';
    if (selectedTeamId) {
      queryString = `?teamId=${selectedTeamId}`;
    } else if (userTeams && userTeams.length > 0) {
      const userTeamIdsString = userTeams.map(t => t.id).join(',');
      if (userTeamIdsString) {
        queryString = `?userTeamIds=${userTeamIdsString}`;
      }
    }

    try {
      const data = await apiClient.get<ListLeaguesApiResponse>(`/api/leagues/list${queryString}`);
      if (data?.leagues) {
        setLeagues(data.leagues);
        if (data.leagues.length > 0 && !selectedLeagueId && !selectedSeason) {
          // Automatically expand the first league if no filters are set initially
          // and fetch its games
          toggleLeagueExpansion(data.leagues[0].id, true);
        }
      } else {
        setLeagues([]);
        if (data?.message) setPageError(data.message);
      }
    } catch (err: any) {
      console.error('Error fetching leagues:', err);
      setPageError(err.message || 'Failed to fetch leagues.');
      setLeagues([]);
    } finally {
      setLoadingLeagues(false);
    }
  }, [selectedTeamId, userTeams, selectedLeagueId, selectedSeason]);

  useEffect(() => {
    fetchLeaguesCallback();
  }, [fetchLeaguesCallback]);

  const availableSeasons = useMemo(() => {
    const seasons = new Set(leagues.map(league => league.season).filter(s => s));
    return Array.from(seasons).sort((a, b) => b.localeCompare(a));
  }, [leagues]);

  const filteredLeagues = useMemo(() => {
    return leagues.filter(league => {
      const matchesLeague = !selectedLeagueId || league.id === selectedLeagueId;
      const matchesSeason = !selectedSeason || league.season === selectedSeason;
      return matchesLeague && matchesSeason;
    });
  }, [leagues, selectedLeagueId, selectedSeason]);

  const fetchLeagueGames = useCallback(async (leagueId: string) => {
    setLoadingGames(prev => ({ ...prev, [leagueId]: true }));
    setPageError(null);
    try {
      const data = await apiClient.get<LeagueGamesApiResponse>(`/api/leagues/${leagueId}/games`);
      if (data?.games) {
        setLeagueGames(prev => ({ ...prev, [leagueId]: data.games || [] }));
      } else {
        if (data?.message) setPageError(data.message);
        setLeagueGames(prev => ({ ...prev, [leagueId]: [] }));
      }
    } catch (err: any) {
      console.error(`Error fetching games for league ${leagueId}:`, err);
      setPageError(err.message || `Failed to fetch games for league ${leagueId}.`);
    } finally {
      setLoadingGames(prev => ({ ...prev, [leagueId]: false }));
    }
  }, []);

  const toggleLeagueExpansion = useCallback((leagueId: string, forceExpand?: boolean) => {
    const isCurrentlyExpanded = !!expandedLeagues[leagueId];
    const expand = forceExpand !== undefined ? forceExpand : !isCurrentlyExpanded;

    setExpandedLeagues(prev => ({...prev, [leagueId]: expand }));
    if (expand && !leagueGames[leagueId]) {
        fetchLeagueGames(leagueId);
    }
  }, [expandedLeagues, leagueGames, fetchLeagueGames]);

  const handleEditGame = (game: Game) => {
    const leagueId = Object.keys(leagueGames).find(id => leagueGames[id]?.some(g => g.id === game.id));
    if (leagueId) {
      router.push(`/leagues/${leagueId}/games/${game.id}/edit`);
    } else {
      // Try to find from all leagues if not in currently loaded leagueGames (e.g. if not expanded yet)
      const parentLeague = leagues.find(l => l.id === game.league_id); // Assuming Game type has league_id
      if (parentLeague) {
         router.push(`/leagues/${parentLeague.id}/games/${game.id}/edit`);
      } else {
        setPageError('Could not determine league for the game to edit.');
      }
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    setPageError(null);
    try {
      await apiClient.delete<DeleteGameApiResponse>(`/api/games/${gameId}`);
      const leagueId = Object.keys(leagueGames).find(id => leagueGames[id]?.some(g => g.id === gameId));
      if (leagueId) {
        fetchLeagueGames(leagueId);
      }
    } catch (err: any) {
      console.error('Error deleting game:', err);
      setPageError(err.message || 'Failed to delete game.');
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return 'Invalid Date'; }
  };

  if (loadingLeagues) {
    return (
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading leagues...</p>
        </div>
    );
  }

  return (
    <div className={`p-4 md:p-8 space-y-6 ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center"><List size={32} className="mr-3"/>Leagues</h1>
        {/* TODO: Add New League button for admins/authorized roles */}
        {/* <button onClick={() => router.push('/admin/leagues/new')} className="btn btn-primary"><PlusCircle size={18} /> New League</button> */}
      </div>

      {pageError && (
        <div className={`p-3 mb-4 border rounded ${isDarkMode ? 'bg-red-800 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'}`} role="alert">
          <h3 className="font-semibold flex items-center"><AlertTriangle size={18} className="mr-2"/>Error</h3>
          <p>{pageError}</p>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-lg">
        <div>
          <label htmlFor="league-filter" className="block text-sm font-medium mb-1">Filter by League</label>
          <select
            id="league-filter"
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="">All Leagues</option>
            {leagues.map(league => (
              <option key={league.id} value={league.id}>{league.name} ({league.season})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="season-filter" className="block text-sm font-medium mb-1">Filter by Season</label>
          <select
            id="season-filter"
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="">All Seasons</option>
            {availableSeasons.map(season => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredLeagues.length === 0 && !loadingLeagues && (
        <div className={`text-center py-10 px-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white shadow'}`}>
            <Users size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <h3 className="text-xl font-semibold mb-2">No Leagues Found</h3>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                No leagues match your current filters, or you are not a member of any leagues yet.
            </p>
        </div>
      )}

      <div className="space-y-6">
        {filteredLeagues.map(league => (
          <div key={league.id} className={`rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
            <div 
                className={`p-4 flex justify-between items-center cursor-pointer ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}
                onClick={() => toggleLeagueExpansion(league.id)}
            >
              <div>
                <h2 className="text-xl font-semibold">{league.name} <span className={`text-sm font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>({league.season})</span></h2>
                {league.description && <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{league.description}</p>}
              </div>
              <div className="flex items-center">
                  {expandedLeagues[league.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            {expandedLeagues[league.id] && (
              <div className="border-t p-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}">
                {loadingGames[league.id] && <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading games...</p>}
                {!loadingGames[league.id] && (!leagueGames[league.id] || leagueGames[league.id]?.length === 0) && (
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No games scheduled for this league yet.</p>
                )}
                {leagueGames[league.id] && leagueGames[league.id]!.length > 0 && (
                  <ul className="space-y-3">
                    {leagueGames[league.id]!.map(game => (
                      <li key={game.id} className={`p-3 rounded-md ${isDarkMode ? 'bg-gray-650' : 'bg-gray-50'} flex justify-between items-start`}>
                        <div className="flex-grow">
                          <p className="font-semibold">
                            {game.home_team_name || 'TBD'} vs {game.away_team_name || 'TBD'}
                            {game.status === 'completed' && game.score_home !== null && game.score_away !== null && (
                                <span className={`ml-2 text-xs font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                    FT: {game.score_home} - {game.score_away}
                                </span>
                            )}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center mt-1`}>
                            <CalendarDays size={14} className="mr-1.5" /> {formatDate(game.game_date)} at {game.start_time || 'TBD'}
                            {game.location && <span className="ml-2"> | {game.location}</span>}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                            <button onClick={() => router.push(`/games/${game.id}`)} className={`p-1.5 rounded hover:bg-opacity-20 ${isDarkMode ? 'text-blue-300 hover:bg-blue-400' : 'text-blue-500 hover:bg-blue-600'}`} title="View Game Details">
                                <ExternalLink size={16}/>
                            </button>
                            {/* TODO: Add role-based check for edit/delete permissions, e.g., userIsLeagueAdmin(user, league.id) || userIsTeamCoachForGame(user, game) */}
                            <button onClick={() => handleEditGame(game)} className={`p-1.5 rounded hover:bg-opacity-20 ${isDarkMode ? 'text-yellow-300 hover:bg-yellow-400' : 'text-yellow-500 hover:bg-yellow-600'}`} title="Edit Game">
                                <Edit2 size={16}/>
                            </button>
                            <button onClick={() => handleDeleteGame(game.id)} className={`p-1.5 rounded hover:bg-opacity-20 ${isDarkMode ? 'text-red-400 hover:bg-red-500' : 'text-red-500 hover:bg-red-600'}`} title="Delete Game">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                 {/* TODO: Add New Game to League button (check permissions) */}
                 {/* <button onClick={() => router.push(`/admin/leagues/${league.id}/games/new`)} className="...">Add Game</button> */}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default withAuth(
  LeaguesPage,
  {
    teamId: 'any',
    roles: ['coach', 'player', 'parent', 'manager'] as TeamRole[], 
    requireRole: true,
  },
  'Leagues'
); 