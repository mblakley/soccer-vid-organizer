import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { TeamRolesApiResponse, ErrorResponse } from '@/lib/types/teams'
import { teamRolesResponseSchema } from '@/lib/types/teams'
import { z } from 'zod'

const queryParamsSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid()
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TeamRolesApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    return res.status(405).json(errorResponse);
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization);

    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !requestingUser) {
      console.error('Authentication error:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    const queryValidation = queryParamsSchema.safeParse(req.query);
    if (!queryValidation.success) {
      const errorResponse: ErrorResponse = { 
        error: 'Invalid query parameters',
        // issues: queryValidation.error.issues // Optionally include Zod issues for debugging
      };
      return res.status(400).json(errorResponse);
    }
    const { teamId, userId } = queryValidation.data;

    // Authorization check: e.g., is requestingUser the userId or an admin of teamId?
    // For now, we proceed if authenticated, but more specific checks might be needed.

    // Fetch user's current roles
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('roles') // Assuming 'roles' is a direct column of array type
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (memberError) {
      console.error('Error fetching member roles:', memberError);
      throw new Error(memberError.message);
    }
    const userRoles = memberData?.roles || [];

    // Fetch pending role requests
    const { data: pendingData, error: pendingError } = await supabase
      .from('team_member_requests')
      .select('requested_roles')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingError) {
      console.error('Error fetching pending roles:', pendingError);
      throw new Error(pendingError.message);
    }
    const pendingRoles = pendingData?.requested_roles || [];

    const responseData = { userRoles, pendingRoles };
    teamRolesResponseSchema.parse(responseData); // Validate response

    return res.status(200).json(responseData);
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(400).json(errorResponse);
    }
    console.error('Error in roles handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 