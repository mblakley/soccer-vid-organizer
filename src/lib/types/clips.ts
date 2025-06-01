import { z } from 'zod';
import type { ErrorResponse } from './auth'; // Assuming ErrorResponse is in auth.ts

// ClipMarker interface for use in the frontend
export interface ClipMarker {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  comment: string;
  labels: string[];
}

// Base Clip Schema - adjust fields as per your 'clips' table structure
export const clipSchema = z.object({
  id: z.string().uuid(),
  video_id: z.string().uuid(),
  start_time: z.number().positive(),
  end_time: z.number().positive(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  // Add any other relevant fields from your clips table
});

export type Clip = z.infer<typeof clipSchema>;

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
export const createClipRequestSchema = clipSchema.omit({ id: true, created_by: true, created_at: true, updated_at: true }); // id, created_by, created_at, updated_at are set by DB/server

export const createClipResponseSchema = z.object({
  clip: clipSchema,
});

export type CreateClipRequest = z.infer<typeof createClipRequestSchema>;
export type CreateClipResponse = z.infer<typeof createClipResponseSchema>;
export type CreateClipApiResponse = CreateClipResponse | ErrorResponse; 