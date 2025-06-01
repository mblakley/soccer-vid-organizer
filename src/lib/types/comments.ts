import { z } from 'zod'
import type { ErrorResponse } from './auth'

export const commentSchema = z.object({
  id: z.string(),
  clip_id: z.string(),
  user_id: z.string(),
  content: z.string(),
  role_visibility: z.string(),
  created_at: z.string()
})

export const createCommentRequestSchema = z.object({
  clip_id: z.string().uuid('Invalid clip ID'),
  content: z.string().min(1, 'Comment content cannot be empty'),
  role_visibility: z.string()
})

export const createCommentResponseSchema = commentSchema

export type Comment = z.infer<typeof commentSchema>
export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>
export type CreateCommentResponse = z.infer<typeof createCommentResponseSchema>

export type CreateCommentApiResponse = CreateCommentResponse | ErrorResponse 