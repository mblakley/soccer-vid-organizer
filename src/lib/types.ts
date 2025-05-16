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