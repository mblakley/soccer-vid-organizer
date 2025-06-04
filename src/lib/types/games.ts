import { z } from 'zod';
import type { ErrorResponse } from './api'; // For ApiResponse union

export const gameStatusSchema = z.enum(['scheduled', 'completed', 'cancelled', 'postponed']);

export const gameSchema = z.object({
  id: z.string(),
  home_team_id: z.string().nullable(),
  away_team_id: z.string().nullable(),
  home_team_name: z.string().nullable(),
  away_team_name: z.string().nullable(),
  game_date: z.string().nullable(),
  start_time: z.string().nullable(),
  location: z.string().nullable(),
  type: z.enum(['league', 'tournament']).nullable(),
  league_id: z.string().nullable(),
  tournament_id: z.string().nullable(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed']),
  score_home: z.number().nullable(),
  score_away: z.number().nullable(),
  flight: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable()
});

export type Game = z.infer<typeof gameSchema> & {
  home_team?: { id: string; name: string; short_name?: string };
  away_team?: { id: string; name: string; short_name?: string };
};

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