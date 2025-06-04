import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { createLeagueSchema, LeagueApiResponse, LeaguesListApiResponse } from '@/lib/types/leagues';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeagueApiResponse | LeaguesListApiResponse>
) {
  const supabase = await getSupabaseClient(req.headers.authorization);

  switch (req.method) {
    case 'GET':
      try {
        const { data, error } = await supabase
          .from('leagues')
          .select('*')
          .order('name');

        if (error) throw error;
        return res.status(200).json({ leagues: data });
      } catch (error: any) {
        console.error('Error fetching leagues:', error);
        return res.status(500).json({ error: error.message });
      }

    case 'POST':
      try {
        const validatedData = createLeagueSchema.parse(req.body);
        const { data, error } = await supabase
          .from('leagues')
          .insert([validatedData])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ league: data });
      } catch (error: any) {
        console.error('Error creating league:', error);
        return res.status(400).json({ error: error.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 