import { NextApiRequest, NextApiResponse } from 'next'
import { withApiAuth } from '@/lib/auth'
import { getSupabaseClient } from '@/lib/supabaseClient'

interface PlayersListResponse {
  players?: any[];
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<PlayersListResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('last_name', { ascending: true })

    if (error) {
      console.error('Error fetching players:', error)
      return res.status(500).json({ message: error.message })
    }

    return res.status(200).json({ players: data || [] })
  } catch (err: any) {
    console.error('Exception fetching players:', err)
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' })
  }
}

export default withApiAuth(handler, {
  allowUnauthenticated: false
}) 