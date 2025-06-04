import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { withApiAuth } from '@/lib/auth'
import type { Tournament } from '@/lib/types/tournaments'
import type { ErrorResponse } from '@/lib/types/api'

interface ListTournamentsResponse {
  tournaments: Tournament[];
  message?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListTournamentsResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' }
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)
    
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching tournaments:', error)
      throw new Error(error.message)
    }

    return res.status(200).json({ tournaments: tournaments || [] })
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      return res.status(400).json(errorResponse)
    }
    console.error('Error in tournaments list handler:', error)
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    return res.status(500).json(errorResponse)
  }
}

export default withApiAuth(handler, { isUserAdmin: true }) 