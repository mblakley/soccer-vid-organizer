import type { NextApiRequest, NextApiResponse } from 'next'
import type { AuthSessionApiResponse, ErrorResponse } from '@/lib/types/auth'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { authSessionResponseSchema } from '@/lib/types/auth'
import { AuthResponse } from '@supabase/supabase-js'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthSessionApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)

    const { data, error }: AuthResponse = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('Error refreshing session:', error)
      throw new Error(error.message)
    }

    const responseData = { session: data?.session ?? null, user: data?.user ?? null };
    const validatedResponseData = { session: data?.session ?? null };
    authSessionResponseSchema.parse(validatedResponseData);

    return res.status(200).json(validatedResponseData)
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      return res.status(error.message.includes('Invalid Refresh Token') || error.message.includes('Token not found') ? 401 : 400).json(errorResponse)
    }
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    console.error('Error in refresh-session handler:', error)
    return res.status(500).json(errorResponse)
  }
} 