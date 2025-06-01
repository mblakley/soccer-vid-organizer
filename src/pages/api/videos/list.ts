import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { withAuth } from '@/components/auth'
import { TeamRole, Video } from '@/lib/types'

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    // Add other user properties if needed
  };
  teamId?: string;
  userRoles?: TeamRole[];
}

interface ListVideosResponse {
  videos?: Video[];
  message?: string;
}

// Initialize the service role client once
const supabase = getSupabaseClient();

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ListVideosResponse>) {
  if (req.method === 'GET') {
    const { select: selectQuery, orderBy: orderByQuery, orderAscending } = req.query;

    // Default select and order parameters
    const selectFields = typeof selectQuery === 'string' ? selectQuery : '*';
    const orderByField = typeof orderByQuery === 'string' ? orderByQuery : 'created_at';
    const isAscending = typeof orderAscending === 'string' ? orderAscending === 'true' : false;

    try {
      let query = supabase
        .from('videos')
        .select(selectFields)
        .order(orderByField, { ascending: isAscending });

      // Add any other filters you might need based on req.query
      // e.g., if (req.query.source) query = query.eq('source', req.query.source);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching videos:', error);
        return res.status(500).json({ message: error.message || 'Failed to fetch videos' });
      }

      // If no error, data should be Video[] or null. Cast to unknown first to satisfy linter.
      return res.status(200).json({ videos: data ? (data as unknown as Video[]) : [] });
    } catch (err: any) {
      console.error('Exception fetching videos:', err)
      return res.status(500).json({ message: err.message || 'An unexpected error occurred' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

export default withAuth(handler, {
  teamId: 'any',
  roles: ['coach', 'player', 'parent', 'manager'] as TeamRole[],
}) 