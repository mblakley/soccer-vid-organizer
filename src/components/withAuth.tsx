import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { getCurrentUser, hasRole, getRedirectPath } from '@/lib/auth'

/**
 * Higher-Order Component for role-based access control
 * @param Component The component to wrap with authentication
 * @param allowedRoles Array of roles that can access this component
 */
export default function withAuth(Component: React.ComponentType<any>, allowedRoles: string[]) {
  return function ProtectedRoute(props: any) {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const currentUser = await getCurrentUser()
          
          if (!currentUser) {
            console.log("No user found, redirecting to login")
            router.push('/login')
            return
          }
          
          if (!hasRole(currentUser.roles, allowedRoles)) {
            console.log(`User roles ${currentUser.roles} not allowed, redirecting`)
            router.push(getRedirectPath(currentUser.roles))
            return
          }

          setUser(currentUser)
          setLoading(false)
        } catch (error) {
          console.error("Authentication error:", error)
          router.push('/login')
        }
      }
      
      checkAuth()
    }, [router])

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl">Loading...</p>
        </div>
      )
    }

    return <Component {...props} user={user} />
  }
} 