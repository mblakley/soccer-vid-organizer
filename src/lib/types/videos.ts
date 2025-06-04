import { z } from 'zod';
import type { ErrorResponse } from './api'; // Correctly import from api.ts

// Base Video Schema - adjust fields as per your 'videos' table structure
export const videoSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().nullable(),
  source: z.string().nullable(),
  video_id: z.string().nullable(),
  duration: z.number().nullable(),
  start_time: z.number(),
  end_time: z.number(),
  metadata: z.record(z.any()).nullable(),
  created_at: z.string().nullable()
});

export type Video = z.infer<typeof videoSchema>;

// For GET /api/videos/list (or /api/videos)
export const listVideosResponseSchema = z.object({
  videos: z.array(videoSchema),
  // error: z.string().optional(), // ErrorResponse is a union type, so this isn't needed here
});

export type ListVideosResponse = {
  videos: Video[];
  message?: string;
};

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