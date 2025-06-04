import { z } from 'zod';
import type { ErrorResponse } from './api';
import type { Video } from './videos';

// ClipMarker interface for use in the frontend
export interface ClipMarker {
  id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  title: string;
  comment?: string;
  labels?: string[];
  created_by: string;
  created_at: string;
  updated_at?: string;
  startTime: number;  // Computed property for compatibility
  endTime: number;    // Computed property for compatibility
  duration: number;   // Computed property for compatibility
}

// Base Clip Schema - adjust fields as per your 'clips' table structure
export const clipSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  video_id: z.string(),
  start_time: z.number(),
  end_time: z.number(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  tags: z.array(z.string()).nullable(),
  description: z.string().nullable()
});

export type Clip = z.infer<typeof clipSchema> & {
  videos?: Partial<Video> & { url?: string };
};

export type ClipResponse = {
  clip: Clip;
  error?: string;
};

export type ClipApiResponse = ClipResponse | ErrorResponse;

// For PUT /api/clips/[id] (Update Clip)
export const updateClipRequestSchema = clipSchema.partial().omit({ id: true, video_id: true, created_by: true, created_at: true }); // id, video_id, created_by, created_at are usually not updated directly

export const updateClipResponseSchema = z.object({
  clip: clipSchema,
});

export type UpdateClipRequest = z.infer<typeof updateClipRequestSchema>;
export type UpdateClipResponse = z.infer<typeof updateClipResponseSchema>;
export type UpdateClipApiResponse = UpdateClipResponse | ErrorResponse;

// For DELETE /api/clips/[id] (Delete Clip)
export const deleteClipResponseSchema = z.object({
  success: z.boolean(),
  id: z.string().uuid(),
});

export type DeleteClipResponse = z.infer<typeof deleteClipResponseSchema>;
export type DeleteClipApiResponse = DeleteClipResponse | ErrorResponse;

// For GET /api/clips (List Clips - if you have one)
export const listClipsResponseSchema = z.object({
  clips: z.array(clipSchema),
});

export type ListClipsResponse = z.infer<typeof listClipsResponseSchema>;
export type ListClipsApiResponse = ListClipsResponse | ErrorResponse;

// For POST /api/clips/create (Create Clip)
export const createClipRequestSchema = clipSchema.pick({
  title: true,
  video_id: true,
  start_time: true,
  end_time: true,
  tags: true,
  description: true
}); // id, created_by, created_at, updated_at are set by DB/server

export const createClipResponseSchema = z.object({
  clip: clipSchema,
});

export type CreateClipRequest = z.infer<typeof createClipRequestSchema>;
export type CreateClipResponse = z.infer<typeof createClipResponseSchema>;
export type CreateClipApiResponse = CreateClipResponse | ErrorResponse;

export interface CreateClipData {
  video_id: string;
  start_time: number;
  end_time: number;
  title: string;
  created_by: string;
}

export interface ClipsResponse {
  data?: {
    clips: ClipMarker[];
  };
  error?: string;
}

// Add LibraryClip type definition
export interface LibraryClip {
  id: string;
  title: string;
  video_id: string;
  start_time: number;
  end_time: number;
  thumbnail_url?: string;
  created_by?: string;
  created_at?: string;
} 