import type { NextApiRequest, NextApiResponse } from 'next'
import type { AuthSubscriptionResponse, ErrorResponse } from '@/lib/types/auth'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { z } from 'zod'

// Define a Zod schema for the response
const authSubscriptionResponseSchema = z.object({
  subscription: z.any().nullable(), // Supabase subscription can be complex or null
  error: z.string().optional()
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthSubscriptionResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)

    // Get the current session which contains subscription-like information if needed
    // or directly call a specific Supabase function if you are trying to get a 
    // specific kind of subscription (e.g., for real-time)
    // For auth state, getSession() or getUser() is more appropriate.
    // This endpoint as named "subscription" might be misleading if it's just auth status.
    // Assuming the intent is to check if there's an active auth subscription (session)
    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Error getting session:', sessionError);
      throw new Error(sessionError.message);
    }

    // The { data: { subscription } } = supabaseClient.auth.onAuthStateChange(...)
    // was incorrect for an API route. onAuthStateChange is for client-side listeners.
    // If the goal is to return the session (which acts like an auth subscription):
    const responseData: AuthSubscriptionResponse = {
      // A session object can be considered an active "auth subscription"
      // If you are referring to something else like real-time subscriptions,
      // this would need to be handled differently.
      subscription: data.session as any // Cast to any if session type is not directly assignable
    };

    authSubscriptionResponseSchema.parse(responseData); // Validate response
    return res.status(200).json(responseData)

  } catch (error) {
    if (error instanceof Error) {
      const statusCode = error.message === 'Missing or invalid authorization header' ? 401 : 500;
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      return res.status(statusCode).json(errorResponse)
    }
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    console.error('Error in subscription handler:', error)
    return res.status(500).json(errorResponse)
  }
} 