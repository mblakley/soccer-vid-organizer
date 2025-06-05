import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withApiAuth } from '@/lib/auth';
import { TeamRole } from '@/lib/types/auth';

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
// const supabase = await getSupabaseClient(req.headers.authorization); 
// Otherwise, a service client might be fine if RLS is handled by the RPC or it's public data.

async function handler(req: NextApiRequest, res: NextApiResponse<RpcAttendanceStatsResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const timeRange = req.query.timeRange as string || '30d';

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);
    const { data, error } = await supabase.rpc('get_attendance_stats', { time_range: timeRange });

    if (error) {
      console.error('Error fetching attendance stats:', error);
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ stats: data });
  } catch (err: any) {
    console.error('Exception fetching attendance stats:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth based on who should be able to call this RPC endpoint
export default withApiAuth(handler, {
  allowUnauthenticated: false
}); 