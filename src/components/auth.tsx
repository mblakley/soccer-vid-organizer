import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { getCurrentUser, isAdmin, hasTeamRole } from '@/lib/auth'
import { AppRole, TeamRole } from '@/lib/types'
import AppLayout from './AppLayout'

type TeamRoleRequirement = {
  teamId: string | 'any';
  roles: TeamRole[];
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
    const [user, setUser] = useState<any>(null)
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
          
          // If team roles are specified, check permissions
          if (teamRole) {
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
          setLoading(false)
        } catch (error) {
          console.error('Auth error:', error)
          router.push('/login')
        }
      }
      
      checkAuth()
    }, [router])
    
    if (loading) return <div className="p-8">Loading...</div>
    
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
    const [user, setUser] = useState<any>(null)
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