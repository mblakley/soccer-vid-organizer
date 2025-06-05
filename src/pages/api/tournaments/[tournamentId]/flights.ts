import { NextApiRequest, NextApiResponse } from 'next'
import { withApiAuth } from '@/lib/auth'
import { getSupabaseClient } from '@/lib/supabaseClient'

interface TournamentFlightsResponse {
  flights?: any[];
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<TournamentFlightsResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { tournamentId } = req.query

  if (!tournamentId || typeof tournamentId !== 'string') {
    return res.status(400).json({ message: 'Tournament ID is required' })
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)
    const { data, error } = await supabase
      .from('tournament_flights')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching tournament flights:', error)
      return res.status(500).json({ message: error.message })
    }

    return res.status(200).json({ flights: data || [] })
  } catch (err: any) {
    console.error('Exception fetching tournament flights:', err)
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' })
  }
}

export default withApiAuth(handler, {
  allowUnauthenticated: false
}) 