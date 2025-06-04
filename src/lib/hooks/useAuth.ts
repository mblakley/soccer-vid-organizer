import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { 
  JWTCustomClaims, 
  TeamRole, 
  TeamRolesMap,
  hasTeamRole, 
  isTeamMember,
  getUserTeams,
  isGlobalAdmin,
  isTeamCoach
} from '@/lib/types/auth';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { jwtDecode } from 'jwt-decode';

interface AuthState {
  user: SupabaseUser | null
  session: Session | null // Store the whole session for access to token
  loading: boolean
  error: AuthError | Error | null // Can be Supabase AuthError or generic Error
  claims?: JWTCustomClaims
}

export function useAuth() {
  const supabase = getSupabaseBrowserClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    claims: undefined
  })

  useEffect(() => {
    setState(prev => ({ ...prev, loading: true }));

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setState(prev => ({ ...prev, error, loading: false }));
        return;
      }
      let currentClaims: JWTCustomClaims | undefined = undefined;
      if (session?.access_token) {
        try {
          currentClaims = jwtDecode<JWTCustomClaims>(session.access_token);
        } catch (e) {
          console.error("Failed to decode JWT:", e);
        }
      }
      setState(prev => ({ ...prev, user: session?.user ?? null, session, claims: currentClaims, loading: false }));
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      let currentClaims: JWTCustomClaims | undefined = undefined;
      if (session?.access_token) {
        try {
          currentClaims = jwtDecode<JWTCustomClaims>(session.access_token);
        } catch (e) {
          console.error("Failed to decode JWT:", e);
          // Potentially set an error state here if claims are critical and decoding fails
        }
      }
      setState(prev => ({ ...prev, user: session?.user ?? null, session, claims: currentClaims, loading: false }));
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState(prev => ({ ...prev, error, loading: false }));
      // Optionally: toast.error(error.message) or similar user feedback
    } else {
      // State will be updated by onAuthStateChange listener
      // but clear user/session/claims immediately for faster UI response
      setState(prev => ({ 
        ...prev, 
        user: null, 
        session: null, 
        claims: undefined, 
        loading: false, 
        error: null 
      }));
    }
  };

  // Expose helper methods for checking permissions
  const { user, session, loading, error, claims } = state

  return {
    user,
    session, // Expose session if needed by components
    claims,
    loading,
    error,
    // Global role checks
    isAdmin: () => isGlobalAdmin(claims),
    // Team role checks
    hasTeamRole: (teamId: string, role: TeamRole) => hasTeamRole(claims, teamId, role),
    isTeamMember: (teamId: string) => isTeamMember(claims, teamId),
    isTeamCoach: (teamId: string) => isTeamCoach(claims, teamId),
    // Team information
    getUserTeams: () => getUserTeams(claims),
    // Sign out method
    signOut
  }
} 