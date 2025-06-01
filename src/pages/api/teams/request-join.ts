import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { RequestJoinTeamApiResponse, ErrorResponse } from '@/lib/types/teams'
import { requestJoinTeamRequestSchema, requestJoinTeamResponseSchema } from '@/lib/types/teams'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RequestJoinTeamApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    return res.status(405).json(errorResponse);
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error for request-join:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    const { team_id, requested_roles } = requestJoinTeamRequestSchema.parse(req.body);

    // Check for existing pending request for the same user and team
    const { data: existingRequest, error: checkError } = await supabase
      .from('team_member_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('team_id', team_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing team join request:', checkError);
      throw new Error(checkError.message);
    }

    if (existingRequest) {
      const errorResponse: ErrorResponse = { error: 'You already have a pending request to join this team' };
      return res.status(400).json(errorResponse);
    }

    // Create team member request
    const { data: createdRequestData, error: createError } = await supabase
      .from('team_member_requests')
      .insert([{
        team_id,
        user_id: user.id, // Use authenticated user's ID
        requested_roles,
        status: 'pending'
      }])
      .select() // Select all fields of the created record
      .single();

    if (createError) {
      console.error('Error creating team join request entry:', createError);
      throw new Error(createError.message);
    }
    if (!createdRequestData) {
        throw new Error('Team join request creation did not return data.');
    }

    const responseData = { request: createdRequestData };
    requestJoinTeamResponseSchema.parse(responseData); // Validate response

    return res.status(201).json(responseData);
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(error.name === 'ZodError' ? 400 : 500).json(errorResponse);
    }
    console.error('Error in request-join handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 