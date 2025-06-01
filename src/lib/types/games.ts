import { z } from 'zod';
import type { ErrorResponse } from './auth'; // For ApiResponse union

export const gameStatusSchema = z.enum(['scheduled', 'completed', 'cancelled', 'postponed']);

export const gameSchema = z.object({
  id: z.string().uuid(),
  league_id: z.string().uuid().optional(), // If game is part of a league
  tournament_id: z.string().uuid().optional(), // If game is part of a tournament
  home_team: z.string().uuid(), // Reverted from home_team_id
  away_team: z.string().uuid(), // Reverted from away_team_id
  home_team_name: z.string().optional(), // Denormalized, or fetched via relation
  away_team_name: z.string().optional(), // Denormalized, or fetched via relation
  location: z.string().nullable(),
  game_date: z.string().datetime().nullable(), // Or z.date()
  start_time: z.string().nullable(), // Consider validating format e.g., HH:mm
  flight: z.string().nullable(), // Division or group
  status: gameStatusSchema,
  score_home: z.number().int().nullable(),
  score_away: z.number().int().nullable(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
  // Add other fields like referee_id, field_number, etc. if needed
});

export type Game = z.infer<typeof gameSchema>;
export type GameStatus = z.infer<typeof gameStatusSchema>;

// Example of a response type if you fetch a single game
export const gameResponseSchema = z.object({
  game: gameSchema,
});
export type GameResponse = z.infer<typeof gameResponseSchema>;
export type GameApiResponse = GameResponse | ErrorResponse;

// Example for a list of games
export const gamesListResponseSchema = z.object({
  games: z.array(gameSchema),
});
export type GamesListResponse = z.infer<typeof gamesListResponseSchema>;
export type GamesListApiResponse = GamesListResponse | ErrorResponse; 