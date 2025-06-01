import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/auth'
import { z } from 'zod'

const dashboardStatsResponseSchema = z.object({
  totalUsers: z.number(),
  adminUsers: z.number(),
  disabledUsers: z.number(),
  totalTeams: z.number(),
  activeTeams: z.number(),
  totalTeamMembers: z.number(),
  pendingJoinRequests: z.number(),
  pendingRoleRequests: z.number(),
  totalLeagues: z.number(),
  totalTournaments: z.number()
})

export type DashboardStatsResponse = z.infer<typeof dashboardStatsResponseSchema>
export type DashboardStatsApiResponse = DashboardStatsResponse | ErrorResponse

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardStatsApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' }
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      const errorResponse: ErrorResponse = { error: 'Unauthorized' }
      return res.status(401).json(errorResponse)
    }

    // Verify admin status
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole?.is_admin) {
      const errorResponse: ErrorResponse = { error: 'Forbidden: Admin access required' }
      return res.status(403).json(errorResponse)
    }

    // Fetch all stats in parallel
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

    const teamMemberUserIds = new Set(teamMembers?.map(member => member.user_id) || [])
    const adminUserIds = new Set(adminUsers?.map(admin => admin.user_id) || [])

    const responseData = {
      totalUsers: users?.users.filter(u => 
        !u.email?.startsWith('temp_') || 
        !u.email?.endsWith('@placeholder.com') || 
        teamMemberUserIds.has(u.id)
      ).length || 0,
      adminUsers: users?.users.filter(u => adminUserIds.has(u.id)).length || 0,
      disabledUsers: users?.users.filter(u => u.user_metadata?.disabled).length || 0,
      totalTeams: teams?.length || 0,
      activeTeams: teams?.filter(t => t.club_affiliation !== 'System').length || 0,
      totalTeamMembers: teamMembers?.length || 0,
      pendingJoinRequests: joinRequests?.length || 0,
      pendingRoleRequests: roleRequests?.length || 0,
      totalLeagues: leaguesCount || 0,
      totalTournaments: tournamentsCount || 0
    }

    dashboardStatsResponseSchema.parse(responseData)
    return res.status(200).json(responseData)

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { error: 'Response validation failed' }
      return res.status(500).json(errorResponse)
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message }
      return res.status(500).json(errorResponse)
    }
    console.error('Error in admin/dashboard-stats handler:', error)
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' }
    return res.status(500).json(errorResponse)
  }
} 