import { NextRouter } from 'next/router'
import { apiClient } from '@/lib/api/client'
import { getRedirectPath, User } from './auth'
import { toast } from 'react-toastify';

export async function handleRoleBasedRouting(
  user: User | null,
  router: NextRouter,
  shouldSignOut: boolean = false,
  showApprovalMessage: boolean = false
) {
  if (!user || (!user.isAdmin && (!user.teamRoles || Object.keys(user.teamRoles).length === 0))) {
    console.log("User has no roles or is null, or roles are pending approval")
    if (showApprovalMessage && !user?.isAdmin && (!user?.teamRoles || Object.keys(user.teamRoles).length === 0) ) {
      toast.info('Your account is awaiting role approval. Please contact an admin.');
    }
    if (shouldSignOut) {
      await apiClient.post('/api/auth/signout')
    }
    router.push('/login')
    return
  }

  const redirectPath = getRedirectPath(user)
  const rolesDisplay = user ? [
      user.isAdmin ? 'admin' : null,
      ...(user.teamRoles ? Object.keys(user.teamRoles) : []),
  ].filter(Boolean).join(', ') : 'no roles';
  console.log(`Redirecting user with roles [${rolesDisplay}] to ${redirectPath}`)
  router.push(redirectPath)
} 