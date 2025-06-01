import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { Tournament, TeamRole } from '@/lib/types';

interface TournamentDetailResponse {
  tournament?: Tournament;
  message?: string;
}

const supabase = getSupabaseClient(); // Use service client or ensure RLS allows admin operations

async function handler(req: NextApiRequest, res: NextApiResponse<TournamentDetailResponse | { message: string }>) {
  const { tournamentId } = req.query;

  if (typeof tournamentId !== 'string') {
    return res.status(400).json({ message: 'tournamentId path parameter is required.' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return res.status(404).json({ message: `Tournament with ID ${tournamentId} not found.` });
        }
        console.error('Error fetching tournament:', error);
        return res.status(500).json({ message: error.message || 'Failed to fetch tournament.' });
      }
      return res.status(200).json({ tournament: data as Tournament });
    } catch (err: any) {
      console.error(`Exception fetching tournament ${tournamentId}:`, err);
      return res.status(500).json({ message: err.message || 'An unexpected error occurred.' });
    }
  } else if (req.method === 'PUT') {
    const tournamentData = req.body as Partial<Tournament>;

    // Basic validation
    if (!tournamentData.name || !tournamentData.start_date || !tournamentData.end_date) {
      return res.status(400).json({ message: 'Name, start date, and end date are required.' });
    }

    try {
      // Prepare data for update, excluding id, created_at, and updated_at from direct update
      const { id, created_at, updated_at, ...updatePayload } = tournamentData;
      
      const { data, error } = await supabase
        .from('tournaments')
        .update(updatePayload)
        .eq('id', tournamentId)
        .select()
        .single();

      if (error) {
        console.error(`Error updating tournament ${tournamentId}:`, error);
        if (error.code === 'PGRST116') { // Not found
            return res.status(404).json({ message: `Tournament with ID ${tournamentId} not found for update.` });
        }
        return res.status(500).json({ message: error.message || 'Failed to update tournament.' });
      }
      return res.status(200).json({ tournament: data as Tournament, message: 'Tournament updated successfully.' });
    } catch (err: any) {
      console.error(`Exception updating tournament ${tournamentId}:`, err);
      return res.status(500).json({ message: err.message || 'An unexpected error occurred.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Admin-only endpoint
export default withAuth(handler, {
  teamId: 'any',
  roles: ['admin'] as TeamRole[],
  requireRole: true,
}); 