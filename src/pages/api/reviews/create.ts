import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { CreateReviewApiResponse } from '@/lib/types/reviews'
import type { ErrorResponse } from '@/lib/types/api'
import { createReviewRequestSchema, createReviewResponseSchema } from '@/lib/types/reviews'
import { z } from 'zod'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateReviewApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    res.setHeader('Allow', ['POST']);
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('Error getting user:', userError)
      throw new Error(userError.message)
    }

    if (!user) {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized'
      }
      return res.status(401).json(errorResponse)
    }

    const reviewRequest = createReviewRequestSchema.parse(req.body)

    const reviewToInsert = {
      title: reviewRequest.title,
      description: reviewRequest.description,
      team_id: reviewRequest.team_id,
      user_id: user.id,
      status: 'new',
      rating: 0,
    };

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert(reviewToInsert)
      .select()
      .single()

    if (reviewError) {
      console.error('Error creating review:', reviewError)
      if (reviewError.code === '23505') {
        const errorResponse: ErrorResponse = { error: 'Review creation failed due to a conflict.' };
        return res.status(409).json(errorResponse);
      }
      throw new Error(reviewError.message)
    }
    if (!review) {
        throw new Error('Review creation did not return data.');
    }

    const response = { success: true, review }
    createReviewResponseSchema.parse(response)
    return res.status(201).json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request body',
      }
      return res.status(400).json(errorResponse)
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      const statusCode = 
        error.message === 'Unauthorized' || error.message.includes('authorization') ? 401 :
        error.message.includes('not found') ? 404: 
        500;
      return res.status(statusCode).json(errorResponse)
    }
    console.error('Error in create review handler:', error)
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    return res.status(500).json(errorResponse)
  }
} 