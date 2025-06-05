import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole } from '@/lib/types/auth';
import { RosterEntry, Player } from '@/lib/types/players';

// Define the response for listing roster entries, potentially with joined player data
interface ListRosterEntriesResponse {
  rosterEntries?: (RosterEntry & { player?: Player })[]; // Embed player details
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<ListRosterEntriesResponse>) {
  if (req.method === 'GET') {
    const { gameId, teamId } = req.query;

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ message: 'gameId query parameter is required' });
    }

    try {
      // Fetch roster entries and join with players table to get player names/details
      const supabase = await getSupabaseClient()
      let query = supabase
        .from('roster_entries')
        .select(`
          id,
          player_id,
          game_id,
          team_id,
          is_starter,
          is_attending,
          notes,
          created_at,
          updated_at,
          players (
            id,
            name,
            user_id,
            position,
            jersey_number,
            created_at,
            updated_at
          )
        `)
        .eq('game_id', gameId);

      // If teamId is provided, filter by team
      if (teamId && typeof teamId === 'string') {
        query = query.eq('team_id', teamId);
      }

      const { data: rosterEntries, error } = await query;

      if (error) {
        console.error('Error fetching roster entries:', error);
        return res.status(500).json({ message: 'Failed to fetch roster entries' });
      }

      // Transform the data to match our types
      const typedRosterEntries = rosterEntries?.map(entry => ({
        ...entry,
        player: entry.players?.[0] // Take the first player since it's a one-to-one relationship
      }));

      return res.status(200).json({ rosterEntries: typedRosterEntries });
    } catch (error) {
      console.error('Error in roster list handler:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withAuth(handler);