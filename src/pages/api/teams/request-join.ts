import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { team_id, user_id, requested_roles } = req.body

    if (!team_id || !user_id || !requested_roles) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Create team member request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('team_member_requests')
      .insert([{
        team_id,
        user_id,
        requested_roles,
        status: 'pending'
      }])
      .select()
      .single()

    if (requestError) {
      throw requestError
    }

    res.status(201).json(request)
  } catch (error: any) {
    console.error('Error creating team join request:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 