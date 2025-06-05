import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withApiAuth } from '@/lib/auth';
import { TeamRole } from '@/lib/types/auth';
import { RosterEntry } from '@/lib/types/players';

interface UpdateRosterEntryRequest extends RosterEntry { 
  // ensure all fields that can be sent from client are here
  // game_id might be in the body or could be a query param depending on API design
}

interface UpdateRosterResponse {
  success?: boolean;
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<UpdateRosterResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { gameId, playerIds } = req.body;

  if (!gameId || typeof gameId !== 'string') {
    return res.status(400).json({ message: 'Game ID is required' });
  }

  if (!Array.isArray(playerIds)) {
    return res.status(400).json({ message: 'Player IDs must be an array' });
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);

    // First, delete existing roster entries for this game
    const { error: deleteError } = await supabase
      .from('game_rosters')
      .delete()
      .eq('game_id', gameId);

    if (deleteError) {
      console.error('Error deleting existing roster:', deleteError);
      return res.status(500).json({ message: deleteError.message });
    }

    // Then, insert new roster entries
    if (playerIds.length > 0) {
      const rosterEntries = playerIds.map(playerId => ({
        game_id: gameId,
        player_id: playerId
      }));

      const { error: insertError } = await supabase
        .from('game_rosters')
        .insert(rosterEntries);

      if (insertError) {
        console.error('Error inserting new roster:', insertError);
        return res.status(500).json({ message: insertError.message });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Exception updating roster:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth requirements. Modifying rosters is typically restricted.
export default withApiAuth(handler, {
  allowUnauthenticated: false
}); 