import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { UpdateUserRoleApiResponse, ErrorResponse, UpdateUserRoleRequest } from '@/lib/types/auth'
import { updateUserRoleSchema } from '@/lib/types/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateUserRoleApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('Error getting user:', userError)
      throw new Error(userError.message)
    }

    if (!user) {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized'
      }
      return res.status(401).json(errorResponse)
    }

    // Check if the current user is an admin
    const { data: currentUserRole, error: roleError } = await supabase
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (roleError) {
      console.error('Error checking admin role:', roleError)
      throw new Error(roleError.message)
    }

    if (!currentUserRole?.is_admin) {
      const errorResponse: ErrorResponse = {
        error: 'Forbidden: Admin access required'
      }
      return res.status(403).json(errorResponse)
    }

    // Validate request body
    const updateRequest = updateUserRoleSchema.parse(req.body)
    const { id, isAdmin } = updateRequest

    // Update the user_roles table
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({ is_admin: isAdmin })
      .eq('user_id', id)

    if (updateError) {
      console.error('Error updating user role:', updateError)
      throw new Error(updateError.message)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      return res.status(400).json(errorResponse)
    }
    console.error('Error in update-user-role handler:', error)
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    return res.status(500).json(errorResponse)
  }
}