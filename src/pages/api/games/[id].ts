import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole, Game } from '@/lib/types'; // Assuming Game type exists or will be added

interface GameDetailsResponse {
  game?: Game;
  message?: string;
}

const supabase = getSupabaseClient();

async function handler(req: NextApiRequest, res: NextApiResponse<GameDetailsResponse | { message: string }>) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'Game ID must be a string' });
  }

  // Get a non-user-specific client for delete if RLS prevents user from deleting
  // Or ensure your RLS allows users with appropriate roles to delete games.
  // For simplicity, using the default client which might be service role if no auth header.
  const clientForMutation = getSupabaseClient(); 

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*') // Adjust selection as needed
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // PostgREST error for " exactamente una fila" (exactly one row)
          return res.status(404).json({ message: `Game with ID ${id} not found` });
        }
        console.error('Error fetching game details:', error);
        return res.status(500).json({ message: error.message || 'Failed to fetch game details' });
      }

      if (!data) {
        return res.status(404).json({ message: `Game with ID ${id} not found` });
      }

      return res.status(200).json({ game: data as Game }); // Cast to Game type
    } catch (err: any) {
      console.error(`Exception fetching game details for ID ${id}:`, err);
      return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
    }
  } else if (req.method === 'DELETE') {
    // Ensure user is authenticated and has rights to delete, if not handled by withAuth fully
    // const userContextSupabase = getSupabaseClient(req.headers.authorization);
    // const { data: { user } } = await userContextSupabase.auth.getUser();
    // if (!user) return res.status(401).json({ message: 'Unauthorized' });
    // Add role check here if needed, e.g., only admin or coach of involved team can delete
    
    try {
      const { error: deleteError } = await clientForMutation // Use clientForMutation
        .from('games')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error(`Error deleting game ${id}:`, deleteError);
        // Handle specific errors, e.g., foreign key violation if game is part of a league_game record
        if (deleteError.code === '23503') { // Foreign key violation
            return res.status(409).json({ message: 'Cannot delete game: It is referenced by other records (e.g., league schedules, rosters).' });
        }
        return res.status(500).json({ message: deleteError.message || 'Failed to delete game' });
      }

      return res.status(200).json({ message: `Game with ID ${id} deleted successfully.` });
    } catch (err: any) {
      console.error(`Exception deleting game ${id}:`, err);
      return res.status(500).json({ message: err.message || 'An unexpected error occurred during deletion' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Adjust auth requirements. Deleting games is a privileged action.
export default withAuth(handler, {
  teamId: 'any', // Role check should be specific enough not to rely on just any team membership
  roles: ['admin', 'coach'] as TeamRole[], // Example: Only admins or coaches can delete games
  requireRole: true,
}); 