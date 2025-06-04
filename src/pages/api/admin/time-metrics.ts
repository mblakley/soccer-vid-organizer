import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { TimeMetricsApiResponse, TimeMetricsResponse } from '@/lib/types/admin'
import type { ErrorResponse } from '@/lib/types/api'
import { timeMetricsResponseSchema } from '@/lib/types/admin'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<TimeMetricsApiResponse>
  ) {
    if (req.method !== 'GET') {
      const errorResponse: ErrorResponse = { error: 'Method not allowed' }
      res.setHeader('Allow', ['GET'])
      return res.status(405).json(errorResponse)
    }

    try {
      console.log('[DashboardStats] Request headers:', {
        authorization: req.headers.authorization ? 'Bearer [REDACTED]' : 'missing',
        'content-type': req.headers['content-type']
      })

      const supabase = await getSupabaseClient(req.headers.authorization)

      // Fetch all stats in parallel
      console.log('[DashboardStats] Fetching stats...')
      const [
        { data: users },
        { data: teams },
        { data: teamMembers },
        { data: joinRequests },
        { data: roleRequests },
        { count: leaguesCount },
        { count: tournamentsCount },
        { data: adminUsers }
      ] = await Promise.all([
        supabase.auth.admin.listUsers(),
        supabase.from('teams').select('id, club_affiliation').neq('club_affiliation', 'System'),
        supabase.from('team_members').select('id, is_active, user_id').eq('is_active', true),
        supabase.from('team_member_requests').select('id').eq('status', 'pending'),
        supabase.from('team_member_role_requests').select('id').eq('status', 'pending'),
        supabase.from('leagues').select('id', { count: 'exact', head: true }),
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('user_id').eq('is_admin', true)
      ])

      const response: TimeMetricsResponse = {
        newUsers: users?.users.length || 0,
        newClips: 0, // TODO: Implement clip counting
        newComments: 0, // TODO: Implement comment counting
        uniqueLogins: users?.users.filter(u => u.last_sign_in_at).length || 0
      }

      timeMetricsResponseSchema.parse(response)
      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in time-metrics handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 