import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withApiAuth } from '@/lib/auth';
import { League } from '@/lib/types/leagues';

interface ListLeaguesResponse {
  leagues?: League[];
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<ListLeaguesResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching leagues:', error);
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ leagues: data || [] });
  } catch (err: any) {
    console.error('Exception fetching leagues:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

export default withApiAuth(handler, {
  allowUnauthenticated: false
}); 