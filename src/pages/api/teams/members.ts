import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { teamId } = req.query

  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' })
  }

  try {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        user:user_id (
          email
        )
      `)
      .eq('team_id', teamId)
      .eq('is_active', true)

    if (error) throw error

    return res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching team members:', error)
    return res.status(500).json({ error: 'Failed to fetch team members' })
  }
} 