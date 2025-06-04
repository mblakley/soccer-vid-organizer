import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ReviewApiResponse } from '@/lib/types/reviews'
import type { ErrorResponse } from '@/lib/types/api'
import { reviewResponseSchema } from '@/lib/types/reviews'
import { z } from 'zod'

// Schema for query parameters
const queryParamsSchema = z.object({
  id: z.string().uuid('Invalid review ID format') // Assuming review ID is a UUID
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReviewApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    const queryValidation = queryParamsSchema.safeParse(req.query);
    if (!queryValidation.success) {
      const errorResponse: ErrorResponse = { 
        error: 'Invalid review ID in URL',
        // Optionally include Zod issues: issues: queryValidation.error.issues 
      };
      return res.status(400).json(errorResponse);
    }
    const { id } = queryValidation.data;

    const supabase = await getSupabaseClient(req.headers.authorization)

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('Error getting user:', userError)
      // Ensure consistent error throwing to be caught by the generic handler
      throw new Error(userError.message)
    }

    if (!user) {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized'
      }
      return res.status(401).json(errorResponse)
    }

    // Fetch the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single()

    if (reviewError) {
      console.error('Error fetching review:', reviewError)
      // Handle cases like review not found (PGRST116) more specifically if needed
      if (reviewError.code === 'PGRST116') { // PostgREST error for no rows found
        const errorResponse: ErrorResponse = { error: 'Review not found' };
        return res.status(404).json(errorResponse);
      }
      throw new Error(reviewError.message)
    }
    if (!review) { // Safeguard if single() returns null without error (should not happen with PGRST116)
        const errorResponse: ErrorResponse = { error: 'Review not found' };
        return res.status(404).json(errorResponse);
    }

    const response = { review }
    reviewResponseSchema.parse(response)
    return res.status(200).json(response)
  } catch (error) {
    if (error instanceof z.ZodError) { // Catch Zod errors from query validation
      const errorResponse: ErrorResponse = { 
        error: 'Invalid request parameters',
        // issues: error.issues 
      };
      return res.status(400).json(errorResponse);
    }
    if (error instanceof Error) {
      // Distinguish between client errors and server errors where possible
      const statusCode = (error.message === 'Unauthorized' || error.message.includes('Invalid authorization header')) ? 401 : 
                         (error.message === 'Review not found') ? 404 : 400; // Default to 400 for other client errors
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      return res.status(statusCode).json(errorResponse)
    }
    console.error('Error in review handler:', error)
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    return res.status(500).json(errorResponse)
  }
} 