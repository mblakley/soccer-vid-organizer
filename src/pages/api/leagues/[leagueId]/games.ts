import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withApiAuth } from '@/lib/auth';
import { TeamRole } from '@/lib/types/auth';
import { Game } from '@/lib/types/games';

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

  if (!leagueId || typeof leagueId !== 'string') {
    return res.status(400).json({ message: 'League ID is required' });
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);
    const { data, error } = await supabase
      .from('league_games')
      .select('*')
      .eq('league_id', leagueId)
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('Error fetching league games:', error);
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ games: data || [] });
  } catch (err: any) {
    console.error('Exception fetching league games:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

export default withApiAuth(handler, {
  allowUnauthenticated: false
}); 