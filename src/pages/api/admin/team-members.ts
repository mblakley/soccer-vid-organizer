import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/auth'
import {
  type AddTeamMemberApiResponse,
  addTeamMemberRequestSchema,
  addTeamMemberResponseSchema,
  type UpdateTeamMemberApiResponse,
  updateTeamMemberRequestSchema,
  updateTeamMemberResponseSchema,
  type RemoveTeamMemberApiResponse,
  removeTeamMemberRequestSchema,
  removeTeamMemberResponseSchema
} from '@/lib/types/admin'
// import { teamMemberSchema } from '@/lib/types/teams'; // Import if you have a specific teamMemberSchema for responses
import { z } from 'zod'

// Placeholder for admin check
async function ensureAdmin(req: NextApiRequest): Promise<{ user: any; error?: ErrorResponse }> {
  const supabaseUserClient = getSupabaseClient(req.headers.authorization);
  const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
  if (authError || !user) {
    return { user: null, error: { error: 'Unauthorized' } };
  }
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) { 
      return { user: null, error: { error: 'Forbidden: Not an admin' } };
  }
  return { user };
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<AddTeamMemberApiResponse | UpdateTeamMemberApiResponse | RemoveTeamMemberApiResponse | ErrorResponse>
) {
  const adminCheck = await ensureAdmin(req);
  if (adminCheck.error || !adminCheck.user) {
    return res.status(adminCheck.error?.error === 'Unauthorized' ? 401 : 403).json(adminCheck.error!);
  }

  const supabaseAdmin = getSupabaseClient(); // Uses service role key

  try {
    if (req.method === 'POST') {
      const { team_id, user_id, role } = addTeamMemberRequestSchema.parse(req.body);
      const { data: member, error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert([{ team_id, user_id, roles: [role] }]) // Assuming 'role' is a string and 'roles' is an array in DB
        .select()
        .single();
      if (memberError) throw memberError;
      if (!member) throw new Error('Failed to add team member, no data returned.');
      
      const responseData = { member }; 
      // addTeamMemberResponseSchema.parse(responseData); // Uncomment if member type is well-defined in schema
      return res.status(201).json(responseData); // 201 for creation

    } else if (req.method === 'PUT') {
      const { id, role } = updateTeamMemberRequestSchema.parse(req.body);
      const { data: member, error: memberError } = await supabaseAdmin
        .from('team_members')
        .update({ roles: [role] }) // Assuming 'role' is a string and 'roles' is an array in DB
        .eq('id', id)
        .select()
        .single();
      if (memberError) throw memberError;
      if (!member) throw new Error('Failed to update team member, member not found or no data returned.');

      const responseData = { member }; 
      // updateTeamMemberResponseSchema.parse(responseData); // Uncomment if member type is well-defined
      return res.status(200).json(responseData);

    } else if (req.method === 'DELETE') {
      const { id } = removeTeamMemberRequestSchema.parse(req.body);
      const { error: memberError, count } = await supabaseAdmin
        .from('team_members')
        .delete({ count: 'exact' })
        .eq('id', id);
      if (memberError) throw memberError;
      if (count === 0) {
        const errResp: ErrorResponse = { error: 'Team member not found for deletion.' };
        return res.status(404).json(errResp);
      }
      
      const responseData = { success: true };
      removeTeamMemberResponseSchema.parse(responseData);
      return res.status(200).json(responseData);

    } else {
      res.setHeader('Allow', ['POST', 'PUT', 'DELETE']);
      const errorResponse: ErrorResponse = { error: `Method ${req.method} Not Allowed` };
      return res.status(405).json(errorResponse);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { 
        error: 'Invalid request body',
        // issues: error.issues 
      };
      return res.status(400).json(errorResponse);
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      // Check for Supabase specific errors like not found (PGRST116) for PUT/DELETE if needed
      if (error.message.includes('PGRST116')) { // No rows found
        return res.status(404).json({ error: 'Team member not found.' });
      }
      return res.status(500).json(errorResponse);
    }
    console.error('Error in admin/team-members API:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown internal server error occurred' };
    return res.status(500).json(errorResponse);
  }
} 