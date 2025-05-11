import { jwtDecode, JwtPayload } from 'jwt-decode'
import { supabase } from './supabaseClient'

// Extend JwtPayload to include user_roles
export interface CustomJwtPayload extends JwtPayload {
  user_roles?: string[] | null;
}

export interface User {
  id: string;
  email?: string;
  roles?: string[] | null;
}

/**
 * Gets the current user and their roles from JWT claims
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Get the current session
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    
    // Get user info
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    
    if (!user || !session) {
      return null
    }
    
    // Try to get roles from JWT claims (preferred)
    let roles = null
    try {
      const jwt = jwtDecode<CustomJwtPayload>(session.access_token)
      roles = jwt.user_roles || null
    } catch (error) {
      console.error("Error decoding JWT:", error)
    }
    
    return {
      id: user.id,
      email: user.email || undefined,
      roles: roles || undefined
    }
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

/**
 * Redirects the user to the appropriate page based on their role
 */
export function getRedirectPath(roles: string[] | undefined | null): string {
  if (!roles || roles.length === 0) {
    return '/login'
  }
  
  if (roles.includes('admin')) {
    return '/admin'
  }
  
  if (roles.includes('coach')) {
    return '/coach'
  }
  
  if (roles.includes('player') || roles.includes('parent')) {
    return '/'
  }

  return '/'
}

/**
 * Checks if the current user has the required role
 */
export function hasRole(userRoles: string[] | undefined | null, requiredRoles: string[]): boolean {
  if (!userRoles) return false
  return requiredRoles.some(role => userRoles.includes(role))
} 