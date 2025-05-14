import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Starting /api/videos/list handler')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    // Initialize Supabase client with admin privileges
    console.log('Initializing Supabase client')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // 1. Fetch videos with clip count
    const { data: videos, error: videosError } = await supabaseAdmin
      .from('videos')
      .select('*, clips:clips!video_id(count)')
      // Sort by metadata->publishedAt (if available), otherwise fall back to created_at
      .order('metadata->publishedAt', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });  // Secondary sort for videos without publishedAt
    
    if (videosError) throw new Error(`Failed to fetch videos: ${videosError.message}`);

    // 2. Fetch all clips
    const { data: clips, error: clipsError } = await supabaseAdmin
      .from('clips')
      .select('id, video_id');
    if (clipsError) throw new Error(`Failed to fetch clips: ${clipsError.message}`);

    // 3. Fetch all comments
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('comments')
      .select('id, clip_id');
    if (commentsError) throw new Error(`Failed to fetch comments: ${commentsError.message}`);

    // 4. Aggregate in JS
    const videoToClipIds: Record<string, string[]> = {};
    (clips || []).forEach(clip => {
      const vid = String(clip.video_id);
      if (!videoToClipIds[vid]) videoToClipIds[vid] = [];
      videoToClipIds[vid].push(String(clip.id));
    });
    const clipIdToCommentCount: Record<string, number> = {};
    (comments || []).forEach(comment => {
      const cid = String(comment.clip_id);
      clipIdToCommentCount[cid] = (clipIdToCommentCount[cid] || 0) + 1;
    });
    const videoIdToCommentCount: Record<string, number> = {};
    Object.entries(videoToClipIds).forEach(([video_id, clipIds]) => {
      videoIdToCommentCount[video_id] = (clipIds as string[]).reduce(
        (sum, clipId) => sum + (clipIdToCommentCount[clipId] || 0),
        0
      );
    });
    const videosWithCounts = (videos || []).map(video => ({
      ...video,
      clip_count: video.clips?.count || 0,
      comment_count: videoIdToCommentCount[String(video.video_id)] || 0,
      // Add formatted published date for easier display
      published_date: video.metadata?.publishedAt 
        ? new Date(video.metadata.publishedAt).toLocaleDateString() 
        : null
    }));

    return res.status(200).json(videosWithCounts);
  } catch (error: any) {
    console.error('Error fetching videos:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
} 