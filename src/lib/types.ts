import { Database } from './database.types';

// Define app roles
export type AppRole = 'admin' | 'coach' | 'player' | 'parent';

// Team-specific role for a user
export type TeamRole = 'coach' | 'manager' | 'player' | 'parent';

// Structure for team-specific roles in JWT claims
export type TeamRolesMap = {
  [teamId: string]: {
    name: string;
    roles: TeamRole[];
  };
};

// Structure for JWT custom claims
export interface JWTCustomClaims {
  is_admin: boolean;
  team_roles: TeamRolesMap;
}

// Extended Database types
export type Tables = Database['public']['Tables'];
export type TablesInsert = {
  [TableName in keyof Tables]: Tables[TableName]['Insert']
};
export type TablesUpdate = {
  [TableName in keyof Tables]: Tables[TableName]['Update']
};
export type TablesRow = {
  [TableName in keyof Tables]: Tables[TableName]['Row']
};

// Helper functions to check roles in claims
export function isGlobalAdmin(claims: JWTCustomClaims | undefined): boolean {
  return claims?.is_admin || false;
}

export function hasTeamRole(claims: JWTCustomClaims | undefined, teamId: string, role: TeamRole): boolean {
  if (!claims || !claims.team_roles || !claims.team_roles[teamId]) return false;
  return claims.team_roles[teamId].roles.includes(role);
}

export function isTeamMember(claims: JWTCustomClaims | undefined, teamId: string): boolean {
  if (!claims || !claims.team_roles || !claims.team_roles[teamId]) return false;
  return claims.team_roles[teamId].roles.length > 0;
}

export function getUserTeams(claims: JWTCustomClaims | undefined): { id: string, name: string, roles: TeamRole[] }[] {
  if (!claims || !claims.team_roles) return [];
  
  return Object.entries(claims.team_roles).map(([id, team]) => ({
    id,
    name: team.name,
    roles: team.roles
  }));
}

export function isTeamCoach(claims: JWTCustomClaims | undefined, teamId: string): boolean {
  return hasTeamRole(claims, teamId, 'coach');
}

export interface FilmReviewSessionClip {
  id: string; // UUID
  clip_id: string; // UUID of the original clip
  display_order: number;
  comment?: string;
  clip?: {
    id: string;
    title: string;
    video_id: string;
    start_time: number;
    end_time: number;
    thumbnail_url?: string;
    created_by?: string;
    created_at?: string;
  };
}

export interface FilmReviewSession {
  id: string; // UUID
  title: string;
  description?: string;
  tags?: string[];
  creator_user_id: string; // UUID
  team_id: string; // UUID
  is_private: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  // For the list page, we might not load clips immediately
  // For the detail page, we would include:
  // clips?: FilmReviewSessionClip[]; 
}

// You might also want a type for a session that includes its clips
export interface FilmReviewSessionWithClips extends FilmReviewSession {
  clips: FilmReviewSessionClip[];
  // We would also likely want user details for the creator
  // creator?: User; // Assuming you have a User type
}

// Represents a clip from the general video library
export interface LibraryClip {
  id: string;
  title: string;
  video_id: string;
  start_time: number;
  end_time: number;
  created_by: string | null;
  created_at: string;
}

// Define the Video type based on usage in videos.tsx
export interface Video {
  id: string; 
  title: string;
  url?: string | null;
  source?: string | null; 
  video_id?: string | null; 
  duration?: number | null; 
  metadata?: { 
    thumbnailUrl?: string | null;
    [key: string]: any; 
  } | null;
  created_at?: string | null; 
}

// Define the Review type based on usage in src/pages/videos/reviews/index.tsx
export interface Review {
  id: string;
  title: string;
  description: string;
  created_at: string; 
  clip_count: number; 
}

// Define the Tournament type
// Based on src/pages/admin/tournaments.tsx
export interface Tournament {
  id: string;
  name: string;
  description: string | null; 
  start_date: string | null; 
  end_date: string | null;   
  location?: string | null; // Added
  status?: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | string | null; // Added & widened
  format?: string | null; // Added
  // flight?: string | null; // Consider if this top-level flight is needed or if it's only via junction tables
  age_group?: string | null; // Added
  additional_info?: Record<string, any> | null; // Added, typed as object or null
  created_at?: string | null; 
  updated_at?: string | null; // Added
}

// Define the Game type
// Based on src/pages/admin/leagues.tsx and general needs for game details
export interface Game {
  id: string;
  home_team_id?: string; 
  away_team_id?: string; 
  home_team_name?: string; // Can be joined/derived
  away_team_name?: string; // Can be joined/derived
  game_date: string | null; 
  start_time: string | null; // Consider renaming to game_time if that's the actual DB column
  location?: string | null;
  type?: 'league' | 'tournament' | string | null; // Added from games/index.tsx
  league_id?: string | null; 
  tournament_id?: string | null; 
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed' | string; // Consolidated statuses
  score_home?: number | null;
  score_away?: number | null;
  flight?: string | null; // Often related to tournaments
  notes?: string | null; 
  created_at?: string | null;
  updated_at?: string | null;
  // Add other relevant fields from your 'games' table as needed
  // e.g., video_url, referee_id, weather_conditions
}

// Define the Player type based on src/pages/rosters/[gameId].tsx
export interface Player {
  id: string; // Typically UUID from users table or a dedicated players table
  name: string; // Or first_name, last_name depending on your schema
  user_id?: string | null; // Link to the auth.users table if players are also users
  // Fields from original interface in roster page:
  position: string | null; // Allow null if position isn't always set
  jersey_number: number | null; // Allow null if jersey number isn't always set
  // Add other relevant player details, e.g.:
  // date_of_birth?: string | null;
  // teams?: string[]; // If a player can be on multiple teams (IDs)
  // is_active?: boolean;
  // profile_image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Define the RosterEntry type based on src/pages/rosters/[gameId].tsx
export interface RosterEntry {
  id: string; 
  player_id: string; 
  game_id: string;   
  team_id?: string | null; 
  is_starter?: boolean | null;
  is_attending?: boolean | null; 
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // player?: Player; 
}

// Define the Clip type
// Based on LibraryClip and usage in src/pages/index.tsx and api/clips/list.ts
export interface Clip {
  id: string; 
  title: string | null; 
  video_id: string; 
  start_time: number; 
  end_time: number;   
  created_by: string | null; 
  created_at: string; 
  tags?: string[] | null; 
  description?: string | null; 
  videos?: Partial<Video> & { url?: string }; 
}

// Define the Comment type
// Based on usage in src/pages/index.tsx and api/comments/list.ts
export interface Comment {
  id: string; 
  clip_id: string; 
  user_id: string; 
  text: string; 
  created_at: string; 
  updated_at?: string | null; 
  parent_comment_id?: string | null; 
}

// Define the League type
// Based on src/pages/leagues/index.tsx
export interface League {
  id: string; // UUID
  name: string;
  description?: string | null;
  season: string; // e.g., "2023-2024", "Summer 2024"
  age_group?: string | null;
  gender?: string | null; // e.g., 'boys', 'girls', 'co-ed'
  start_date?: string | null; // ISO date string
  end_date?: string | null;   // ISO date string
  created_at?: string | null; // ISO date string
  updated_at?: string | null; // ISO date string
  // Potentially other fields like sport, region, registration_deadline etc.
}

// You might also want a type for a league that includes its games for detailed views
export interface LeagueWithGames extends League {
  games: Game[]; // Assuming Game type is already defined
}

export interface TournamentGameEntry {
  id: string; // UUID
  tournament_id: string; // UUID
  game_id: string; // UUID
  flight?: string | null;
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
}

// For GET /api/videos/list
export interface ListVideosApiResponse {
  videos: Video[];
  message?: string;
} 