import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole, Game } from '@/lib/types'; // Game type should be comprehensive

interface LeagueGamesResponse {
  games?: Game[];
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<LeagueGamesResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { leagueId } = req.query;

  if (typeof leagueId !== 'string') {
    return res.status(400).json({ message: 'leagueId path parameter is required.' });
  }

  const supabase = getSupabaseClient(req.headers.authorization); // User-context client

  try {
    // 1. Get game_ids from the league_games junction table for the given leagueId
    const { data: leagueGamesData, error: leagueGamesError } = await supabase
      .from('league_games')
      .select('game_id')
      .eq('league_id', leagueId);

    if (leagueGamesError) {
      console.error(`Error fetching game IDs for league ${leagueId}:`, leagueGamesError);
      return res.status(500).json({ message: leagueGamesError.message || 'Failed to fetch game IDs for league' });
    }

    if (!leagueGamesData || leagueGamesData.length === 0) {
      return res.status(200).json({ games: [] }); // No games associated with this league
    }

    const gameIds = leagueGamesData.map(lg => lg.game_id);

    // 2. Fetch actual game details for these game_ids
    // Joining with home_team and away_team tables (assuming they are named 'teams')
    // Adjust the select statement and table names as per your schema.
    const { data: gamesData, error: gamesError } = await supabase
      .from('games')
      .select(`
        *,
        home_team:home_team_id(id, name, short_name),
        away_team:away_team_id(id, name, short_name)
      `)
      .in('id', gameIds)
      .order('game_date', { ascending: true });

    if (gamesError) {
      console.error(`Error fetching game details for league ${leagueId}:`, gamesError);
      return res.status(500).json({ message: gamesError.message || 'Failed to fetch game details' });
    }
    
    // Map to the Game type, ensuring team names are correctly assigned
    const formattedGames: Game[] = (gamesData || []).map((game: any) => ({
      ...game,
      home_team_name: game.home_team?.name || game.home_team_id || 'N/A',
      away_team_name: game.away_team?.name || game.away_team_id || 'N/A',
      // Ensure other fields match the Game type in src/lib/types.ts
    }));

    return res.status(200).json({ games: formattedGames });

  } catch (err: any) {
    console.error(`Exception fetching games for league ${leagueId}:`, err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

export default withAuth(handler, {
  teamId: 'any', // Access to league games might depend on user's team membership to the league
  roles: ['coach', 'player', 'parent', 'manager'] as TeamRole[],
  requireRole: true, // Or false if league games are public
}); 