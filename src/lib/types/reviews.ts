import { z } from 'zod'
import type { ErrorResponse } from './api'
import type { Clip } from './clips'

export const reviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  created_at: z.string(),
  clip_count: z.number()
})

export const createReviewRequestSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  clips: z.array(z.string()).optional(),
  team_id: z.string()
})

export const createReviewResponseSchema = z.object({
  success: z.boolean(),
  review: reviewSchema
})

export type Review = z.infer<typeof reviewSchema>

export type CreateReviewRequest = z.infer<typeof createReviewRequestSchema>

export type CreateReviewResponse = {
  success: boolean
  review: Review
}

export type CreateReviewApiResponse = CreateReviewResponse | ErrorResponse

export const reviewResponseSchema = z.object({
  review: reviewSchema
})

export type ReviewResponse = z.infer<typeof reviewResponseSchema>
export type ReviewApiResponse = ReviewResponse | ErrorResponse

// For POST /api/reviews/creator-names
export const creatorNamesRequestSchema = z.object({
  teamMemberIds: z.array(z.string().uuid('Invalid team member ID')).min(1, 'At least one team member ID is required')
});

export const creatorNamesResponseSchema = z.record(z.string().uuid(), z.string()); // Maps team_member_id (UUID) to creator name (string)

export type CreatorNamesRequest = z.infer<typeof creatorNamesRequestSchema>;
export type CreatorNamesResponse = z.infer<typeof creatorNamesResponseSchema>;
export type CreatorNamesApiResponse = CreatorNamesResponse | ErrorResponse;

export interface FilmReviewSessionClip {
  id: string;
  clip_id: string;
  display_order: number;
  comment?: string;
  clip?: {
    id: string;
    title: string;
    video_id: string;
    start_time: number;
    end_time: number;
    thumbnail_url?: string;
    created_by?: string;
    created_at?: string;
  };
}

export interface FilmReviewSession {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  creator_user_id: string;
  team_id: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface FilmReviewSessionWithClips extends FilmReviewSession {
  clips: FilmReviewSessionClip[];
} 