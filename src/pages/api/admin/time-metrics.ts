import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { TimeMetricsApiResponse } from '@/lib/types/admin'
import type { ErrorResponse } from '@/lib/types/auth' // Shared ErrorResponse
import { timeMetricsResponseSchema } from '@/lib/types/admin'
import { z } from 'zod'

// Helper function to check if user is admin - replace with your actual admin check logic
async function isUserAdmin(userId: string, supabaseClient: any): Promise<boolean> {
  // Example: Check a 'user_roles' table
  const { data, error } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  if (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
  return !!data;
  // Or, if using app_metadata: return user.app_metadata?.isAdmin === true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TimeMetricsApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    res.setHeader('Allow', ['GET']);
    return res.status(405).json(errorResponse);
  }

  try {
    const supabaseUserClient = getSupabaseClient(req.headers.authorization);
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

    if (authError || !user) {
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    // IMPORTANT: Implement robust admin check here
    const isAdmin = await isUserAdmin(user.id, supabaseUserClient); // Use user client for role check if RLS allows
    if (!isAdmin) {
      const errorResponse: ErrorResponse = { error: 'Forbidden: User is not an admin' };
      return res.status(403).json(errorResponse);
    }

    const supabaseAdmin = getSupabaseClient(); // Service role client for admin-level queries

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1)); // Adjust to Monday
    const startOfWeekISO = startOfWeek.toISOString();

    const { count: newUsersCount, error: usersError } = await supabaseAdmin
      .from('users') // Querying your public users table or auth.users directly
      .select('*' , { count: 'exact', head: true })
      .gte('created_at', startOfWeekISO);
    if (usersError) throw usersError;

    const { count: newClipsCount, error: clipsError } = await supabaseAdmin
      .from('clips')
      .select('*' , { count: 'exact', head: true })
      .gte('created_at', startOfWeekISO);
    if (clipsError) throw clipsError;

    const { count: newCommentsCount, error: commentsError } = await supabaseAdmin
      .from('comments')
      .select('*' , { count: 'exact', head: true })
      .gte('created_at', startOfWeekISO);
    if (commentsError) throw commentsError;

    // For unique logins, this might be slow on large audit logs without proper indexing.
    // A dedicated table or a more optimized query/materialized view might be better for production.
    const { data: logins, error: loginsError } = await supabaseAdmin
      .from('audit_log_entries') // This is auth.audit_log_entries
      .select('actor_id')
      .eq('action', 'login') // Ensure this action string is correct
      .gte('created_at', startOfWeekISO); // Use created_at if that's what you meant, or occurred_at
      // Note: Supabase might use 'timestamp' for audit logs, adjust field name if needed
    if (loginsError) throw loginsError;
    const uniqueLogins = new Set(logins?.map(l => l.actor_id) || []).size;

    const responseData: TimeMetricsResponse = {
      newUsers: newUsersCount || 0,
      newClips: newClipsCount || 0,
      newComments: newCommentsCount || 0,
      uniqueLogins
    };
    timeMetricsResponseSchema.parse(responseData);
    return res.status(200).json(responseData);

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { error: 'Invalid response data', /* issues: error.issues */ };
      return res.status(500).json(errorResponse);
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(500).json(errorResponse);
    }
    console.error('Error in time-metrics handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 