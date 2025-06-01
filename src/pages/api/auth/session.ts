import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/auth'
import { z } from 'zod'

const sessionResponseSchema = z.object({
  session: z.object({
    user: z.object({
      id: z.string(),
      email: z.string().email().optional(),
      user_metadata: z.record(z.any()).optional()
    }).optional()
  }).nullable()
})

export type SessionResponse = z.infer<typeof sessionResponseSchema>
export type SessionApiResponse = SessionResponse | ErrorResponse

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' }
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      const errorResponse: ErrorResponse = { error: sessionError.message }
      return res.status(401).json(errorResponse)
    }

    const responseData = { session: session || null }
    sessionResponseSchema.parse(responseData)
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
    console.error('Error in auth/session handler:', error)
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' }
    return res.status(500).json(errorResponse)
  }
} 