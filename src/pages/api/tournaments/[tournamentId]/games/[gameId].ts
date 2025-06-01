import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole } from '@/lib/types';

interface RemoveGameFromTournamentResponse {
  message: string;
}

const supabase = getSupabaseClient();

async function handler(req: NextApiRequest, res: NextApiResponse<RemoveGameFromTournamentResponse | { message: string }>) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { tournamentId, gameId } = req.query;

  if (typeof tournamentId !== 'string' || typeof gameId !== 'string') {
    return res.status(400).json({ message: 'tournamentId and gameId path parameters are required.' });
  }

  try {
    const { error } = await supabase
      .from('tournament_games')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('game_id', gameId);

    if (error) {
      console.error(`Error removing game ${gameId} from tournament ${tournamentId}:`, error);
      // Check for specific errors, e.g., if the entry doesn't exist (PGRST204 for no rows found by delete)
      if (error.code === 'PGRST204') {
         return res.status(404).json({ message: `Game ${gameId} not found in tournament ${tournamentId}.` });
      }
      return res.status(500).json({ message: error.message || 'Failed to remove game from tournament' });
    }

    return res.status(200).json({ message: `Game ${gameId} removed from tournament ${tournamentId} successfully.` });

  } catch (err: any) {
    console.error(`Exception removing game ${gameId} from tournament ${tournamentId}:`, err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Admin-only endpoint for managing tournament game relationships
export default withAuth(handler, {
  teamId: 'any',
  roles: ['admin'] as TeamRole[],
  requireRole: true,
}); 