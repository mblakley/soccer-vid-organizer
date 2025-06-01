import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { sendTeamNotificationEmail } from '@/lib/emailClient'
import type { ErrorResponse } from '@/lib/types/auth'
import type { NotifyTeamMemberApiResponse } from '@/lib/types/admin'
import { notifyTeamMemberRequestSchema, notifyTeamMemberResponseSchema } from '@/lib/types/admin'
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
  res: NextApiResponse<NotifyTeamMemberApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    res.setHeader('Allow', ['POST']);
    return res.status(405).json(errorResponse);
  }

  // Admin check: Ensure only admins can call this sensitive endpoint
  const adminCheck = await ensureAdmin(req);
  if (adminCheck.error || !adminCheck.user) {
    return res.status(adminCheck.error?.error === 'Unauthorized' ? 401 : 403).json(adminCheck.error!);
  }

  try {
    const { email, team_id, team_name } = notifyTeamMemberRequestSchema.parse(req.body);

    const result = await sendTeamNotificationEmail(email, team_name, team_id);
    
    const responseData = { 
      message: 'Notification sent successfully', 
      messageId: result.messageId 
    };
    notifyTeamMemberResponseSchema.parse(responseData); // Validate response

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
    console.error('Error in admin/notify-team-member API:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown internal server error occurred' };
    return res.status(500).json(errorResponse);
  }
} 