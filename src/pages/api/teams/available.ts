import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all teams
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, name, description')
      .order('name')

    if (teamsError) {
      throw teamsError
    }

    res.status(200).json(teams)
  } catch (error: any) {
    console.error('Error fetching available teams:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 