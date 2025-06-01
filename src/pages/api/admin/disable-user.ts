import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/auth'
import type { DisableUserApiResponse } from '@/lib/types/admin'
import { disableUserRequestSchema, disableUserResponseSchema } from '@/lib/types/admin'
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
  res: NextApiResponse<DisableUserApiResponse>
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
    const { id, disabled } = disableUserRequestSchema.parse(req.body);
    
    const supabaseAdmin = getSupabaseClient(); // Uses service role key

    // Fetch current user_metadata first to preserve other metadata
    const { data: existingUserData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(id);
    if (fetchError || !existingUserData || !existingUserData.user) {
        console.error('Error fetching user to disable/enable:', fetchError);
        throw new Error(fetchError ? fetchError.message : 'User not found to disable/enable.');
    }
    const currentMetadata = existingUserData.user.user_metadata || {};

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { 
        user_metadata: { ...currentMetadata, disabled },
        // It's generally not recommended to toggle email_confirm like this based on disabled status.
        // email_confirm means the email address itself has been verified.
        // Disabling a user typically means preventing login, not un-verifying their email.
        // If disabled means they should re-verify upon re-enable, that's specific logic.
        // For now, removing the automatic toggling of email_confirm to avoid unintended side effects.
        // email_confirm: !disabled 
      }
    );

    if (updateError) {
      console.error('Error updating user disabled status:', updateError);
      throw new Error(`Failed to update user status: ${updateError.message}`);
    }

    const responseData = { success: true };
    disableUserResponseSchema.parse(responseData); // Validate response
    
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
      const statusCode = error.message.includes('User not found') ? 404 : 500;
      return res.status(statusCode).json(errorResponse);
    }
    console.error('Error in admin/disable-user API:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown internal server error occurred' };
    return res.status(500).json(errorResponse);
  }
} 