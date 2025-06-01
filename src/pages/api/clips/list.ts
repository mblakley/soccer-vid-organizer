import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole, Clip, Video } from '@/lib/types'; // Assuming Clip and Video types are defined

// Define the expected structure for a clip when joined with video URL/details
interface ClipWithVideoDetails extends Clip {
  videos?: Partial<Video> & { url?: string }; // videos table is joined, select specific fields like URL
}

interface ListClipsResponse {
  clips?: ClipWithVideoDetails[];
  message?: string;
}

const supabase = getSupabaseClient(); // Use service client or user client based on RLS

async function handler(req: NextApiRequest, res: NextApiResponse<ListClipsResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { recent, limit, joinVideoUrl, videoId, createdById } = req.query;

  try {
    let query = supabase.from('clips').select('*');

    if (joinVideoUrl === 'true') {
      // Adjust the join based on your actual foreign key and the fields needed from 'videos' table
      query = query.select('*, videos:video_id(id, url, source, video_id, title, metadata)'); 
    }

    if (recent === 'true') {
      query = query.order('created_at', { ascending: false });
    }
    
    if (limit && !isNaN(parseInt(limit as string))) {
      query = query.limit(parseInt(limit as string));
    }

    if (videoId && typeof videoId === 'string') {
      query = query.eq('video_id', videoId);
    }

    if (createdById && typeof createdById === 'string') {
        query = query.eq('created_by', createdById);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching clips:', error);
      return res.status(500).json({ message: error.message || 'Failed to fetch clips' });
    }
    
    // Supabase returns the joined table as a nested object (e.g., 'videos').
    // The front-end might expect it directly or differently, adjust mapping if needed.
    // The ClipWithVideoDetails type assumes it's nested under 'videos'.
    const clipsData = (data || []).map(clip => ({
        ...clip,
        // If the join key is different or you want to flatten, adjust here
    }));    

    return res.status(200).json({ clips: clipsData as ClipWithVideoDetails[] });

  } catch (err: any) {
    console.error('Exception fetching clips:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth as needed. Listing clips might be public or restricted.
export default withAuth(handler, {
  teamId: 'any', 
  roles: [] as TeamRole[], // Example: any authenticated user can list clips
  requireRole: false,
}); 