import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { getCurrentUser, isAdmin, hasTeamRole } from '@/lib/auth'
import { AppRole, TeamRole } from '@/lib/types/auth'
import AppLayout from './AppLayout'
import { useAuth } from '@/lib/hooks/useAuth'

export interface User {
  id: string;
  email?: string;
  app_metadata?: {
    provider?: string;
    [key: string]: any;
  };
  user_metadata?: {
    [key: string]: any;
  };
  aud?: string;
  created_at?: string;
  teamRoles?: { 
    [teamId: string]: {
      name: string;
      roles: TeamRole[];
    } 
  };
  // Add roles property based on the usage in TournamentPage
  roles?: TeamRole[]; // This seems to be used directly on user object in some pages
}

type TeamRoleRequirement = {
  teamId: string | 'any';
  roles: TeamRole[];
  requireRole?: boolean; // If false, allows access even without roles
}

/**
 * Higher-Order Component for team-based access control
 * @param Component The component to wrap with authentication
 * @param teamRole Object specifying required team roles
 * @param pageTitle Optional title to display in the AppLayout header
 */
export function withAuth(
  Component: any,
  teamRole?: TeamRoleRequirement,
  pageTitle?: string
) {
  return function AuthenticatedComponent(props: any) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      const checkAuth = async () => {
        try {
          setLoading(true)
          setError(null)
          const userData = await getCurrentUser()
          
          if (!userData) {
            console.log('No user session, redirecting to login')
            router.push('/login')
            return
          }
          
          // If team roles are specified and required, check permissions
          if (teamRole && teamRole.requireRole !== false) {
            let hasAccess = false
            
            // Check team-specific roles
            const { teamId, roles } = teamRole
            
            if (teamId === 'any') {
              // Check if user has this role in any team
              const userTeams = userData.teamRoles ? Object.keys(userData.teamRoles) : []
              for (const team of userTeams) {
                if (hasTeamRole(userData, team, roles)) {
                  hasAccess = true
                  break
                }
              }
            } else {
              // Check for specific team
              if (hasTeamRole(userData, teamId, roles)) {
                hasAccess = true
              }
            }
            
            // If no role requirement matched, redirect
            if (!hasAccess) {
              console.log('User does not have required team role, redirecting')
              router.push('/')
              return
            }
          }
          
          // User is authenticated and has required permissions
          setUser(userData)
        } catch (error) {
          console.error('Auth error:', error)
          setError(error instanceof Error ? error.message : 'Authentication failed')
          router.push('/login')
        } finally {
          setLoading(false)
        }
      }
      
      checkAuth()
    }, [router])
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
          <p className="ml-4 text-lg">Loading...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-red-500 mb-4">Authentication Error</div>
          <p className="text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 rounded-md font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors">
            Try Again
          </button>
        </div>
      )
    }
    
    // Use fullWidth for analyze-video page
    const isAnalyzeVideo = pageTitle === 'Analyze Video' || router.pathname.includes('analyze-video')
    return (
      <AppLayout user={user} title={pageTitle} fullWidth={isAnalyzeVideo}>
        <Component {...props} user={user} />
      </AppLayout>
    )
  }
}

/**
 * Higher-Order Component for admin-only access control
 * @param Component The component to wrap with authentication
 * @param pageTitle Optional title to display in the AppLayout header
 */
export function withAdminAuth(
  Component: any,
  pageTitle?: string
) {
  return function AdminAuthenticatedComponent(props: any) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const userData = await getCurrentUser()
          
          if (!userData) {
            console.log('No user session, redirecting to login')
            router.push('/login')
            return
          }
          
          // Check if user has admin role
          if (!isAdmin(userData)) {
            console.log('User is not an admin, redirecting')
            router.push('/')
            return
          }
          
          // User is authenticated and is an admin
          setUser(userData)
          setLoading(false)
        } catch (error) {
          console.error('Auth error:', error)
          router.push('/login')
        }
      }
      
      checkAuth()
    }, [router])
    
    if (loading) return <div className="p-8">Loading...</div>
    
    return (
      <AppLayout user={user} title={pageTitle}>
        <Component {...props} user={user} />
      </AppLayout>
    )
  }
} 