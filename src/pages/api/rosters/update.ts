import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole } from '@/lib/types/auth';
import { RosterEntry } from '@/lib/types/players';

interface UpdateRosterEntryRequest extends RosterEntry { 
  // ensure all fields that can be sent from client are here
  // game_id might be in the body or could be a query param depending on API design
}

interface UpdateRosterResponse {
  rosterEntry?: RosterEntry;
  message?: string;
}

const supabase = await getSupabaseClient();

async function handler(req: NextApiRequest, res: NextApiResponse<UpdateRosterResponse>) {
  if (req.method === 'POST' || req.method === 'PUT') { // Allow PUT for update, POST for create
    const { id, player_id, game_id, ...updates } = req.body as UpdateRosterEntryRequest;

    if (!player_id || !game_id) {
      return res.status(400).json({ message: 'player_id and game_id are required' });
    }

    try {
      let data: RosterEntry | null = null;
      let error: any = null;

      if (id) { // If ID is provided, it's an update
        const { data: updateData, error: updateError } = await supabase
          .from('roster_entries')
          .update(updates)
          .eq('id', id)
          .select()
          .single(); // Return the updated record
        data = updateData;
        error = updateError;
      } else { // Otherwise, it's an insert
        // Check if an entry for this player and game already exists to prevent duplicates if needed
        // This logic depends on your application's rules (e.g., can a player be in a roster twice?)
        // For simplicity, assuming direct insert or that player_id+game_id is unique in DB
        const { data: insertData, error: insertError } = await supabase
          .from('roster_entries')
          .insert([{ player_id, game_id, ...updates }])
          .select()
          .single(); // Return the inserted record
        data = insertData;
        error = insertError;
      }

      if (error) {
        console.error('Error saving roster entry:', error);
        return res.status(500).json({ message: error.message || 'Failed to save roster entry' });
      }

      if (!data) {
        // This case might happen if .single() doesn't find a record after update/insert (should not happen with .select())
        return res.status(404).json({ message: 'Roster entry not found after operation.' });
      }

      return res.status(id ? 200 : 201).json({ rosterEntry: data });
    } catch (err: any) {
      console.error('Exception saving roster entry:', err);
      return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Adjust auth requirements. Modifying rosters is typically restricted.
export default withAuth(handler, {
  teamId: 'any', // Or use teamId from request body/query to check specific team role
  roles: ['coach', 'manager'] as TeamRole[], // Example: Only coaches/managers can modify rosters
  requireRole: true,
}); 