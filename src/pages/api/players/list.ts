import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole, Player } from '@/lib/types'; // Assuming Player type exists or will be added

interface ListPlayersResponse {
  players?: Player[];
  message?: string;
}

const supabase = getSupabaseClient();

async function handler(req: NextApiRequest, res: NextApiResponse<ListPlayersResponse>) {
  if (req.method === 'GET') {
    try {
      // TODO: Determine if players should be filtered by team or if all players are listed.
      // If team-specific, teamId would need to be passed and used in the query.
      // For now, fetching all players as per the original Supabase call in the component.
      const { data, error } = await supabase
        .from('players') // Assuming 'players' is the correct table name
        .select('*')     // Select all fields, adjust as necessary
        .order('name'); // Order by name as in the original component

      if (error) {
        console.error('Error fetching players:', error);
        return res.status(500).json({ message: error.message || 'Failed to fetch players' });
      }

      return res.status(200).json({ players: data as Player[] || [] });
    } catch (err: any) {
      console.error('Exception fetching players:', err);
      return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Adjust auth requirements. Listing players might be restricted.
export default withAuth(handler, {
  teamId: 'any', // Or specific team context if players are team-specific
  roles: ['coach', 'manager'] as TeamRole[], // Example: only coaches/managers can list all players
  requireRole: true, // Or false if accessible to any authenticated user
}); 