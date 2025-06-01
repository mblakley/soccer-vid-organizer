import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole } from '@/lib/types'; // Assuming some types might be relevant

// Define expected request body if any, and response structure
interface AttendanceStatsParams {
  time_range: 'week' | 'month' | 'season';
}

// This should match the structure returned by your Supabase RPC
interface AttendanceStat {
  player_id: string;
  player_name: string;
  total_games: number;
  games_attended: number;
  attendance_rate: number;
}

interface RpcAttendanceStatsResponse {
  stats?: AttendanceStat[];
  message?: string;
}

// Use a user-context client if the RPC function depends on the calling user's permissions or ID
// const supabase = getSupabaseClient(req.headers.authorization); 
// Otherwise, a service client might be fine if RLS is handled by the RPC or it's public data.
const supabase = getSupabaseClient();

async function handler(req: NextApiRequest, res: NextApiResponse<RpcAttendanceStatsResponse>) {
  if (req.method !== 'POST') { // Supabase RPCs are typically called via POST
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { time_range } = req.body as AttendanceStatsParams;

  if (!time_range || !['week', 'month', 'season'].includes(time_range)) {
    return res.status(400).json({ message: 'Invalid or missing time_range parameter. Must be one of: week, month, season.' });
  }

  try {
    const { data, error } = await supabase.rpc('get_attendance_stats', { time_range });

    if (error) {
      console.error('Error calling get_attendance_stats RPC:', error);
      return res.status(500).json({ message: error.message || 'Failed to fetch attendance stats via RPC' });
    }

    // The data from RPC might be directly the array or nested. Adjust as per your RPC's actual return.
    return res.status(200).json({ stats: data as AttendanceStat[] || [] });

  } catch (err: any) {
    console.error('Exception calling RPC:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth based on who should be able to call this RPC endpoint
export default withAuth(handler, {
  teamId: 'any', // Or specific team if stats are team-gated
  roles: ['coach', 'manager'] as TeamRole[], // Example: only coaches/managers can see stats
  requireRole: true,
}); 