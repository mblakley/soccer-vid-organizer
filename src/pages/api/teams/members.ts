import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { TeamMembersApiResponse } from '@/lib/types/teams'
import { teamMembersResponseSchema } from '@/lib/types/teams'
import { z } from 'zod'
import { ErrorResponse } from '@/lib/types/api'

const queryParamsSchema = z.object({
  teamId: z.string().uuid()
});

type TeamMemberWithUser = {
  id: string;
  team_id: string;
  user_id: string;
  roles: string[];
  jersey_number?: string;
  position?: string;
  joined_date?: string;
  left_date?: string;
  is_active?: boolean;
  user: Array<{
    email: string;
    user_metadata: {
      full_name?: string;
    };
  }>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TeamMembersApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    return res.status(405).json(errorResponse);
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);

    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !requestingUser) {
      console.error('Authentication error for team members:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    const queryValidation = queryParamsSchema.safeParse(req.query);
    if (!queryValidation.success) {
      const errorResponse: ErrorResponse = { 
        error: 'Invalid query parameters',
        // issues: queryValidation.error.issues 
      };
      return res.status(400).json(errorResponse);
    }
    const { teamId } = queryValidation.data;
    
    // Authorization: Check if requestingUser is part of teamId or an admin.
    // This is a placeholder for more specific logic.

    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        team_id,
        user_id,
        roles,
        jersey_number,
        position,
        joined_date,
        left_date,
        is_active,
        user:user_id (
          email,
          user_metadata
        )
      `)
      .eq('team_id', teamId)
      .eq('is_active', true);

    if (error) {
        console.error('Error fetching team members:', error);
        throw new Error(error.message);
    }

    // Transform data to match teamMemberSchema (user_email, user_name)
    const members = (data as unknown as TeamMemberWithUser[])?.map(member => ({
        ...member,
        user_email: member.user?.[0]?.email || undefined,
        user_name: member.user?.[0]?.user_metadata?.full_name || undefined,
        user: undefined // remove the nested user object after extracting details
    })) || [];

    const responseData = { members }; // Supabase returns an array, schema expects { members: [] }
    teamMembersResponseSchema.parse(responseData); 

    return res.status(200).json(responseData);
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(400).json(errorResponse);
    }
    console.error('Error fetching team members:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 