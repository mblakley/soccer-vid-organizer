import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { TeamsApiResponse, Team } from '@/lib/types/teams'
import type { ErrorResponse } from '@/lib/types/auth'
import { teamsResponseSchema } from '@/lib/types/teams'
import { z } from 'zod'

async function verifyAdminAccess(supabaseClientWithAuth: any): Promise<{ user?: any; error?: ErrorResponse }> {
  const { data: { user }, error: authError } = await supabaseClientWithAuth.auth.getUser();
  if (authError) {
    console.error('Auth error in admin check:', authError);
    return { error: { error: 'Authentication failed: ' + authError.message } };
  }
  if (!user) {
    return { error: { error: 'Unauthorized: No user session' } };
  }

  const { data: userRole, error: roleError } = await supabaseClientWithAuth
    .from('user_roles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  if (roleError) {
    console.error('Error checking admin role:', roleError);
    if (roleError.code === 'PGRST116') {
        return { user, error: { error: 'Forbidden: Admin role not found.' } };
    }
    return { user, error: { error: `Database error checking admin role: ${roleError.message}` } };
  }

  if (!userRole?.is_admin) {
    return { user, error: { error: 'Forbidden: User is not an admin.' } };
  }
  return { user };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TeamsApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    res.setHeader('Allow', ['GET']);
    return res.status(405).json(errorResponse);
  }

  const supabaseUserClient = getSupabaseClient(req.headers.authorization);
  const adminAccessCheck = await verifyAdminAccess(supabaseUserClient);

  if (adminAccessCheck.error || !adminAccessCheck.user) {
    const status = adminAccessCheck.error?.error?.includes('Unauthorized') ? 401 : 403;
    return res.status(status).json(adminAccessCheck.error || { error: 'Access denied' });
  }
  
  const supabaseService = getSupabaseClient();

  try {
    const { data: teamsData, error: teamsError } = await supabaseService
      .from('teams')
      .select(`
        *,
        team_members ( id ) 
      `)
      .order('name');

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      throw new Error(`Error fetching teams: ${teamsError.message}`);
    }

    const transformedTeams: Team[] = (teamsData || []).map((team: any) => ({
      ...team,
      member_count: team.team_members?.length || 0,
      team_members: undefined 
    }));

    const responseData = { teams: transformedTeams }; 
    teamsResponseSchema.parse(responseData); 

    return res.status(200).json(responseData);

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { 
        error: 'Response data validation failed',
      };
      return res.status(500).json(errorResponse); 
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      const statusCode = 
        error.message.includes('Forbidden') ? 403 :
        error.message.includes('Unauthorized') ? 401 :
        500;
      return res.status(statusCode).json(errorResponse);
    }
    console.error('Unexpected error in admin/teams handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 