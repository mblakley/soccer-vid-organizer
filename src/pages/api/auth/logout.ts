import type { NextApiRequest, NextApiResponse } from 'next'
import type { SignoutApiResponse, ErrorResponse } from '@/lib/types/auth'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { signoutResponseSchema } from '@/lib/types/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SignoutApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)

    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Error logging out:', error)
      throw new Error(error.message)
    }

    const responseData = { success: true };
    signoutResponseSchema.parse(responseData);

    return res.status(200).json(responseData)
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      return res.status(error.message === 'Missing or invalid authorization header' || error.message.includes('session not found') ? 401 : 400).json(errorResponse)
    }
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    console.error('Error in logout handler:', error)
    return res.status(500).json(errorResponse)
  }
} 