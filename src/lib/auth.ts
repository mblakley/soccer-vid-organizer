import { jwtDecode, JwtPayload } from 'jwt-decode'
import { supabase } from './supabaseClient'
import { JWTCustomClaims, TeamRole, TeamRolesMap } from './types'

export interface User {
  id: string;
  email?: string;
  isAdmin?: boolean;
  teamRoles?: TeamRolesMap;
}

interface CustomJwtPayload extends JwtPayload {
  is_admin?: boolean;
  team_roles?: TeamRolesMap;
}

/**
 * Gets the current user and their roles from JWT claims
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    console.log('[Auth] Getting current user...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[Auth] Error getting session:', sessionError);
      return null;
    }
    if (!session) {
      console.log('[Auth] No session found');
      return null;
    }

    // Get the JWT claims
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('[Auth] Error getting user:', userError);
      return null;
    }

    if (!user || !session) {
      console.log('[Auth] No user or session found');
      return null;
    }
    
    // Try to get roles from JWT claims
    let isAdmin = false;
    let teamRoles: TeamRolesMap = {};
    
    try {
      const jwt = jwtDecode<CustomJwtPayload>(session.access_token);
      isAdmin = jwt.is_admin || false;
      teamRoles = jwt.team_roles || {};
    } catch (error) {
      console.error("[Auth] Error decoding JWT:", error);
    }
    
    const userData = {
      id: user.id,
      email: user.email || undefined,
      isAdmin,
      teamRoles
    };
    return userData;
  } catch (error) {
    console.error('[Auth] Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Redirects the user to the appropriate page based on their role
 */
export function getRedirectPath(user: User | null, queryParams?: Record<string, string>): string {
  console.log('[Auth] Getting redirect path for user:', user);
  console.log('[Auth] Query params:', queryParams);
  
  if (!user) {
    console.log('[Auth] No user, redirecting to login');
    return '/login';
  }

  // Build query string if there are any params
  const queryString = queryParams 
    ? '?' + Object.entries(queryParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
    : '';
  console.log('[Auth] Built query string:', queryString);

  // If user has team roles, redirect to root
  const teamRoles = user.teamRoles || {};
  if (Object.keys(teamRoles).length > 0) {
    console.log('[Auth] User has team roles:', teamRoles);
    return `/${queryString}`;
  }

  // If user is an admin but has no team roles, redirect to admin dashboard
  if (user.isAdmin) {
    console.log('[Auth] User is admin with no team roles, redirecting to admin dashboard');
    return `/admin${queryString}`;
  }

  // If user has no roles, redirect to role request page
  console.log('[Auth] User has no roles, redirecting to role request page');
  return `/role-request${queryString}`;
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