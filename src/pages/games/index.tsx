import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api/client';
import { Game } from '@/lib/types/games';
import { withAuth, User } from '@/components/auth';
import { useTheme } from '@/contexts/ThemeContext';
import { ListFilter, CalendarDays, Users, AlertTriangle, ExternalLink, Edit3Icon } from 'lucide-react';

interface GamesPageProps {
  user: User;
}

interface ListGamesApiResponse {
  games?: Game[];
  message?: string;
  // Add count/totalPages if your API provides them for pagination
}

export default function GamesPage({ user }: GamesPageProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameTypeFilter, setGameTypeFilter] = useState<'all' | 'league' | 'tournament' | string>('all');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isDarkMode } = useTheme();

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (gameTypeFilter !== 'all') {
        params.append('type', gameTypeFilter);
      }
      // Add other params like limit, offset, sortBy as needed
      params.append('sortBy', 'game_date');
      params.append('sortOrder', 'desc');

      const response = await apiClient.get<ListGamesApiResponse>(`/api/games/list?${params.toString()}`);
      
      if (response && response.games) {
        setGames(response.games);
      } else {
        setGames([]);
        if (response.message) setError(response.message);
      }
    } catch (err: any) {
      console.error('Error fetching games:', err);
      setError(err.message || 'Failed to fetch games.');
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [gameTypeFilter]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return 'Invalid Date'; }
  };

  return (
    <div className={`p-4 md:p-8 ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <h1 className="text-3xl font-bold mb-6 flex items-center"><CalendarDays size={32} className="mr-3"/>All Games</h1>

      {error && (
        <div className={`p-3 mb-4 border rounded ${isDarkMode ? 'bg-red-800 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'}`} role="alert">
          <h3 className="font-semibold flex items-center"><AlertTriangle size={18} className="mr-2"/>Error</h3>
          <p>{error}</p>
        </div>
      )}

      <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white shadow-sm'}`}>
        <label htmlFor="game-type-filter" className="block text-sm font-medium mb-1">Filter by Game Type:</label>
        <select
          id="game-type-filter"
          value={gameTypeFilter}
          onChange={(e) => setGameTypeFilter(e.target.value)}
          className={`w-full md:w-1/3 px-3 py-2 rounded-md border ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-blue-500 focus:border-blue-500`}
        >
          <option value="all">All Types</option>
          <option value="league">League</option>
          <option value="tournament">Tournament</option>
          {/* Add other types if applicable */}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading games...</p>
        </div>
      ) : games.length === 0 ? (
        <div className={`text-center py-10 px-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white shadow'}`}>
          <Users size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className="text-xl font-semibold mb-2">No Games Found</h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            No games match your current filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {games.map((game) => (
            <div key={game.id} className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'} transition-colors`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="mb-2 sm:mb-0">
                  <h2 className="text-xl font-semibold">
                    {game.home_team_name || 'TBD'} vs {game.away_team_name || 'TBD'}
                  </h2>
                  <p className={`text-xs uppercase font-semibold tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{game.type}</p>
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2 sm:mb-0`}>
                  {game.status && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${game.status === 'completed' ? (isDarkMode ? 'bg-green-700 text-green-200' : 'bg-green-200 text-green-800') : (isDarkMode ? 'bg-yellow-700 text-yellow-200' : 'bg-yellow-200 text-yellow-800')}`}>{game.status}</span>}
                </div>
              </div>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} flex items-center`}>
                <CalendarDays size={15} className="mr-2" /> {formatDate(game.game_date)} at {game.start_time || 'TBD'}
                {game.location && <span className="ml-2">| {game.location}</span>}
              </p>
              {game.status === 'completed' && game.score_home !== null && game.score_away !== null && (
                <p className={`mt-1 text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Final Score: {game.score_home} - {game.score_away}
                </p>
              )}
              {game.league_id && <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>League ID: {game.league_id}</p>}
              {game.tournament_id && <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tournament ID: {game.tournament_id}</p>}
              <div className="mt-3 flex space-x-2">
                <button 
                  onClick={() => router.push(`/games/${game.id}`)} 
                  className={`px-3 py-1 text-xs rounded-md font-medium flex items-center ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} transition-colors`}
                >
                  <ExternalLink size={14} className="mr-1.5" /> View Details
                </button>
                {/* Add Edit button if applicable/permissions allow */}
                {/* <button 
                  onClick={() => router.push(`/admin/games/${game.id}/edit`)} 
                  className={`px-3 py-1 text-xs rounded-md font-medium flex items-center ${isDarkMode ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-800' : 'bg-yellow-400 hover:bg-yellow-500 text-gray-800'} transition-colors`}
                >
                  <Edit3Icon size={14} className="mr-1.5" /> Edit
                </button> */}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* TODO: Add pagination controls if API supports count/totalPages */}
    </div>
  );
}

// Applying withAuth for consistency, adjust roles/requirements as needed
// export default withAuth(GamesPage, {
//   teamId: 'any',
//   roles: [] as TeamRole[], 
//   requireRole: false,
// }); 