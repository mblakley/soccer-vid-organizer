import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { Game } from '@/lib/types/games';
import { TeamRole } from '@/lib/types/auth';

interface ListGamesResponse {
  games?: Game[];
  message?: string;
}

// No user context needed for just listing games if RLS is set for public or role-based read access.
// If created_by or team-specific filtering based on user is needed, use getSupabaseClient(req.headers.authorization).
const supabase = await getSupabaseClient(); 

async function handler(req: NextApiRequest, res: NextApiResponse<ListGamesResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { type, leagueId, tournamentId, teamId, limit, offset, sortBy, sortOrder } = req.query;

  try {
    let query = supabase.from('games').select('*');

    if (type && typeof type === 'string' && type !== 'all') {
      query = query.eq('type', type);
    }
    if (leagueId && typeof leagueId === 'string') {
      query = query.eq('league_id', leagueId);
    }
    if (tournamentId && typeof tournamentId === 'string') {
      query = query.eq('tournament_id', tournamentId);
    }
    // TODO: Add teamId filtering if your 'games' table has direct team_id (e.g. for non-league/tournament games)
    // or if it needs to be joined via team_games intermediary table.
    // Example for a direct foreign key:
    // if (teamId && typeof teamId === 'string') {
    //   query = query.eq('home_team_id', teamId).or(`away_team_id.eq.${teamId}`); // Or however team relationship is stored
    // }

    const sortColumn = typeof sortBy === 'string' ? sortBy : 'game_date';
    const ascending = typeof sortOrder === 'string' ? sortOrder === 'asc' : false; // Default to descending for dates
    query = query.order(sortColumn, { ascending });

    if (limit && !isNaN(parseInt(limit as string))) {
      query = query.limit(parseInt(limit as string));
    }
    if (offset && !isNaN(parseInt(offset as string))) {
      query = query.range(parseInt(offset as string), parseInt(offset as string) + (limit ? parseInt(limit as string) : 10) -1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching games:', error);
      return res.status(500).json({ message: error.message || 'Failed to fetch games' });
    }

    return res.status(200).json({ games: data as Game[] || [] });

  } catch (err: any) {
    console.error('Exception fetching games:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

export default withAuth(handler, {
  teamId: 'any', // Adjust if access needs to be team-specific or role-specific
  roles: [] as TeamRole[], // All authenticated users can list games, or define specific roles
  requireRole: false, // Or true if specific roles are required
}); 