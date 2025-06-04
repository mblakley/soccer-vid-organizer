import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { CommentApiResponse } from '@/lib/types/comments'
import type { ErrorResponse } from '@/lib/types/api'
import { createCommentRequestSchema, createCommentResponseSchema } from '@/lib/types/comments'
import { z } from 'zod'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CommentApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    res.setHeader('Allow', ['POST'])
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)

    // Get the current user
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

    // Validate request body
    const commentRequest = createCommentRequestSchema.parse(req.body)
    const { clip_id, content, role_visibility } = commentRequest

    const commentToInsert = {
      clip_id,
      user_id: user.id,
      content,
      role_visibility,
    }

    const { data: createdComment, error: insertError } = await supabase
      .from('comments')
      .insert(commentToInsert)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating comment:', insertError)
      if (insertError.code === '23503') {
        const errorResponse: ErrorResponse = { error: 'Invalid clip_id or user_id.' }
        return res.status(400).json(errorResponse)
      }
      throw new Error(insertError.message)
    }

    if (!createdComment) {
      throw new Error('Comment creation did not return data.')
    }

    const validatedResponse = createCommentResponseSchema.parse(createdComment)
    
    return res.status(201).json({ comment: validatedResponse })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request body'
      }
      return res.status(400).json(errorResponse)
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      const statusCode =
        (error.message.includes('Unauthorized')) ? 401 :
        (error.message.includes('Invalid clip_id')) ? 400 :
        500
      return res.status(statusCode).json(errorResponse)
    }
    console.error('Error in create comment handler:', error)
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    return res.status(500).json(errorResponse)
  }
} 