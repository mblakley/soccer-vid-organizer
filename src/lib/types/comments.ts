import { z } from 'zod'
import type { ErrorResponse } from './api'

export const commentSchema = z.object({
  id: z.string(),
  clip_id: z.string(),
  user_id: z.string(),
  text: z.string(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  parent_comment_id: z.string().nullable()
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

export type CommentResponse = {
  comment: Comment;
  error?: string;
};

export type CommentApiResponse = CommentResponse | ErrorResponse 