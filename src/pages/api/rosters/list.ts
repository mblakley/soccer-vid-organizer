import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole, RosterEntry, Player } from '@/lib/types';

// Define the response for listing roster entries, potentially with joined player data
interface ListRosterEntriesResponse {
  rosterEntries?: (RosterEntry & { player?: Player })[]; // Embed player details
  message?: string;
}

const supabase = getSupabaseClient();

async function handler(req: NextApiRequest, res: NextApiResponse<ListRosterEntriesResponse>) {
  if (req.method === 'GET') {
    const { gameId, teamId } = req.query;

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ message: 'gameId query parameter is required' });
    }

    // Optionally filter by teamId if provided and relevant for your RLS or query logic
    // const currentTeamId = typeof teamId === 'string' ? teamId : undefined;

    try {
      // Fetch roster entries and join with players table to get player names/details
      // Adjust the select query based on what player details you need
      let query = supabase
        .from('roster_entries')
        .select(`
          *,
          players (id, name, position, jersey_number) 
        `)
        .eq('game_id', gameId);

      // if (currentTeamId) {
      //   query = query.eq('team_id', currentTeamId); // If filtering by team_id is needed
      // }
        
      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching roster entries for game ${gameId}:`, error);
        return res.status(500).json({ message: error.message || 'Failed to fetch roster entries' });
      }

      const responseData = (data || []).map(entry => ({
        ...entry,
        player: entry.players, // Remap supabase join from 'players' to 'player'
        players: undefined, // Remove the original 'players' join object
      }));      

      return res.status(200).json({ rosterEntries: responseData as (RosterEntry & { player?: Player })[] });
    } catch (err: any) {
      console.error(`Exception fetching roster for game ${gameId}:`, err);
      return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Adjust auth requirements. Access to rosters might be restricted.
export default withAuth(handler, {
  teamId: 'any', // Or pass teamId from component and use it in query + auth
  roles: ['coach', 'manager'] as TeamRole[], // Example: Coaches/managers can see rosters
  requireRole: true,
}); 