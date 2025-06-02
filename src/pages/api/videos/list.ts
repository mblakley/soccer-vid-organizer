import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { withApiAuth, AuthenticatedApiRequest } from '@/lib/auth'
import { TeamRole, Video, ListVideosApiResponse } from '@/lib/types'

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

async function handler(req: NextApiRequest, res: NextApiResponse<ListVideosApiResponse>) {
  // Inside the handler, after withApiAuth has processed, req can be treated as AuthenticatedApiRequest
  const apiReq = req as AuthenticatedApiRequest;

  if (apiReq.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ videos: [], message: 'Method not allowed' } as ListVideosApiResponse)
  }

  // User and claims are populated by withApiAuth
  const { user, claims } = apiReq;

  // If withApiAuth was configured with allowUnauthenticated: false (default), user should exist.
  if (!user) {
    return res.status(401).json({ videos: [], message: 'Authentication required' } as ListVideosApiResponse);
  }

  const teamId = apiReq.query.team_id as string | undefined;
  const limit = parseInt(apiReq.query.limit as string) || undefined;
  const recent = apiReq.query.recent === 'true';

  try {
    const supabase = getSupabaseClient(apiReq.headers.authorization); // User-context client for RLS
    let query = supabase.from('videos').select('*');

    if (teamId) {
      query = query.eq('team_id', teamId);
    } else {
      // If no specific teamId, and user has team roles, filter by user's teams
      const userTeamIds = Object.keys(claims.team_roles || {});
      if (userTeamIds.length > 0) {
        query = query.in('team_id', userTeamIds);
      } else if (!claims.is_admin) {
        // Non-admin with no team memberships sees no videos by default
        return res.status(200).json({ videos: [] });
      }
      // Admins without explicit team_id will see all videos if no RLS prevents it further
    }

    if (recent) {
      query = query.order('created_at', { ascending: false });
    }
    if (limit) {
      query = query.limit(limit);
    }

    const { data: videos, error } = await query;

    if (error) {
      console.error('[API /videos/list] Error fetching videos:', error);
      return res.status(500).json({ videos: [], message: error.message } as ListVideosApiResponse);
    }

    return res.status(200).json({ videos: videos || [] });
  } catch (err: any) {
    console.error('[API /videos/list] Exception:', err);
    return res.status(500).json({ videos: [], message: err.message || 'An unexpected error occurred' } as ListVideosApiResponse);
  }
}

export default withApiAuth(handler, {
  // To access this route, user must be authenticated.
  // No specific role required - any authenticated user can access
  allowUnauthenticated: false
}); 