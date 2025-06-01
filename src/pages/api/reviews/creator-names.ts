import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { CreatorNamesApiResponse } from '@/lib/types/reviews'
import type { ErrorResponse } from '@/lib/types/auth' // Shared ErrorResponse
import {
  creatorNamesRequestSchema,
  creatorNamesResponseSchema
} from '@/lib/types/reviews'
import { z } from 'zod'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatorNamesApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    res.setHeader('Allow', ['POST']);
    return res.status(405).json(errorResponse);
  }

  try {
    const supabaseUserClient = getSupabaseClient(req.headers.authorization);
    const { data: { user: requestingUser }, error: authError } = await supabaseUserClient.auth.getUser();

    if (authError || !requestingUser) {
      console.error('Authentication error:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    // TODO: Add authorization check: Does requestingUser have permission to get these names?
    // e.g., are they an admin, or do these teamMemberIds belong to teams they manage?

    const { teamMemberIds } = creatorNamesRequestSchema.parse(req.body);

    // Use a service role client for operations requiring admin privileges like listing users or unrestricted table access.
    // Ensure this is only used when necessary and after initial auth & authz checks.
    const supabaseAdmin = getSupabaseClient(); // Service role client

    console.log('Fetching team members for IDs:', teamMemberIds);
    const { data: teamMembers, error: teamError } = await supabaseAdmin
      .from('team_members')
      .select('id, user_id')
      .in('id', teamMemberIds);

    if (teamError) {
      console.error('Error fetching team members:', teamError);
      throw new Error(`Failed to fetch team members: ${teamError.message}`);
    }
    if (!teamMembers || teamMembers.length === 0) {
      console.log('No team members found for the provided IDs.');
      return res.status(200).json({}); // Return empty if no members found
    }
    console.log('Team members found:', teamMembers);

    const teamMemberToUserMap: Record<string, string> = {};
    teamMembers.forEach(member => {
      if (member.id && member.user_id) { // Ensure properties exist
        teamMemberToUserMap[member.id] = member.user_id;
      }
    });

    const userIds = [...new Set(Object.values(teamMemberToUserMap))].filter(id => id); // Filter out potential null/undefined
    if (userIds.length === 0) {
      console.log('No valid user IDs found from team members.');
      return res.status(200).json({});
    }
    console.log('Unique user IDs to fetch:', userIds);

    // Fetching users by IDs. Consider batching if userIds can be very large.
    const { data: usersListResponse, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: userIds.length, // Adjust if pagination is needed for very large lists
        // No direct filter by user_ids in listUsers, so we fetch and filter client-side for now.
        // OR: If you have a function/view to get users by IDs, call that.
    });
    
    if (usersError) {
        console.error('Error fetching users from admin API:', usersError);
        throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const userMap: Record<string, { full_name?: string; email?: string }> = {};
    usersListResponse?.users.forEach(user => {
        if (userIds.includes(user.id)) { // Filter to only the userIds we care about
            userMap[user.id] = {
                full_name: user.user_metadata?.full_name,
                email: user.email
            };
        }
    });
    console.log('Mapped users:', Object.keys(userMap).length);

    const responseData: Record<string, string> = {};
    Object.entries(teamMemberToUserMap).forEach(([teamMemberId, userId]) => {
      const userDetails = userMap[userId];
      responseData[teamMemberId] = userDetails?.full_name || userDetails?.email || 'Unknown User';
    });

    creatorNamesResponseSchema.parse(responseData);
    console.log('Returning creator names response:', responseData);
    return res.status(200).json(responseData);

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { 
        error: 'Invalid request body or parameters',
        // issues: error.issues
      };
      return res.status(400).json(errorResponse);
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(500).json(errorResponse);
    }
    console.error('Error in creator-names handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 