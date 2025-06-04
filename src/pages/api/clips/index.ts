import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ListClipsApiResponse } from '@/lib/types/clips'
import type { ErrorResponse } from '@/lib/types/api' // Shared ErrorResponse
import { listClipsResponseSchema } from '@/lib/types/clips'
import { z } from 'zod'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListClipsApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    res.setHeader('Allow', ['GET']);
    return res.status(405).json(errorResponse);
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    // Fetch clips - RLS should handle user-specific access if configured
    // If not using RLS for this, add .eq('created_by', user.id) or similar filtering
    const { data: clips, error: clipsError } = await supabase
      .from('clips')
      .select('*'); // Select all fields as per clipSchema, or specify if needed

    if (clipsError) {
      console.error('Error fetching clips:', clipsError);
      throw new Error(clipsError.message);
    }
    
    const responseData = { clips: clips || [] }; // Ensure clips is an array
    listClipsResponseSchema.parse(responseData);
    return res.status(200).json(responseData);

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { 
        error: 'Invalid response data', // Should not happen if DB schema matches Zod schema
        // issues: error.issues 
      };
      return res.status(500).json(errorResponse); // Internal server error if our response is bad
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(500).json(errorResponse);
    }
    console.error('Error in list clips handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 