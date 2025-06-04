import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import type { RemoveUserApiResponse } from '@/lib/types/admin'
import { removeUserRequestSchema, removeUserResponseSchema } from '@/lib/types/admin'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<RemoveUserApiResponse>
  ) {
    if (req.method !== 'POST') {
      const errorResponse: ErrorResponse = {
        error: 'Method not allowed'
      }
      return res.status(405).json(errorResponse)
    }

    try {
      const supabase = await getSupabaseClient(req.headers.authorization)

      // Validate request body
      const { id } = removeUserRequestSchema.parse(req.body)

      // Delete user from Supabase Auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(id)

      if (deleteError) {
        console.error('Error deleting user:', deleteError)
        throw new Error(deleteError.message)
      }

      // Delete user's team memberships
      const { error: teamMembersError } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', id)

      if (teamMembersError) {
        console.error('Error deleting team memberships:', teamMembersError)
        throw new Error(teamMembersError.message)
      }

      // Delete user's roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', id)

      if (rolesError) {
        console.error('Error deleting user roles:', rolesError)
        throw new Error(rolesError.message)
      }

      const response = { success: true }
      removeUserResponseSchema.parse(response)
      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in remove-user handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 