import { z } from 'zod';
import type { ErrorResponse } from './api'; // For ApiResponse union
import type { Game } from './games';

export interface CreateLeagueRequest {
  name: string;
  season: string;
  age_group?: string | null;
  gender?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  additional_info?: any;
}

export interface CreateLeagueDivisionRequest {
  league_id: string;
  name: string;
  description?: string | null;
}

// Zod schemas for validation
export const createLeagueSchema = z.object({
  name: z.string().min(1, 'League name is required'),
  season: z.string().min(1, 'Season is required'),
  age_group: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  additional_info: z.any().optional()
});

export const createLeagueDivisionSchema = z.object({
  league_id: z.string().uuid(),
  name: z.string().min(1, 'Division name is required'),
  description: z.string().nullable().optional()
});

export const leagueDivisionSchema = z.object({
  id: z.string().uuid(),
  league_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  team_count: z.number().optional(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable()
});

export const leagueSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  season: z.string(),
  age_group: z.string().nullable(),
  gender: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  additional_info: z.any().optional()
});

export type LeagueDivision = z.infer<typeof leagueDivisionSchema>;
export type League = z.infer<typeof leagueSchema> & {
  league_divisions?: LeagueDivision[];
};

export interface LeagueWithGames extends League {
  games: Game[];
}

export type LeagueResponse = {
  league: League & {
    league_divisions?: LeagueDivision[];
  };
  error?: string;
};

export type LeagueApiResponse = LeagueResponse | ErrorResponse;

// Example for a list of leagues (though admin might have its own specific list response)
export const leaguesListResponseSchema = z.object({
  leagues: z.array(leagueSchema.extend({
    league_divisions: z.array(leagueDivisionSchema).optional()
  }))
});
export type LeaguesListResponse = z.infer<typeof leaguesListResponseSchema>;
export type LeaguesListApiResponse = LeaguesListResponse | ErrorResponse; 