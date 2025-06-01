import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { Game, RosterEntry, TeamRole } from '@/lib/types'; // Assuming Game and RosterEntry types

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

const supabase = getSupabaseClient();

async function handler(req: NextApiRequest, res: NextApiResponse<RecentGamesAttendanceResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const limit = parseInt(req.query.limit as string) || 5; // Default to 5 games

  try {
    // Fetch recent games and their roster entries
    // Adjust the select if your Game type has home_team_name and away_team_name directly
    // If not, you might need to join with teams table here or have them as part of the 'games' table
    const { data: gamesData, error } = await supabase
      .from('games')
      .select(`
        id,
        game_date,
        home_team_name, 
        away_team_name, 
        type,
        status,
        league_id,
        tournament_id,
        roster_entries (
          is_attending
        )
      `)
      .order('game_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent games with attendance:', error);
      return res.status(500).json({ message: error.message || 'Failed to fetch recent games' });
    }

    if (!gamesData) {
      return res.status(200).json({ games: [] });
    }

    const gamesWithAttendance: GameAttendance[] = gamesData.map((game: any) => ({
      id: game.id,
      game_date: game.game_date,
      // Assuming home_team_name and away_team_name are directly on the game object from the query
      // If they were IDs (home_team_id, away_team_id), you'd need to adjust or join further
      home_team_name: game.home_team_name || 'TBD',
      away_team_name: game.away_team_name || 'TBD',
      type: game.type,
      attendance_count: game.roster_entries.filter((entry: Partial<RosterEntry>) => entry.is_attending === true).length,
      total_players: game.roster_entries.length,
    }));

    return res.status(200).json({ games: gamesWithAttendance });

  } catch (err: any) {
    console.error('Exception fetching recent games with attendance:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth as needed. This data might be restricted.
export default withAuth(handler, {
  teamId: 'any',
  roles: ['coach', 'manager'] as TeamRole[], // Example: coaches/managers view
  requireRole: true,
}); 