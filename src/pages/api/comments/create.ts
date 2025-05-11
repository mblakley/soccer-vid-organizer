import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { clip_id, content, user_id, role_visibility } = req.body

    if (!clip_id || !content || !user_id || !role_visibility) {
      return res.status(400).json({ message: 'Missing required fields' })
    }
    
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Missing authorization header' });
    }
    
    // Get authenticated Supabase client
    const supabase = getSupabaseClient(authHeader);
    
    // Create the comment
    const { data, error } = await supabase
      .from('comments')
      .insert({
        clip_id,
        user_id,
        content,
        role_visibility,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ id: data.id, ...data });
  } catch (err: any) {
    console.error('Error in comments/create API:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
} 