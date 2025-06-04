import { z } from 'zod';
import type { ErrorResponse } from './api'; // For ApiResponse union
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
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  location: z.string().nullable(),
  status: tournamentStatusSchema.nullable(),
  format: z.string().nullable(),
  age_group: z.string().nullable(),
  gender: z.string().nullable(),
  flight: z.string().nullable(),
  additional_info: z.record(z.any()).nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  organizer: z.string().nullable(),
  contact_email: z.string().nullable(),
  registration_deadline: z.string().nullable(),
  max_teams: z.number().nullable(),
  rules_url: z.string().nullable(),
  image_url: z.string().nullable()
});

export type Tournament = z.infer<typeof tournamentSchema>;
export type TournamentStatus = z.infer<typeof tournamentStatusSchema>;

// Example API response types, can be expanded
export const TournamentsResponseSchema = z.object({
  tournaments: z.array(tournamentSchema),
});
export type TournamentsResponse = z.infer<typeof TournamentsResponseSchema>;
export type TournamentsApiResponse = TournamentsResponse | ErrorResponse;

export interface TournamentGameEntry {
  id: string;
  tournament_id: string;
  game_id: string;
  flight?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TournamentResponse = {
  tournament: Tournament;
  error?: string;
};

export type TournamentApiResponse = TournamentResponse | ErrorResponse; 