import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // First, let's check if we can access the table
    const { data: testData, error: testError } = await supabase
      .from('team_member_requests')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('Error accessing team_member_requests table:', testError)
      return res.status(500).json({ 
        error: 'Failed to access team_member_requests table',
        details: testError
      })
    }

    // Now try the full query
    const { data, error } = await supabase
      .from('team_member_requests')
      .select(`
        id,
        user_id,
        team_id,
        requested_roles,
        status,
        created_at,
        updated_at,
        reviewed_by,
        reviewed_at,
        auth.users!user_id (
          email
        ),
        teams!team_id (
          name
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching team member requests:', error)
      return res.status(500).json({ 
        error: 'Failed to fetch team member requests',
        details: error
      })
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('Unexpected error in team member requests API:', error)
    return res.status(500).json({ 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 