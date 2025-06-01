import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ListTeamsApiResponse, ErrorResponse } from '@/lib/types/teams'
import { listTeamsResponseSchema } from '@/lib/types/teams'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListTeamsApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    return res.status(405).json(errorResponse);
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization);

    // Authentication check (optional for a public list, but good practice)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error for teams list:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name') // Select only id and name as per schema
      .order('name');

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      throw new Error(teamsError.message);
    }

    // Filter out the "Pending" team if this specific ID is still relevant
    const filteredTeams = teamsData?.filter(
      (team: { id: string }) => team.id !== '00000000-0000-0000-0000-000000000000'
    ) || [];

    const responseData = { teams: filteredTeams };
    listTeamsResponseSchema.parse(responseData); // Validate response

    return res.status(200).json(responseData);
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(400).json(errorResponse);
    }
    console.error('Error in teams list handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 