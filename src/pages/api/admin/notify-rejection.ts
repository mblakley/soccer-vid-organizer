import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { sendTeamNotificationEmail } from '@/lib/emailClient'
import type { NotifyRejectionApiResponse } from '@/lib/types/admin'
import type { ErrorResponse } from '@/lib/types/auth'
import {
  notifyRejectionRequestSchema,
  notifyRejectionResponseSchema
} from '@/lib/types/admin'
import { z } from 'zod'

// Placeholder for admin check - replace with your actual implementation
async function ensureAdmin(req: NextApiRequest): Promise<{ user: any; error?: ErrorResponse }> {
  const supabaseUserClient = getSupabaseClient(req.headers.authorization);
  const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
  if (authError || !user) {
    return { user: null, error: { error: 'Unauthorized' } };
  }
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) { // Example, replace!
      return { user: null, error: { error: 'Forbidden: Not an admin' } };
  }
  return { user };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NotifyRejectionApiResponse>
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
    // roles and request_type are in schema to match original body, but not used by sendTeamNotificationEmail directly
    const { email, team_name } = notifyRejectionRequestSchema.parse(req.body);

    // The original code passed an empty string for team_id for rejections.
    // This might need to be handled differently by sendTeamNotificationEmail or a specific rejection email function.
    const result = await sendTeamNotificationEmail(email, team_name, '' /* team_id for rejection? */);
    
    const responseData = { message: 'Rejection notification sent successfully', messageId: result?.messageId };
    notifyRejectionResponseSchema.parse(responseData);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error sending rejection notification:', error);
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { error: 'Invalid request body', /* issues: error.issues */ };
      return res.status(400).json(errorResponse);
    }
    const errResp: ErrorResponse = { error: error instanceof Error ? error.message : 'An error occurred' };
    return res.status(500).json(errResp);
  }
} 