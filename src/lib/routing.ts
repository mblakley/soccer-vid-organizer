import { NextRouter } from 'next/router'
// import { apiClient } from '@/lib/api/client' // No longer needed
import { getSupabaseBrowserClient } from '@/lib/supabaseClient' // Import Supabase client
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
      // await apiClient.post('/api/auth/signout') // Old way
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out in handleRoleBasedRouting:', error.message);
        // Optionally, show a toast error to the user if signout fails here, 
        // though typically it should succeed or the user is already effectively signed out.
      }
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