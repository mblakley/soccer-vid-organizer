import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { RequestTeamApiResponse, ErrorResponse } from '@/lib/types/teams'
import { requestTeamRequestSchema, requestTeamResponseSchema } from '@/lib/types/teams'

const PENDING_TEAM_ID = '00000000-0000-0000-0000-000000000000'; // Consider if this is still the best approach

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RequestTeamApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    return res.status(405).json(errorResponse);
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error for request-team:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    const { team_name, description } = requestTeamRequestSchema.parse(req.body);

    // Create team request
    const { data: teamRequestData, error: requestError } = await supabase
      .from('team_requests') // Ensure this table name is correct
      .insert([{
        user_id: user.id, // Use authenticated user's ID
        team_name,
        description,
        status: 'pending' // Explicitly set status
      }])
      .select() // Select all fields of the created record
      .single();

    if (requestError) {
      console.error('Error creating team request entry:', requestError);
      throw new Error(requestError.message);
    }
    if (!teamRequestData) {
        throw new Error('Team request creation did not return data.')
    }

    // TODO: Review if adding user to a generic "Pending" team is necessary or if
    // the record in 'team_requests' is sufficient for tracking.
    // This part might be legacy or have specific logic tied to PENDING_TEAM_ID.
    const { error: memberError } = await supabase
      .from('team_members')
      .insert([{
        team_id: PENDING_TEAM_ID,
        user_id: user.id,
        roles: ['pending_approval'] // Using a role like 'pending_approval' or similar
      }]);

    if (memberError) {
      // Log this error but don't necessarily fail the whole request if the main request was created.
      // Or, implement transactional behavior if both must succeed/fail together.
      console.error('Error adding user to pending team, but team request was created:', memberError);
      // Potentially, we might want to roll back the team_request if this fails.
    }

    const responseData = { request: teamRequestData };
    requestTeamResponseSchema.parse(responseData); // Validate response

    return res.status(201).json(responseData);
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(error.name === 'ZodError' ? 400 : 500).json(errorResponse);
    }
    console.error('Error in request-team handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 