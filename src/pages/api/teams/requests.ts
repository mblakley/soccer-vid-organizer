import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { TeamRequestsApiResponse } from '@/lib/types/teams'
import { teamRequestsResponseSchema } from '@/lib/types/teams' // Import the schema
import { ErrorResponse } from '@/lib/types/api'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TeamRequestsApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)

    // Add user authentication check - only admins or relevant users should access all requests
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error('Error getting user or user not found:', userError);
        const errorResp: ErrorResponse = { error: 'Unauthorized' };
        return res.status(401).json(errorResp);
    }
    // Further role-based access control might be needed here if not all users can see all requests

    const { data, error } = await supabase
      .from('team_member_requests')
      .select(`
        id,
        user_id,
        team_id,
        requested_roles,
        status,
        created_at,
        updated_at,
        reviewed_by,
        reviewed_at,
        user:auth_users!user_id (email, user_metadata->>full_name),
        team:teams!team_id (name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching team member requests:', error)
      throw new Error(error.message)
    }

    const responseData = { 
      requests: (data || []).map(request => ({
        ...request,
        user: request.user?.[0] ? {
          email: request.user[0].email,
          full_name: request.user[0].full_name
        } : undefined,
        team: request.team?.[0] ? {
          name: request.team[0].name
        } : undefined
      }))
    };
    teamRequestsResponseSchema.parse(responseData);

    return res.status(200).json(responseData)
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      return res.status(400).json(errorResponse)
    }
    console.error('Error in team requests handler:', error)
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    return res.status(500).json(errorResponse)
  }
} 