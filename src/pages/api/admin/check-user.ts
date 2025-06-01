import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/auth'
import type { CheckUserApiResponse, CheckUserResponse } from '@/lib/types/admin'
import { checkUserRequestSchema, checkUserResponseSchema } from '@/lib/types/admin'
import { z } from 'zod'

// Placeholder for admin check - replace with your actual implementation
async function ensureAdmin(req: NextApiRequest): Promise<{ user: any; error?: ErrorResponse }> {
  const supabaseUserClient = getSupabaseClient(req.headers.authorization);
  const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    return { user: null, error: { error: 'Unauthorized' } };
  }
  // Example admin check (replace with your logic, e.g., from a user_roles table or custom claims)
  // This should be a robust check, not just by email in production.
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) { 
      return { user: null, error: { error: 'Forbidden: Not an admin' } };
  }
  return { user };
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<CheckUserApiResponse>
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
    const { email, teamId } = checkUserRequestSchema.parse(req.body);
    
    const supabaseAdmin = getSupabaseClient(); // Uses service role key by default
    
    const { data: usersResponse, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error('Error fetching users:', listUsersError);
      throw new Error(`Failed to fetch users: ${listUsersError.message}`);
    }

    const existingUser = usersResponse.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    let responseData: CheckUserResponse;

    if (existingUser) {
      const { data: existingMember, error: memberError } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', existingUser.id)
        .eq('is_active', true) // Assuming you only care about active members
        .maybeSingle(); // Use maybeSingle to handle no rows gracefully

      if (memberError) {
        console.error('Error checking team membership:', memberError);
        throw new Error(`Failed to check team membership: ${memberError.message}`);
      }

      if (existingMember) {
        responseData = {
          exists: true,
          isTeamMember: true,
          user: {
            id: existingUser.id,
            email: existingUser.email!,
            name: existingUser.user_metadata?.full_name || existingUser.email?.split('@')[0] || 'N/A'
          }
        };
      } else {
        responseData = {
          exists: true,
          isTeamMember: false,
          user: {
            id: existingUser.id,
            email: existingUser.email!,
            name: existingUser.user_metadata?.full_name || existingUser.email?.split('@')[0] || 'N/A'
          }
        };
      }
    } else {
      responseData = { 
        exists: false,
        isTeamMember: false
      };
    }
    checkUserResponseSchema.parse(responseData); // Validate response before sending
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
      return res.status(500).json(errorResponse); // Default to 500 for other internal errors
    }
    console.error('Error in check-user API:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown internal server error occurred' };
    return res.status(500).json(errorResponse);
  }
} 