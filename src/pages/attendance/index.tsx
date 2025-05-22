import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      </div>
    </div>
  );
} 