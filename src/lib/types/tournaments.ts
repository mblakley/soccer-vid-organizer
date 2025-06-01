import { z } from 'zod';
import type { ErrorResponse } from './auth'; // For ApiResponse union
// Potentially import Game if tournaments have games associated directly
// import { gameSchema } from './games';

export const tournamentStatusSchema = z.enum([
  'upcoming',
  'registration_open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled',
  'postponed',
]);

export const tournamentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional().nullable(),
  start_date: z.string().datetime().nullable(),
  end_date: z.string().datetime().nullable(),
  location: z.string().optional().nullable(),
  organizer: z.string().optional().nullable(), // Could be user_id or just text
  contact_email: z.string().email().optional().nullable(),
  registration_deadline: z.string().datetime().optional().nullable(),
  max_teams: z.number().int().positive().optional().nullable(),
  status: tournamentStatusSchema.optional().nullable(),
  rules_url: z.string().url().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  additional_info: z.any().optional().nullable(), // For any other custom fields
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional().nullable(),
  // If games are directly part of a tournament object:
  // games: z.array(gameSchema).optional(),
});

export type Tournament = z.infer<typeof tournamentSchema>;
export type TournamentStatus = z.infer<typeof tournamentStatusSchema>;

// Example API response types, can be expanded
export const TournamentsResponseSchema = z.object({
  tournaments: z.array(tournamentSchema),
});
export type TournamentsResponse = z.infer<typeof TournamentsResponseSchema>;
export type TournamentsApiResponse = TournamentsResponse | ErrorResponse; 