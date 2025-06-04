import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { createLeagueSchema, LeagueApiResponse, LeagueResponse } from '@/lib/types/leagues';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeagueApiResponse>
) {
  const { leagueId } = req.query;
  const supabase = await getSupabaseClient(req.headers.authorization);

  switch (req.method) {
    case 'GET':
      try {
        const { data, error } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', leagueId)
          .single();

        if (error) throw error;
        return res.status(200).json({ league: data });
      } catch (error: any) {
        console.error('Error fetching league:', error);
        return res.status(500).json({ error: error.message });
      }

    case 'PUT':
      try {
        const validatedData = createLeagueSchema.parse(req.body);
        const { data, error } = await supabase
          .from('leagues')
          .update(validatedData)
          .eq('id', leagueId)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ league: data });
      } catch (error: any) {
        console.error('Error updating league:', error);
        return res.status(400).json({ error: error.message });
      }

    case 'DELETE':
      try {
        const { error } = await supabase
          .from('leagues')
          .delete()
          .eq('id', leagueId);

        if (error) throw error;
        return res.status(204).end();
      } catch (error: any) {
        console.error('Error deleting league:', error);
        return res.status(400).json({ error: error.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 