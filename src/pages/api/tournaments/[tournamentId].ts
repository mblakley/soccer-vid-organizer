import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiAuth } from '@/lib/auth';
import { TeamRole } from '@/lib/types/auth';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface DeleteTournamentResponse {
  message: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<DeleteTournamentResponse | { message: string }>) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { tournamentId } = req.query;

  if (typeof tournamentId !== 'string') {
    return res.status(400).json({ message: 'tournamentId path parameter is required and must be a string.' });
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if user is admin
    const { data: userData, error: userDataError } = await supabase
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (userDataError || !userData?.is_admin) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    // Check if tournament_games entries exist
    const { data: gameEntries, error: gameEntriesError } = await supabase
        .from('tournament_games')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1);

    if (gameEntriesError) {
        console.error('Error checking tournament_games:', gameEntriesError);
        return res.status(500).json({ message: gameEntriesError.message || 'Failed to check related game entries.' });
    }
    if (gameEntries && gameEntries.length > 0) {
        return res.status(409).json({ message: 'Cannot delete tournament: It has associated games. Please remove them first.' });
    }

    // Check if tournament_teams entries exist
    const { data: teamEntries, error: teamEntriesError } = await supabase
        .from('tournament_teams')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1);

    if (teamEntriesError) {
        console.error('Error checking tournament_teams:', teamEntriesError);
        return res.status(500).json({ message: teamEntriesError.message || 'Failed to check related team entries.' });
    }
    if (teamEntries && teamEntries.length > 0) {
        return res.status(409).json({ message: 'Cannot delete tournament: It has associated teams. Please remove them first.' });
    }

    // If no related entries, proceed to delete the tournament
    const { error: deleteError } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (deleteError) {
      console.error(`Error deleting tournament ${tournamentId}:`, deleteError);
      // Add more specific error handling if needed (e.g., not found vs. other DB errors)
      if (deleteError.code === 'PGRST204') { // PostgREST code for no rows deleted (e.g. not found)
        return res.status(404).json({ message: `Tournament with ID ${tournamentId} not found.` });
      }
      return res.status(500).json({ message: deleteError.message || 'Failed to delete tournament' });
    }

    return res.status(200).json({ message: `Tournament with ID ${tournamentId} deleted successfully.` });

  } catch (err: any) {
    console.error(`Exception deleting tournament ${tournamentId}:`, err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Admin-only endpoint
export default withApiAuth(handler, {
  isUserAdmin: true
}); 