import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api/client';
import { Game } from '@/lib/types/games';
import { withAuth } from '@/components/auth';
import type { User } from '@/components/auth';
import { useTheme } from '@/contexts/ThemeContext';
import { ListFilter, CalendarDays, Users, AlertTriangle, ExternalLink, Edit3Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { TeamRole } from '@/lib/types/auth';

interface GamesPageProps {
  user: User;
}

interface ListGamesApiResponse {
  games?: Game[];
  message?: string;
  // Add count/totalPages if your API provides them for pagination
}

function GamesPage({ user }: GamesPageProps) {
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
    <div className="min-h-screen">
      <div className="p-6">
        <div className="flex flex-col space-y-6">
          {/* Game Type Filter */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setGameTypeFilter('all')}
              className={cn(
                "px-4 py-2 rounded-md font-medium transition-colors",
                gameTypeFilter === 'all' 
                  ? (isDarkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white")
                  : (isDarkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
              )}
            >
              All Games
            </button>
            <button
              onClick={() => setGameTypeFilter('league')}
              className={cn(
                "px-4 py-2 rounded-md font-medium transition-colors",
                gameTypeFilter === 'league' 
                  ? (isDarkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white")
                  : (isDarkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
              )}
            >
              League Games
            </button>
            <button
              onClick={() => setGameTypeFilter('tournament')}
              className={cn(
                "px-4 py-2 rounded-md font-medium transition-colors",
                gameTypeFilter === 'tournament' 
                  ? (isDarkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white")
                  : (isDarkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
              )}
            >
              Tournament Games
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3">Loading games...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading games</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Game List */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <div
                  key={game.id}
                  className={cn(
                    "rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md",
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  )}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className={cn("font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
                          {game.home_team_name || 'TBD'} vs {game.away_team_name || 'TBD'}
                        </h3>
                        <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                          {game.type}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          href={`/games/${game.id}`}
                          className={cn(
                            "p-2 rounded-md transition-colors",
                            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                          )}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/games/${game.id}/edit`}
                          className={cn(
                            "p-2 rounded-md transition-colors",
                            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                          )}
                        >
                          <Edit3Icon className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        <span>{formatDate(game.game_date)}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Users className="h-4 w-4 mr-2" />
                        <span>{game.attendance_count || 0} players</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Applying withAuth for consistency, adjust roles/requirements as needed
export default withAuth(GamesPage, {
  teamId: 'any',
  roles: [] as TeamRole[], 
  requireRole: false,
}, 'All Games'); 