import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { withApiAuth } from '@/lib/auth'
import { TeamRole } from '@/lib/types/auth'
import { Tournament } from '@/lib/types/tournaments'

// Define a basic Tournament type, assuming it will be moved to or matched with src/lib/types.ts
interface ApiTournament {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  // Add any other fields that are selected and returned
}

interface ListTournamentsResponse {
  tournaments?: Tournament[];
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<ListTournamentsResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { select: selectQuery, orderBy: orderByQuery, orderAscending, limit, offset } = req.query;

  const selectFields = typeof selectQuery === 'string' ? selectQuery : '*';
  const orderByField = typeof orderByQuery === 'string' ? orderByQuery : 'start_date'; // Default order
  const isAscending = typeof orderAscending === 'string' ? orderAscending === 'true' : true; // Default ascending for dates

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

    let query = supabase
      .from('tournaments')
      .select(selectFields)
      .order(orderByField, { ascending: isAscending });

    if (limit && !isNaN(parseInt(limit as string))) {
      query = query.limit(parseInt(limit as string));
    }
    if (offset && !isNaN(parseInt(offset as string)) && limit && !isNaN(parseInt(limit as string))) {
        query = query.range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);
    } else if (offset && !isNaN(parseInt(offset as string))) {
        // If only offset is provided without limit, Supabase might behave unexpectedly or error.
        // Typically, range is used with both start and end. For simplicity, ignoring offset if no limit.
        // Or, you could define a default limit if only offset is present.
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tournaments:', error);
      return res.status(500).json({ message: error.message || 'Failed to fetch tournaments' });
    }

    return res.status(200).json({ tournaments: data ? (data as unknown as Tournament[]) : [] });

  } catch (err: any) {
    console.error('Exception fetching tournaments:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Admin-only endpoint
export default withApiAuth(handler, { isUserAdmin: true }); 