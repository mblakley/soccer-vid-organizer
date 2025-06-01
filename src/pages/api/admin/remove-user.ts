import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/auth'
import type { RemoveUserApiResponse } from '@/lib/types/admin'
import { removeUserRequestSchema, removeUserResponseSchema } from '@/lib/types/admin'
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
  res: NextApiResponse<RemoveUserApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    res.setHeader('Allow', ['POST']);
    return res.status(405).json(errorResponse);
  }

  const adminCheck = await ensureAdmin(req);
  if (adminCheck.error || !adminCheck.user) {
    return res.status(adminCheck.error?.error === 'Unauthorized' ? 401 : 403).json(adminCheck.error!);
  }

  try {
    const { id } = removeUserRequestSchema.parse(req.body);
    
    const supabaseAdmin = getSupabaseClient(); // Uses service role key

    // It's often better to handle related data deletion via database triggers or cascade deletes if possible.
    // Performing multiple delete operations here can lead to partial deletions if one fails.

    // 1. Delete user's team memberships (handle error but try to continue if non-critical)
    const { error: teamMemberError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('user_id', id);
    if (teamMemberError) {
      console.error('Error deleting user\'s team memberships:', teamMemberError);
      // Decide if this is a critical failure or if user deletion should proceed.
      // For this example, we log and continue, but this might need transactional handling.
    }

    // 2. Delete user's roles (handle error but try to continue)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles') // Assuming 'user_roles' is your table for app-specific roles
      .delete()
      .eq('user_id', id);
    if (roleError) {
      console.error('Error deleting user\'s roles:', roleError);
    }

    // 3. Delete user from auth.users (this should be the last step ideally)
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteAuthUserError) {
      console.error('Error deleting user from auth schema:', deleteAuthUserError);
      // Check if the error is because the user was already deleted or not found
      if (deleteAuthUserError.message.includes('User not found')) {
        // If other deletions were successful, this might still be considered a success overall.
        // However, if team_members or user_roles failed, and user also not found, it points to issues.
        const errorResponse: ErrorResponse = { error: 'User not found in auth, may have already been removed.' };
        return res.status(404).json(errorResponse); 
      }
      throw new Error(`Failed to delete user from auth: ${deleteAuthUserError.message}`);
    }

    const responseData = { success: true };
    removeUserResponseSchema.parse(responseData); // Validate response
    
    return res.status(200).json(responseData);

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
      // Adjust status code if a specific error type (like 404) was intended to be propagated here
      return res.status(res.statusCode && res.statusCode !== 200 && res.statusCode !== 404 ? res.statusCode : 500).json(errorResponse);
    }
    console.error('Error in admin/remove-user API:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown internal server error occurred' };
    return res.status(500).json(errorResponse);
  }
} 