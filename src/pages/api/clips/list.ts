import { NextApiRequest, NextApiResponse } from 'next';
import { withApiAuth, AuthenticatedApiRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ListClipsApiResponse } from '@/lib/types/clips';

async function handler(
  req: NextApiRequest, // Standard NextApiRequest for HOC
  res: NextApiResponse<ListClipsApiResponse>
) {
  const apiReq = req as AuthenticatedApiRequest; // Cast after HOC processing

  if (apiReq.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ clips: [], message: 'Method not allowed' } as ListClipsApiResponse);
  }

  const { user, claims } = apiReq;
  if (!user) {
    // This should be caught by withApiAuth if allowUnauthenticated is false
    return res.status(401).json({ clips: [], message: 'Authentication required' } as ListClipsApiResponse);
  }

  const videoId = apiReq.query.videoId as string | undefined;
  const recent = apiReq.query.recent === 'true';
  const limit = parseInt(apiReq.query.limit as string) || undefined;
  const joinVideoUrl = apiReq.query.joinVideoUrl === 'true'; // For joining with videos table

  // Validate videoId if it's expected for non-admin users
  // if (!videoId && !claims.is_admin) {
  //   return res.status(400).json({ clips: [], message: 'videoId is required' } as ListClipsApiResponse);
  // }

  try {
    const supabase = getSupabaseClient(apiReq.headers.authorization);
    let query;

    if (joinVideoUrl) {
      query = supabase.from('clips').select(`
        *,
        videos ( url )
      `);
    } else {
      query = supabase.from('clips').select('*');
    }

    if (videoId) {
      query = query.eq('video_id', videoId);
    } else {
      // If no videoId, apply team-based filtering for non-admins
      if (!claims.is_admin) {
        const userTeamIds = Object.keys(claims.team_roles || {});
        if (userTeamIds.length > 0) {
          // This requires clips to have a direct team_id or be joinable to videos which have team_id
          // Assuming clips are linked to videos that have team_id
          const { data: teamVideos, error: videoError } = await supabase
            .from('videos')
            .select('id')
            .in('team_id', userTeamIds);
          
          if (videoError) throw videoError;
          const videoIdsFromUserTeams = teamVideos?.map(v => v.id) || [];
          if (videoIdsFromUserTeams.length === 0) {
            return res.status(200).json({ clips: [] }); // No videos in user's teams, so no clips
          }
          query = query.in('video_id', videoIdsFromUserTeams);
        } else {
          return res.status(200).json({ clips: [] }); // Non-admin, no teams, no clips
        }
      }
      // Admins see all clips if no videoId is specified (RLS might still apply)
    }

    if (recent) {
      query = query.order('created_at', { ascending: false });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: clips, error } = await query;

    if (error) {
      console.error('[API /clips/list] Error fetching clips:', error);
      return res.status(500).json({ clips: [], message: error.message } as ListClipsApiResponse);
    }

    return res.status(200).json({ clips: clips || [] });

  } catch (err: any) {
    console.error('[API /clips/list] Exception:', err);
    return res.status(500).json({ clips: [], message: err.message || 'An unexpected error occurred' } as ListClipsApiResponse);
  }
}

export default withApiAuth(handler, {
  // Previous HOC: teamId: 'any', roles: [], requireRole: false -> means any authenticated user
  allowUnauthenticated: false, // Ensures user is authenticated
  // No specific role check beyond being authenticated, per old config.
}); 