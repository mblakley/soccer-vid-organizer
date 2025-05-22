import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if user is admin
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Get the start of this week
    const startOfWeek = new Date()
    startOfWeek.setHours(0, 0, 0, 0)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

    // Convert to ISO string for Supabase queries
    const startOfWeekISO = startOfWeek.toISOString()

    // Get new users this week
    const { data: newUsers, error: usersError } = await supabase
      .from('auth.users')
      .select('created_at')
      .gte('created_at', startOfWeekISO)

    if (usersError) throw usersError

    // Get new clips this week
    const { data: newClips, error: clipsError } = await supabase
      .from('clips')
      .select('created_by')
      .gte('created_at', startOfWeekISO)

    if (clipsError) throw clipsError

    // Get new comments this week
    const { data: newComments, error: commentsError } = await supabase
      .from('comments')
      .select('created_at')
      .gte('created_at', startOfWeekISO)

    if (commentsError) throw commentsError

    // Get unique logins this week (this requires auth.audit_log_entries which might need to be enabled)
    const { data: logins, error: loginsError } = await supabase
      .from('auth.audit_log_entries')
      .select('actor_id')
      .eq('action', 'login')
      .gte('occurred_at', startOfWeekISO)
      .order('actor_id')

    if (loginsError) throw loginsError

    // Count unique logins
    const uniqueLogins = new Set(logins?.map(login => login.actor_id)).size

    return res.status(200).json({
      newUsers: newUsers?.length || 0,
      uniqueLogins: uniqueLogins,
      newClips: newClips?.length || 0,
      newComments: newComments?.length || 0
    })
  } catch (error) {
    console.error('Error fetching time metrics:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 