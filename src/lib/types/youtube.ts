import { z } from 'zod';
import type { ErrorResponse } from './auth';

// Schema for query parameters for /api/youtube/playlist-videos
export const playlistVideosQuerySchema = z.object({
  playlistId: z.string().min(1, 'Playlist ID is required'),
});

// Schema for a single video item returned from the YouTube API (simplified)
export const youtubeVideoSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().optional(), // Duration in seconds
  publishedAt: z.string().datetime().optional(),
  channelId: z.string().optional(),
  channelTitle: z.string().optional(),
  tags: z.array(z.string()).optional(),
  playlistInfo: z.object({
    id: z.string(),
    title: z.string(),
    channelTitle: z.string().optional(),
  }).optional(),
});

export type YouTubeVideo = z.infer<typeof youtubeVideoSchema>;

// Schema for the API response of /api/youtube/playlist-videos
export const playlistVideosResponseSchema = z.object({
  videos: z.array(youtubeVideoSchema),
  error: z.string().optional(), // For errors within the 200 response if any, usually covered by ErrorResponse union
});

export type PlaylistVideosResponse = z.infer<typeof playlistVideosResponseSchema>;
export type PlaylistVideosApiResponse = PlaylistVideosResponse | ErrorResponse; 