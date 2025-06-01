import type { NextApiRequest } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface AdminCheckResult {
  user?: any; // Replace 'any' with your actual User type from Supabase if available
  error?: string;
  status?: number;
}

/**
 * Ensures the current user is an admin.
 * Reads the Authorization header from the request to get the user.
 * Checks if the user's email matches the admin email from environment variables.
 */
export async function ensureAdmin(req: NextApiRequest): Promise<AdminCheckResult> {
  const supabaseUserClient = getSupabaseClient(req.headers.authorization);
  const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

  if (authError) {
    console.error('Admin Auth Error:', authError.message);
    return { error: 'Authentication token is invalid or expired.', status: 401 };
  }
  if (!user) {
    return { error: 'Unauthorized: No user session found.', status: 401 };
  }

  // Replace with your actual admin check logic 
  // (e.g., check a role in user_roles table or app_metadata like user.app_metadata.roles.includes('admin'))
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) { 
    return { user, error: 'Forbidden: Admin access required.', status: 403 };
  }
  
  return { user }; // User is admin
} 