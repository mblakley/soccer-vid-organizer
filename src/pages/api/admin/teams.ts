import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (roleError) throw roleError

    if (!userRole?.is_admin) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Fetch teams with member counts
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members (
          id,
          user_id,
          role,
          users (
            email
          )
        )
      `)
      .order('name')

    if (teamsError) throw teamsError

    // Transform the data to include member counts
    const transformedTeams = teams.map(team => ({
      ...team,
      member_count: team.members?.length || 0
    }))

    res.status(200).json(transformedTeams)
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 