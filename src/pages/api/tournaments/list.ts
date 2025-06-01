import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { withAuth } from '@/components/auth' // Assuming a general withAuth for API routes
import { Tournament, TeamRole } from '@/lib/types' // Assuming TeamRole is the general role type

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

const supabase = getSupabaseClient();

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
export default withAuth(handler, {
  teamId: 'any',
  roles: ['admin'] as TeamRole[],
  requireRole: true,
}); 