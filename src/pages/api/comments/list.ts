import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withApiAuth } from '@/lib/auth';
import { Comment } from '@/lib/types/comments';

interface CommentListResponse {
  comments?: Comment[];
  count?: number;
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<CommentListResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ comments: [], message: 'Method not allowed' });
  }

  const clipId = req.query.clipId as string | undefined;
  const shouldReturnCountOnly = req.query.count === 'true';

  if (!clipId) {
    return res.status(400).json({ comments: [], message: 'Clip ID is required' });
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);
    let query;

    if (shouldReturnCountOnly) {
      query = supabase.from('comments').select('id', { count: 'exact', head: true });
    } else {
      query = supabase.from('comments').select('*'); // Adjust select as needed
      // Example: .select('*, user_profiles (id, username, avatar_url)')
      query = query.order('created_at', { ascending: true });
    }

    query = query.eq('clip_id', clipId);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ comments: [], message: error.message });
    }

    if (shouldReturnCountOnly) {
      return res.status(200).json({ count: count || 0 });
    }

    return res.status(200).json({ comments: (data || []) as Comment[] });
  } catch (err: any) {
    console.error('Exception fetching comments:', err);
    return res.status(500).json({ comments: [], message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth as needed. Comments might be public for a public clip, or restricted.
export default withApiAuth(handler, {
  allowUnauthenticated: false
}); 