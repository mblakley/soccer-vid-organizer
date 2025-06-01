import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/auth'

export type SignOutApiResponse = { success: boolean } | ErrorResponse

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SignOutApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' }
    res.setHeader('Allow', ['POST'])
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)
    const { error } = await supabase.auth.signOut()

    if (error) {
      const errorResponse: ErrorResponse = { error: error.message }
      return res.status(500).json(errorResponse)
    }

    return res.status(200).json({ success: true })

  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message }
      return res.status(500).json(errorResponse)
    }
    console.error('Error in auth/signout handler:', error)
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' }
    return res.status(500).json(errorResponse)
  }
} 