import { jwtDecode, JwtPayload } from 'jwt-decode'
import { supabase } from './supabaseClient'
import { JWTCustomClaims, TeamRole, TeamRolesMap } from './types'

export interface User {
  id: string;
  email?: string;
  isAdmin?: boolean;
  teamRoles?: TeamRolesMap;
}

export interface CustomJwtPayload extends JwtPayload {
  is_admin?: boolean | null;
  team_roles?: TeamRolesMap | null;
}

/**
 * Gets the current user and their roles from JWT claims
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return null;
    }
    if (!session) {
      console.log('No session found');
      return null;
    }

    // Get the JWT claims
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return null;
    }

    if (!user || !session) {
      return null;
    }
    
    // Try to get roles from JWT claims
    let isAdmin = false;
    let teamRoles: TeamRolesMap = {};
    
    try {
      const jwt = jwtDecode<CustomJwtPayload>(session.access_token);
      console.log('Raw JWT claims:', jwt);
      isAdmin = jwt.is_admin || false;
      teamRoles = jwt.team_roles || {};
      console.log('Decoded values:', { isAdmin, teamRoles });
    } catch (error) {
      console.error("Error decoding JWT:", error);
    }
    
    return {
      id: user.id,
      email: user.email || undefined,
      isAdmin,
      teamRoles
    };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Redirects the user to the appropriate page based on their role
 */
export function getRedirectPath(user: User | null): string {
  console.log('Getting redirect path for user:', user);
  
  if (!user) {
    console.log('No user, redirecting to login');
    return '/login';
  }

  // If user is an admin, redirect to admin dashboard
  if (user.isAdmin) {
    console.log('User is admin, redirecting to admin dashboard');
    return '/admin';
  }

  // If user has team roles, redirect to team dashboard
  const teamRoles = user.teamRoles || {};
  if (Object.keys(teamRoles).length > 0) {
    console.log('User has team roles:', teamRoles);
    return '/team/dashboard';
  }

  // If user has no roles, redirect to role request page
  console.log('User has no roles, redirecting to role request page');
  return '/role-request';
}

/**
 * Checks if the current user is an admin
 */
export function isAdmin(user: User | null): boolean {
  return user?.isAdmin || false
}

/**
 * Checks if the current user has the required role for a specific team
 */
export function hasTeamRole(user: User | null, teamId: string, requiredRoles: TeamRole[]): boolean {
  if (!user || !user.teamRoles || !user.teamRoles[teamId]) return false
  return requiredRoles.some(role => user.teamRoles?.[teamId].roles.includes(role))
}

/**
 * Checks if user is a member of a specific team (any role)
 */
export function isTeamMember(user: User | null, teamId: string): boolean {
  if (!user || !user.teamRoles || !user.teamRoles[teamId]) return false
  return user.teamRoles[teamId].roles.length > 0
}

/**
 * Gets all teams that a user is a member of
 */
export function getUserTeams(user: User | null): { id: string, name: string, roles: TeamRole[] }[] {
  if (!user || !user.teamRoles) return []
  
  return Object.entries(user.teamRoles).map(([id, team]) => ({
    id,
    name: team.name,
    roles: team.roles
  }))
}

/**
 * Legacy function for compatibility
 * @deprecated Use hasGlobalRole instead
 */
export function hasRole(userRoles: string[] | undefined | null, requiredRoles: string[]): boolean {
  if (!userRoles) return false
  return requiredRoles.some(role => userRoles.includes(role))
} 