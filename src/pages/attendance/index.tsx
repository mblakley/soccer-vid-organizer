import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api/client';
import { withAuth, User } from '@/components/auth';
import { useTheme } from '@/contexts/ThemeContext';
import { BarChart3, CalendarCheck, Users, AlertTriangle, Percent, TrendingUp, TrendingDown, RefreshCw, Loader2 } from 'lucide-react';

// Mirroring local interfaces, but ideally these would come from @/lib/types if standardized
interface AttendanceStat {
  player_id: string;
  player_name: string;
  total_games: number;
  games_attended: number;
  attendance_rate: number;
}

interface GameAttendance {
  id: string;
  game_date: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  type: 'league' | 'tournament' | string | null;
  attendance_count: number;
  total_players: number;
}

interface RpcAttendanceStatsResponse {
  stats?: AttendanceStat[];
  message?: string;
}

interface RecentGamesAttendanceResponse {
  games?: GameAttendance[];
  message?: string;
}

interface AttendancePageProps {
  user: User;
}

export function AttendancePage({ user }: AttendancePageProps) {
  const [stats, setStats] = useState<AttendanceStat[]>([]);
  const [recentGames, setRecentGames] = useState<GameAttendance[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingGames, setLoadingGames] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'season'>('month');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isDarkMode } = useTheme();

  const fetchAttendanceStats = useCallback(async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const response = await apiClient.post<RpcAttendanceStatsResponse>('/api/rpc/get_attendance_stats', { time_range: timeRange });
      if (response?.stats) {
        setStats(response.stats);
      } else {
        setStats([]);
        setError(response?.message || 'Failed to fetch attendance stats.');
      }
    } catch (err: any) {
      console.error('Error fetching attendance stats:', err);
      setError(err.message || 'An unexpected error occurred while fetching stats.');
      setStats([]);
    } finally {
      setLoadingStats(false);
    }
  }, [timeRange]);

  const fetchRecentGamesWithAttendance = useCallback(async () => {
    setLoadingGames(true);
    // setError(null); // Keep existing errors unless specifically for this fetch
    try {
      const response = await apiClient.get<RecentGamesAttendanceResponse>('/api/games/recent_with_attendance?limit=5');
      if (response?.games) {
        setRecentGames(response.games);
      } else {
        setRecentGames([]);
        // setError(response?.message || 'Failed to fetch recent games attendance.');
      }
    } catch (err: any) {
      console.error('Error fetching recent games attendance:', err);
      // setError(err.message || 'An unexpected error occurred while fetching recent games.');
      setRecentGames([]);
    } finally {
      setLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendanceStats();
    fetchRecentGamesWithAttendance();
  }, [fetchAttendanceStats, fetchRecentGamesWithAttendance]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return 'Invalid Date'; }
  };

  const handleRefresh = () => {
    fetchAttendanceStats();
    fetchRecentGamesWithAttendance();
  }

  const isLoading = loadingStats || loadingGames;

  return (
    <div className={`p-4 md:p-8 space-y-8 ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center"><CalendarCheck size={32} className="mr-3"/>Attendance Tracking</h1>
        <button 
            onClick={handleRefresh} 
            disabled={isLoading}
            className={`p-2 rounded-md flex items-center gap-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors disabled:opacity-50`}
        >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} Refresh Data
        </button>
      </div>

      {error && (
        <div className={`p-3 my-4 border rounded text-center ${isDarkMode ? 'bg-red-800 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'}`} role="alert">
          <h3 className="font-semibold flex items-center justify-center"><AlertTriangle size={18} className="mr-2"/>Error Fetching Data</h3>
          <p>{error}</p>
        </div>
      )}
      
      {/* Player Attendance Stats Section */}
      <section className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold flex items-center"><BarChart3 size={28} className="mr-2" />Player Statistics</h2>
          <div className="mt-3 sm:mt-0">
            <label htmlFor="timeRangeStats" className="sr-only">Time Range</label>
            <select 
              id="timeRangeStats"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'season')}
              className={`px-3 py-1.5 rounded-md border ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} focus:ring-blue-500 focus:border-blue-500`}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="season">Current Season</option>
            </select>
          </div>
        </div>
        {loadingStats ? (
          <div className="text-center py-8"><Loader2 size={24} className="animate-spin mx-auto" /> <p className="mt-2 text-sm">Loading statistics...</p></div>
        ) : stats.length === 0 && !error ? (
          <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No attendance statistics available for the selected period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className={isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}>
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Player</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Games Attended</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Total Games</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'bg-gray-700 divide-gray-600' : 'bg-white divide-gray-200'}`}>
                {stats.map((stat) => (
                  <tr key={stat.player_id} className={isDarkMode ? 'hover:bg-gray-650' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{stat.player_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">{stat.games_attended}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">{stat.total_games}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${stat.attendance_rate >= 80 ? (isDarkMode?'text-green-400':'text-green-600') : stat.attendance_rate < 50 ? (isDarkMode?'text-red-400':'text-red-500') : (isDarkMode?'text-yellow-400':'text-yellow-500')}`}>
                      {stat.attendance_rate.toFixed(1)}%
                      {stat.attendance_rate >= 80 && <TrendingUp size={16} className="inline ml-1" />}
                      {stat.attendance_rate < 50 && <TrendingDown size={16} className="inline ml-1" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Games Attendance Section */}
      <section className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
        <h2 className="text-2xl font-semibold mb-4 flex items-center"><Users size={28} className="mr-2"/>Recent Game Attendance</h2>
        {loadingGames ? (
          <div className="text-center py-8"><Loader2 size={24} className="animate-spin mx-auto" /> <p className="mt-2 text-sm">Loading recent games...</p></div>
        ) : recentGames.length === 0 && !error ? (
          <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No recent game attendance data available.</p>
        ) : (
          <div className="space-y-4">
            {recentGames.map((game) => (
              <div key={game.id} className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-650' : 'bg-gray-100'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{game.home_team_name || 'TBD'} vs {game.away_team_name || 'TBD'}</h3>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(game.game_date)} - {game.type}</p>
                  </div>
                  <div className={`text-sm font-semibold mt-2 sm:mt-0 ${game.attendance_count / game.total_players >= 0.8 ? (isDarkMode?'text-green-400':'text-green-600') : (isDarkMode?'text-yellow-400':'text-yellow-500')}`}>
                    {game.attendance_count} / {game.total_players} Attended <Percent size={14} className="inline"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default withAuth(AttendancePage, {
  teamId: 'any', 
  roles: ['coach', 'manager'],
  requireRole: true,
}); 