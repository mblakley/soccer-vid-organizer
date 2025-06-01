import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/auth'
import { z } from 'zod'

const teamStatsResponseSchema = z.object({
  stats: z.object({
    wins: z.number(),
    losses: z.number(),
    draws: z.number(),
    goals_scored: z.number(),
    goals_against: z.number(),
    clean_sheets: z.number()
  }),
  injuries: z.array(z.object({
    id: z.string(),
    player_name: z.string(),
    injury_type: z.string(),
    expected_return_date: z.string(),
    status: z.enum(['active', 'recovered']),
    notes: z.string().optional()
  }))
})

export type TeamStatsResponse = z.infer<typeof teamStatsResponseSchema>
export type TeamStatsApiResponse = TeamStatsResponse | ErrorResponse

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TeamStatsApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' }
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      const errorResponse: ErrorResponse = { error: 'Unauthorized' }
      return res.status(401).json(errorResponse)
    }

    const teamId = req.query.teamId as string
    if (!teamId) {
      const errorResponse: ErrorResponse = { error: 'Team ID is required' }
      return res.status(400).json(errorResponse)
    }

    // Fetch team stats
    const { data: statsData, error: statsError } = await supabase
      .from('team_stats')
      .select('*')
      .eq('team_id', teamId)
      .single()

    if (statsError) throw statsError

    // Fetch injuries
    const { data: injuriesData, error: injuriesError } = await supabase
      .from('team_injuries')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('expected_return_date', { ascending: true })

    if (injuriesError) throw injuriesError

    const responseData = {
      stats: statsData || {
        wins: 0,
        losses: 0,
        draws: 0,
        goals_scored: 0,
        goals_against: 0,
        clean_sheets: 0
      },
      injuries: injuriesData || []
    }

    teamStatsResponseSchema.parse(responseData)
    return res.status(200).json(responseData)

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { error: 'Response validation failed' }
      return res.status(500).json(errorResponse)
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message }
      return res.status(500).json(errorResponse)
    }
    console.error('Error in team/stats handler:', error)
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' }
    return res.status(500).json(errorResponse)
  }
} 