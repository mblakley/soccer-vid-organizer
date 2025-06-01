import { z } from 'zod';
import type { ErrorResponse } from './auth'; // For ApiResponse union

export const leagueDivisionSchema = z.object({
  name: z.string(),
  // Add other division-specific fields if necessary, e.g., id, description
});

export const leagueSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  season: z.string(),
  age_group: z.string().nullable(),
  gender: z.string().nullable(),
  start_date: z.string().datetime().nullable(), // Or z.date() if you transform
  end_date: z.string().datetime().nullable(),   // Or z.date()
  additional_info: z.any().optional().nullable(), // Explicitly make it nullable as well
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
  league_divisions: z.array(leagueDivisionSchema).optional(), // Make it optional if not always present
});

export type LeagueDivision = z.infer<typeof leagueDivisionSchema>;
export type League = z.infer<typeof leagueSchema>;

// Example of a response type if you fetch a single league
export const leagueResponseSchema = z.object({
  league: leagueSchema,
});
export type LeagueResponse = z.infer<typeof leagueResponseSchema>;
export type LeagueApiResponse = LeagueResponse | ErrorResponse;

// Example for a list of leagues (though admin might have its own specific list response)
export const leaguesListResponseSchema = z.object({
  leagues: z.array(leagueSchema),
});
export type LeaguesListResponse = z.infer<typeof leaguesListResponseSchema>;
export type LeaguesListApiResponse = LeaguesListResponse | ErrorResponse; 