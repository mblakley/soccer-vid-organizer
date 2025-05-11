import { NextRouter } from 'next/router'
import { supabase } from './supabaseClient'
import { getRedirectPath } from './auth'

export async function handleRoleBasedRouting(
  userRoles: string[] | null | undefined,
  router: NextRouter,
  shouldSignOut: boolean = false,
  showApprovalMessage: boolean = false
) {
  if (!userRoles || userRoles.length === 0) {
    console.log("No user roles assigned or pending approval")
    if (showApprovalMessage) {
      alert('Your account is awaiting role approval. Please contact an admin.')
    }
    if (shouldSignOut) {
      await supabase.auth.signOut()
    }
    router.push('/login')
    return
  }

  const redirectPath = getRedirectPath(userRoles)
  console.log(`Redirecting user with roles [${userRoles.join(', ')}] to ${redirectPath}`)
  router.push(redirectPath)
} 