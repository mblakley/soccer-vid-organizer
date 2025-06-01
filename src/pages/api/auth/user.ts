import type { NextApiRequest, NextApiResponse } from 'next'
// UserResponse from @supabase/supabase-js is a generic, let's be more specific if needed or use SupabaseUser
// import type { UserResponse } from '@supabase/supabase-js' 
import type { User as SupabaseUser } from '@supabase/supabase-js' // Or from '@supabase/auth-helpers-nextjs'
import type { GetUserApiResponse, ErrorResponse } from '@/lib/types/auth'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { getUserResponseSchema } from '@/lib/types/auth' // Import the schema

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetUserApiResponse> // Use GetUserApiResponse
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting user:', error)
      throw new Error(error.message)
    }

    if (!user) {
        // This case should ideally be handled by the auth.getUser() error, 
        // but as a safeguard if user is null without an error:
        const errorResponse: ErrorResponse = {
            error: 'User not found or not authenticated'
        }
        return res.status(401).json(errorResponse)
    }

    // Construct the response data according to the schema
    const responseData = { user };
    getUserResponseSchema.parse(responseData) // Validate the response

    return res.status(200).json(responseData)
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      // Distinguish between client errors (e.g., bad request, unauthorized) and server errors
      return res.status(error.message === 'Missing or invalid authorization header' ? 401 : 400).json(errorResponse) 
    }
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    console.error('Error in user handler:', error)
    return res.status(500).json(errorResponse)
  }
} 