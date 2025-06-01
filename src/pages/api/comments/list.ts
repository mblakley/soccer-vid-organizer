import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole, Comment } from '@/lib/types'; // Assuming Comment type exists or will be added

interface ListCommentsResponse {
  comments?: Comment[];
  count?: number;
  message?: string;
}

const supabase = getSupabaseClient(); // Or user-context client if RLS is per user

async function handler(req: NextApiRequest, res: NextApiResponse<ListCommentsResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { clipId, userId, videoId, isReplyToNull, returnCountOnly } = req.query;

  // Relaxed filter requirement: allow fetching all comments or based on isReplyToNull
  // if (!clipId && !userId && !videoId && typeof isReplyToNull === 'undefined') {
  //   return res.status(400).json({ message: 'A filter (clipId, userId, videoId, or isReplyToNull) is required.' });
  // }

  try {
    let query;
    const shouldReturnCountOnly = returnCountOnly === 'true';

    if (shouldReturnCountOnly) {
      query = supabase.from('comments').select('id', { count: 'exact', head: true });
    } else {
      query = supabase.from('comments').select('*'); // Adjust select as needed
      // Example: .select('*, user_profiles (id, username, avatar_url)')
      query = query.order('created_at', { ascending: true });
    }

    if (clipId && typeof clipId === 'string') {
      query = query.eq('clip_id', clipId);
    }
    if (userId && typeof userId === 'string') {
      query = query.eq('user_id', userId);
    }
    if (videoId && typeof videoId === 'string') {
      query = query.eq('video_id', videoId);
    }
    if (typeof isReplyToNull !== 'undefined') { // Checks for presence of the query param
        // parent_comment_id is the typical name for replies
        query = query.is('parent_comment_id', null);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ message: error.message || 'Failed to fetch comments' });
    }

    if (shouldReturnCountOnly) {
      return res.status(200).json({ count: count !== null ? count : 0 });
    }

    return res.status(200).json({ comments: data as Comment[] || [], count: count !== null ? count : (data?.length || 0) });

  } catch (err: any) {
    console.error('Exception fetching comments:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth as needed. Comments might be public for a public clip, or restricted.
export default withAuth(handler, {
  teamId: 'any',
  roles: [] as TeamRole[], // Example: any authenticated user can view comments
  requireRole: false,
}); 