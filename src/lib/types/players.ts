import { z } from 'zod';
import type { ErrorResponse } from './api';

// Define the Player type
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  user_id: z.string().nullable(),
  position: z.string().nullable(),
  jersey_number: z.number().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable()
});

// Define the RosterEntry type
export const rosterEntrySchema = z.object({
  id: z.string(),
  player_id: z.string(),
  game_id: z.string(),
  team_id: z.string().nullable(),
  is_starter: z.boolean().nullable(),
  is_attending: z.boolean().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable()
});

export type Player = z.infer<typeof playerSchema>;
export type RosterEntry = z.infer<typeof rosterEntrySchema>;

export type PlayerResponse = {
  player: Player;
  error?: string;
};

export type RosterEntryResponse = {
  rosterEntry: RosterEntry;
  error?: string;
};

export type PlayerApiResponse = PlayerResponse | ErrorResponse;
export type RosterEntryApiResponse = RosterEntryResponse | ErrorResponse; 