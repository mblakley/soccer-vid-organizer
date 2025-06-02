import { jwtDecode, JwtPayload } from 'jwt-decode'
import { getSupabaseBrowserClient, getSupabaseClient } from '@/lib/supabaseClient'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { JWTCustomClaims, TeamRole, TeamRolesMap } from './types'
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next'

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

// API Authentication Types
export interface AuthenticatedApiRequest extends NextApiRequest {
  user: SupabaseUser;
  claims: JWTCustomClaims;
}

interface ApiRoleRequirement {
  isUserAdmin?: boolean;
  teamId?: string | ((req: NextApiRequest) => string | undefined);
  requiredTeamRoles?: TeamRole[];
  allowUnauthenticated?: boolean;
}

/**
 * Refreshes the user's session to get updated JWT claims, mirroring the old working logic.
 */
export async function refreshUserSession(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();
  try {
    console.log('[Auth] Attempting to refresh Supabase session explicitly...');
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('[Auth] Error refreshing Supabase session:', refreshError.message);
      // Unlike before, if refresh fails, we might not have a valid session to get user from.
      // However, getCurrentUser will try getSession which might still work if token not expired.
    }
    
    if (!data.session && !refreshError) { // If no error but also no session, then something is amiss.
        console.log('[Auth] No session data after explicit refresh, though no direct error reported.');
    }
    // Proceed to get user data with the (potentially) new session state.
    return await getCurrentUser(); 
  } catch (error) {
    console.error('[Auth] Error in refreshUserSession process:', error);
    return null;
  }
}

/**
 * Gets the current user and their roles from JWT claims, mirroring the old working logic.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();
  try {
    // First, get the session.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[Auth] Error getting session:', sessionError.message);
      return null;
    }
    if (!session) {
      console.log('[Auth] No session found by getSession.');
      return null;
    }

    // Then, get the user explicitly. This might re-fetch or use cached user from session.
    // This mirrors the old pattern which might be important for how Supabase populates things.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('[Auth] Error getting user via getUser:', userError.message);
      return null;
    }
    if (!user) {
      console.log('[Auth] No user found by getUser, though session might exist.');
      return null;
    }
    
    let isAdmin = false;
    let teamRoles: TeamRolesMap = {};
    
    if (session.access_token) {
      try {
        const jwt = jwtDecode<CustomJwtPayload>(session.access_token);
        isAdmin = jwt.is_admin || false;
        teamRoles = jwt.team_roles || {};
      } catch (error) {
        console.error("[Auth] Error decoding JWT:", error);
      }
    } else {
      console.warn('[Auth] No access_token in current session to decode claims from.');
    }
    
    const userData: User = {
      id: user.id, // Use user from getUser() as per old logic
      email: user.email, // Use user from getUser()
      isAdmin,
      teamRoles
    };
    return userData;
  } catch (error) {
    console.error('[Auth] Unexpected error in getCurrentUser:', error);
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

/**
 * API Authentication Middleware
 * Protects API routes with authentication and role-based access control
 */
export function withApiAuth(
  handler: NextApiHandler,
  options?: ApiRoleRequirement
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authResult = await getUserAndClaims(req);

    if (!authResult.user || !authResult.claims) {
      if (options?.allowUnauthenticated) {
        (req as AuthenticatedApiRequest).user = null as any;
        (req as AuthenticatedApiRequest).claims = {} as any;
        return handler(req, res);
      }
      return res.status(authResult.status || 401).json({ error: authResult.error || 'Authentication required' });
    }

    const { user, claims } = authResult;

    // Perform authorization checks based on options
    if (options) {
      // Check for global admin requirement
      if (options.isUserAdmin && !claims.is_admin) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      // Check for team-specific roles
      if (options.requiredTeamRoles && options.requiredTeamRoles.length > 0) {
        let currentTeamId: string | undefined;
        if (typeof options.teamId === 'function') {
          currentTeamId = options.teamId(req);
        } else {
          currentTeamId = options.teamId;
        }

        if (currentTeamId === 'any') {
          // If teamId is 'any', check if user has the role in any team
          const hasRoleInAnyTeam = Object.entries(claims.team_roles || {}).some(([_, team]) => 
            options.requiredTeamRoles!.some(role => team.roles.includes(role))
          );
          if (!hasRoleInAnyTeam) {
            return res.status(403).json({ error: 'Forbidden: No team with required role found' });
          }
        } else if (currentTeamId) {
          // Check for specific team
          const userTeamRoles = claims.team_roles?.[currentTeamId]?.roles || [];
          const hasRequiredRole = options.requiredTeamRoles.some(role => userTeamRoles.includes(role));
          if (!hasRequiredRole) {
            return res.status(403).json({ error: `Forbidden: Insufficient permissions for team ${currentTeamId}` });
          }
        } else {
          return res.status(400).json({ error: 'Bad Request: Team ID is required for this role check but not provided or derived.' });
        }
      }
    }

    // Augment the request object
    (req as AuthenticatedApiRequest).user = user;
    (req as AuthenticatedApiRequest).claims = claims;

    return handler(req, res);
  };
}

/**
 * Gets user and claims from API request
 * Used by withApiAuth middleware
 */
async function getUserAndClaims(req: NextApiRequest): Promise<{ user: SupabaseUser | null; claims: JWTCustomClaims | null; error?: string; status?: number }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, claims: null, error: 'Missing or invalid authorization header', status: 401 };
  }
  const token = authHeader.split(' ')[1];

  const supabase = getSupabaseClient(authHeader);

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return { user: null, claims: null, error: userError?.message || 'User not authenticated', status: 401 };
    }

    let claims: JWTCustomClaims = { is_admin: false, team_roles: {} };
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      try {
        claims = jwtDecode<JWTCustomClaims>(session.access_token);
      } catch (e) {
        console.error('[ApiAuth] Error decoding JWT:', e);
      }
    }
    return { user, claims, status: 200 };
  } catch (e: any) {
    return { user: null, claims: null, error: e.message || 'Authentication error', status: 500 };
  }
} 