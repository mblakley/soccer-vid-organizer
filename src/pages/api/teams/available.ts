import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { AvailableTeamsApiResponse } from '@/lib/types/teams'
import { availableTeamsResponseSchema } from '@/lib/types/teams'
import { ErrorResponse } from '@/lib/types/api'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvailableTeamsApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    return res.status(405).json(errorResponse);
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);

    // Authentication check (optional for a public list)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error for available teams:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, description') // Ensure 'description' column exists or adjust select
      .order('name');

    if (teamsError) {
      console.error('Error fetching available teams:', teamsError);
      throw new Error(teamsError.message);
    }

    const responseData = { teams: teamsData || [] };
    availableTeamsResponseSchema.parse(responseData); // Validate response

    return res.status(200).json(responseData);
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(400).json(errorResponse);
    }
    console.error('Error in available teams handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
}