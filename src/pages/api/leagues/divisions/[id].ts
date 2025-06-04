import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { LeagueDivision } from '@/lib/types/leagues';
import { ErrorResponse } from '@/lib/types/api';

type DeleteDivisionResponse = { success: true } | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteDivisionResponse>
) {
  const { id } = req.query;
  const supabase = await getSupabaseClient(req.headers.authorization);

  switch (req.method) {
    case 'DELETE':
      try {
        // First get the division name
        const { data: division, error: fetchError } = await supabase
          .from('league_divisions')
          .select('name, league_id')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        // Check if the division is being used by any teams
        const { data: teams, error: checkError } = await supabase
          .from('team_league_memberships')
          .select('id')
          .eq('league_id', division.league_id)
          .eq('division', division.name);

        if (checkError) throw checkError;

        if (teams && teams.length > 0) {
          return res.status(400).json({ error: 'Cannot delete a division that has teams assigned to it' });
        }

        // Delete the division
        const { error } = await supabase
          .from('league_divisions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return res.status(204).end();
      } catch (error: any) {
        console.error('Error deleting league division:', error);
        return res.status(400).json({ error: error.message });
      }

    default:
      res.setHeader('Allow', ['DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 