import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { getCurrentUser, hasRole } from '@/lib/auth'
import AppLayout from './AppLayout'

/**
 * Higher-Order Component for role-based access control
 * @param Component The component to wrap with authentication
 * @param allowedRoles Array of roles that can access this component
 * @param pageTitle Optional title to display in the AppLayout header
 */
export default function withAuth(Component: any, allowedRoles?: string[], pageTitle?: string) {
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
          
          // If roles are specified, only allow access if user has one of those roles
          if (allowedRoles && allowedRoles.length > 0) {
            if (!hasRole(userData.roles, allowedRoles)) {
              console.log('User does not have required role, redirecting')
              router.push('/')
              return
            }
          }
          
          // User is authenticated and has required role
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