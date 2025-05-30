import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { 
  JWTCustomClaims, 
  TeamRole, 
  hasTeamRole, 
  isTeamMember,
  getUserTeams,
  isGlobalAdmin,
  isTeamCoach
} from '@/lib/types';

interface AuthState {
  user: User | null
  loading: boolean
  error: Error | null
  claims?: JWTCustomClaims
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setState(prev => ({ ...prev, error, loading: false }))
        return
      }
      setState(prev => ({ ...prev, user: session?.user ?? null, loading: false }))
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({ ...prev, user: session?.user ?? null }))
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Expose helper methods for checking permissions
  const { user, loading, error } = state
  const claims = state.claims

  return {
    user,
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
    signOut: () => supabase.auth.signOut()
  }
} 