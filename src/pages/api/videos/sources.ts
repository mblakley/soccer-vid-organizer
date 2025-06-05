import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withApiAuth } from '@/lib/auth';
import { TeamRole } from '@/lib/types/auth';

interface VideoSourceInfo {
  video_id: string; // This is likely the video_id column from your 'videos' table
  source: string | null;
  // You might want to include other minimal details if useful, e.g., id (PK of videos table)
  id?: string; 
}

interface VideoSourcesResponse {
  sources?: VideoSourceInfo[];
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<VideoSourcesResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { ids } = req.query;

  if (!ids || typeof ids !== 'string') {
    return res.status(400).json({ message: 'Query parameter \'ids\' is required and must be a comma-separated string of video_ids.' });
  }

  const videoIdsArray = ids.split(',').map(id => id.trim()).filter(id => id);

  if (videoIdsArray.length === 0) {
    return res.status(400).json({ message: 'No valid video_ids provided in \'ids\' parameter.' });
  }

  try {
    // Fetching id (PK), video_id (source-specific ID), and source for each video
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('videos')
      .select('id, video_id, source') // Ensure 'video_id' here is the column containing YouTube/Vimeo ID etc.
      .in('video_id', videoIdsArray); // Querying by the source-specific video_id

    if (error) {
      console.error('Error fetching video sources:', error);
      return res.status(500).json({ message: error.message || 'Failed to fetch video sources' });
    }

    return res.status(200).json({ sources: data as VideoSourceInfo[] || [] });

  } catch (err: any) {
    console.error('Exception fetching video sources:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth as needed. Accessing video sources might be public or restricted.
export default withApiAuth(handler, {
  allowUnauthenticated: false
}); 