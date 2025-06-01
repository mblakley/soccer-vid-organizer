import { z } from 'zod';
import type { ErrorResponse } from './auth'; // Correctly import from auth.ts

// Base Video Schema - adjust fields as per your 'videos' table structure
export const videoSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  title: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional(), // URL can be optional if source is e.g. local upload
  source: z.string(), // e.g., 'youtube', 'veo', 'upload'
  user_id: z.string().uuid().optional(), // Creator of the video
  team_id: z.string().uuid().optional(), // Associated team
  thumbnail_url: z.string().url().optional(),
  duration: z.number().optional(), // Duration in seconds
  // Add any other relevant fields from your videos table
});

export type Video = z.infer<typeof videoSchema>;

// For GET /api/videos/list (or /api/videos)
export const listVideosResponseSchema = z.object({
  videos: z.array(videoSchema),
  // error: z.string().optional(), // ErrorResponse is a union type, so this isn't needed here
});

export type ListVideosResponse = z.infer<typeof listVideosResponseSchema>;
export type ListVideosApiResponse = ListVideosResponse | ErrorResponse;

export interface VideoListResponse {
  videos: Video[];
}

export interface VideoCreateRequest {
  title: string;
  url: string;
  video_id: string;
  source: string;
  status: 'active' | 'removed' | 'private' | 'deleted';
  last_synced?: string;
  created_by: string;
}

export interface VideoUpdateRequest {
  title?: string;
  url?: string;
  status?: 'active' | 'removed' | 'private' | 'deleted';
  last_synced?: string;
} 