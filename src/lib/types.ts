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