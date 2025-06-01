import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient' 
import { sendInvitationEmail } from '@/lib/emailClient'
import type { ErrorResponse } from '@/lib/types/auth'
import type { InviteUserApiResponse } from '@/lib/types/admin'
import { inviteUserRequestSchema, inviteUserResponseSchema } from '@/lib/types/admin'
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
  res: NextApiResponse<InviteUserApiResponse>
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
    const { email, team_id, team_name } = inviteUserRequestSchema.parse(req.body);
    
    const supabaseAdmin = getSupabaseClient(); // Uses service role key

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = new URL('/login', appUrl);
    redirectTo.searchParams.set('team_id', team_id);
    // Potentially add other parameters like invite_token if needed for tracking or specific UX

    // Generate a password recovery link which serves as an invite link for new users
    // or password reset for existing users to join the team.
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', // or 'recovery' or 'invite' depending on desired UX
      email,
      options: {
        redirectTo: redirectTo.toString()
      }
    });

    if (linkError) {
      console.error('Error generating invitation link:', linkError);
      throw new Error(`Failed to generate invitation link: ${linkError.message}`);
    }

    if (!data || !data.properties || !data.properties.action_link) {
        console.error('Error generating invitation link: No action_link returned');
        throw new Error('Failed to get invitation link from Supabase.');
    }

    const result = await sendInvitationEmail(
      email,
      team_name,
      data.properties.action_link
    );

    const responseData = { 
      message: 'Invitation sent successfully',
      messageId: result.messageId
    };
    inviteUserResponseSchema.parse(responseData); // Validate response

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
      return res.status(500).json(errorResponse);
    }
    console.error('Error in admin/invite-user API:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown internal server error occurred' };
    return res.status(500).json(errorResponse);
  }
} 