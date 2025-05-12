import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_id, team_name, description } = req.body

    if (!user_id || !team_name) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Create team request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('team_requests')
      .insert([{
        user_id,
        team_name,
        description,
        status: 'pending'
      }])
      .select()
      .single()

    if (requestError) {
      throw requestError
    }

    // Add user to pending team
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert([{
        team_id: '00000000-0000-0000-0000-000000000000', // Pending team ID
        user_id,
        role: 'pending'
      }])

    if (memberError) {
      throw memberError
    }

    res.status(201).json(request)
  } catch (error: any) {
    console.error('Error creating team request:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 