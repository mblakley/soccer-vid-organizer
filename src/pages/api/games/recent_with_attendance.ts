import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withApiAuth } from '@/lib/auth';
import { Game } from '@/lib/types/games';
import { RosterEntry } from '@/lib/types/players';
import { TeamRole } from '@/lib/types/auth';

// Define the structure for the response, matching GameAttendance from the page
interface GameAttendance {
  id: string;
  game_date: string | null;
  home_team_name: string | null; // Adjusted to match Game type (was home_team)
  away_team_name: string | null; // Adjusted to match Game type (was away_team)
  type: 'league' | 'tournament' | string | null; // Adjusted to match Game type
  attendance_count: number;
  total_players: number;
}

interface RecentGamesAttendanceResponse {
  games?: GameAttendance[];
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<RecentGamesAttendanceResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const limit = parseInt(req.query.limit as string) || 5; // Default to 5 games

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        attendance:game_attendance(count)
      `)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent games:', error);
      return res.status(500).json({ message: error.message });
    }

    if (!data) {
      return res.status(200).json({ games: [] });
    }

    const gamesWithAttendance: GameAttendance[] = data.map((game: any) => ({
      id: game.id,
      game_date: game.date,
      home_team_name: game.home_team_name || 'TBD',
      away_team_name: game.away_team_name || 'TBD',
      type: game.type,
      attendance_count: game.attendance.count,
      total_players: game.roster_entries.length,
    }));

    return res.status(200).json({ games: gamesWithAttendance });
  } catch (err: any) {
    console.error('Exception fetching recent games:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth as needed. This data might be restricted.
export default withApiAuth(handler, {
  allowUnauthenticated: false
}); 