import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/auth'
import type { TeamRequestsApiResponse, TeamRequest } from '@/lib/types/teams'
import { teamRequestsResponseSchema } from '@/lib/types/teams'
import type {
  ProcessTeamRequestApiResponse,
  ApproveTeamResponse,
  RejectTeamResponse
} from '@/lib/types/admin'
import {
  processTeamRequestSchema,
  approveTeamResponseSchema,
  rejectTeamResponseSchema
} from '@/lib/types/admin'
import { z } from 'zod'

// Placeholder for admin check - replace with your actual implementation
async function ensureAdmin(req: NextApiRequest): Promise<{ user: any; error?: ErrorResponse }> {
  const supabaseUserClient = getSupabaseClient(req.headers.authorization);
  const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    return { user: null, error: { error: 'Unauthorized' } };
  }
  // Example admin check (replace with your logic, e.g., from a user_roles table or custom claims)
  // const { data: roleData, error: roleError } = await supabaseUserClient.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single();
  // if (roleError || !roleData) { return { user: null, error: { error: 'Forbidden: Not an admin' } }; }
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) { // Example, replace!
      return { user: null, error: { error: 'Forbidden: Not an admin' } };
  }
  return { user };
}

const PENDING_TEAM_ID_FOR_NEW_REQUESTS = '00000000-0000-0000-0000-000000000000'; // The placeholder ID

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TeamRequestsApiResponse | ProcessTeamRequestApiResponse>
) {
  const adminCheck = await ensureAdmin(req);
  if (adminCheck.error || !adminCheck.user) {
    return res.status(adminCheck.error?.error === 'Unauthorized' ? 401 : 403).json(adminCheck.error!);
  }
  const adminUser = adminCheck.user;
  const supabaseAdmin = getSupabaseClient(); // Service role client for admin operations

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('team_requests')
        .select('*, user:users(email, user_metadata->>full_name)') // Adjust if your user table is different
        .order('created_at', { ascending: false });

      if (error) throw error;
      const responseData = { requests: data || [] };
      teamRequestsResponseSchema.parse(responseData);
      return res.status(200).json(responseData);
    } catch (error) {
      console.error('Error fetching team requests:', error);
      const errResp: ErrorResponse = { error: error instanceof Error ? error.message : 'Internal server error' };
      return res.status(500).json(errResp);
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, action, review_notes } = processTeamRequestSchema.parse(req.body);

      const { data: teamRequestToProcess, error: fetchError } = await supabaseAdmin
        .from('team_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !teamRequestToProcess) {
        const err: ErrorResponse = { error: 'Team request not found' };
        return res.status(404).json(err);
      }
      if (teamRequestToProcess.status !== 'pending'){
        const err: ErrorResponse = { error: 'Team request is not pending and cannot be processed.' };
        return res.status(400).json(err);
      }

      if (action === 'approve') {
        // 1. Create the new team
        const { data: newTeam, error: teamError } = await supabaseAdmin
          .from('teams')
          .insert([{
            name: teamRequestToProcess.team_name,
            // description: teamRequestToProcess.description, // Add if description is part of team_requests and teams table
            // club_affiliation, season, age_group, gender etc. - these might need to be part of the request or a secondary step
          }])
          .select()
          .single();
        if (teamError || !newTeam) throw new Error('Failed to create team: ' + teamError?.message);

        // 2. Update team_members who were on the PENDING_TEAM_ID and requested this exact team_name
        // This logic assumes users requesting the same team_name are grouped.
        // It might be safer to link the original team_request record to the team_member record if possible.
        const { data: usersToUpdate, error: usersToUpdateError } = await supabaseAdmin
            .from('team_requests')
            .select('user_id')
            .eq('team_name', teamRequestToProcess.team_name)
            .eq('status', 'pending');
        
        if (usersToUpdateError) throw new Error('Failed to fetch users for team update: ' + usersToUpdateError.message);

        if (usersToUpdate && usersToUpdate.length > 0) {
            const userIdsToUpdate = usersToUpdate.map(u => u.user_id);
            const { error: updateMemberError } = await supabaseAdmin
                .from('team_members')
                .update({ team_id: newTeam.id, roles: ['player'] }) // Default role, adjust as needed
                .eq('team_id', PENDING_TEAM_ID_FOR_NEW_REQUESTS)
                .in('user_id', userIdsToUpdate);
            if (updateMemberError) console.error('Error updating team members for new team:', updateMemberError.message); // Log but continue
        }

        // 3. Update all related pending team_requests for this team_name to 'approved'
        const { error: requestsUpdateError } = await supabaseAdmin
          .from('team_requests')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminUser.id,
            review_notes
          })
          .eq('team_name', teamRequestToProcess.team_name)
          .eq('status', 'pending');
        if (requestsUpdateError) throw new Error('Failed to update team requests: ' + requestsUpdateError.message);

        const responseData: ApproveTeamResponse = { success: true, team: newTeam };
        approveTeamResponseSchema.parse(responseData);
        return res.status(200).json(responseData);

      } else if (action === 'reject') {
        const { error: updateError } = await supabaseAdmin
          .from('team_requests')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminUser.id,
            review_notes
          })
          .eq('id', id);
        if (updateError) throw updateError;

        const responseData: RejectTeamResponse = { success: true };
        rejectTeamResponseSchema.parse(responseData);
        return res.status(200).json(responseData);
      }
    } catch (error) {
      console.error('Error processing team request:', error);
      const errResp: ErrorResponse = { error: error instanceof Error ? error.message : 'Internal server error' };
      if (error instanceof z.ZodError) errResp.error = 'Invalid request body';
      return res.status(error instanceof z.ZodError ? 400 : 500).json(errResp);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    const errorResponse: ErrorResponse = { error: `Method ${req.method} Not Allowed` };
    return res.status(405).json(errorResponse);
  }
} 