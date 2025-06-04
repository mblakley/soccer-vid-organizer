import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { z } from 'zod'
import { teamSchema } from '@/lib/types/teams'
import { withAdminAuth } from '@/lib/api/admin'

// Define the response schema
const listTeamsResponseSchema = z.object({
  teams: z.array(teamSchema)
})

type ListTeamsApiResponse = z.infer<typeof listTeamsResponseSchema> | { error: string }

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListTeamsApiResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)

    // Fetch teams from Supabase
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching teams:', error)
      throw new Error(error.message)
    }

    // Validate the response data
    const validatedTeams = listTeamsResponseSchema.parse({ teams })

    return res.status(200).json(validatedTeams)

  } catch (error: any) {
    console.error('Error in teams/list handler:', error)
    const statusCode = error.message?.includes('Unauthorized') ? 401 : 500
    return res.status(statusCode).json({ error: error.message || 'An unknown internal server error occurred' })
  }
}

export default withAdminAuth(handler) 