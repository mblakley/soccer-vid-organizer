import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { LeaguesListApiResponse } from '@/lib/types/leagues'
import type { ErrorResponse } from '@/lib/types/api'
import { leaguesListResponseSchema } from '@/lib/types/leagues'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<LeaguesListApiResponse>
  ) {
    if (req.method !== 'GET') {
      const errorResponse: ErrorResponse = {
        error: 'Method not allowed'
      }
      return res.status(405).json(errorResponse)
    }

    try {
      const supabase = await getSupabaseClient(req.headers.authorization)

      // Get all leagues
      const { data: leagues, error: leaguesError } = await supabase
        .from('leagues')
        .select('*')
        .order('name')

      if (leaguesError) {
        console.error('Error fetching leagues:', leaguesError)
        throw new Error(leaguesError.message)
      }

      const response = { leagues }
      leaguesListResponseSchema.parse(response)
      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in leagues handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 