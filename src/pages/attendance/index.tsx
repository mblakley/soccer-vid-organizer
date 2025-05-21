import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface AttendanceStats {
  player_id: string;
  player_name: string;
  total_games: number;
  games_attended: number;
  attendance_rate: number;
}

interface GameAttendance {
  id: string;
  game_date: string;
  home_team: string;
  away_team: string;
  type: 'league' | 'tournament';
  attendance_count: number;
  total_players: number;
}

export default function AttendancePage() {
  const [stats, setStats] = useState<AttendanceStats[]>([]);
  const [recentGames, setRecentGames] = useState<GameAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'season'>('month');
  const router = useRouter();

  useEffect(() => {
    fetchAttendanceStats();
    fetchRecentGames();
  }, [timeRange]);

  const fetchAttendanceStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_attendance_stats', { time_range: timeRange });

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    }
  };

  const fetchRecentGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id,
          game_date,
          home_team,
          away_team,
          type,
          roster_entries (
            is_attending
          )
        `)
        .order('game_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      const gamesWithAttendance = data?.map(game => ({
        id: game.id,
        game_date: game.game_date,
        home_team: game.home_team,
        away_team: game.away_team,
        type: game.type,
        attendance_count: game.roster_entries.filter((entry: any) => entry.is_attending).length,
        total_players: game.roster_entries.length
      })) || [];

      setRecentGames(gamesWithAttendance);
    } catch (error) {
      console.error('Error fetching recent games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Attendance Overview</h1>
        <Select
          value={timeRange}
          onValueChange={(value: 'week' | 'month' | 'season') => setTimeRange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="season">This Season</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Player Attendance Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.map((stat) => (
                <div key={stat.player_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{stat.player_name}</h3>
                    <p className="text-sm text-gray-500">
                      {stat.games_attended} of {stat.total_games} games
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {Math.round(stat.attendance_rate * 100)}%
                    </p>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${stat.attendance_rate * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentGames.map((game) => (
                <div key={game.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">
                        {game.home_team} vs {game.away_team}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(game.game_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-sm rounded-full bg-gray-100">
                      {game.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(game.attendance_count / game.total_players) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">
                      {game.attendance_count}/{game.total_players}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 