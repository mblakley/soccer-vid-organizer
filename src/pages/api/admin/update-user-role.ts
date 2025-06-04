import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import type { UpdateUserRoleApiResponse } from '@/lib/types/auth'
import { updateUserRoleSchema } from '@/lib/types/auth'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<UpdateUserRoleApiResponse>
  ) {
    if (req.method !== 'PUT') {
      const errorResponse: ErrorResponse = {
        error: 'Method not allowed'
      }
      return res.status(405).json(errorResponse)
    }

    try {
      const supabase = await getSupabaseClient(req.headers.authorization)

      // Validate request body
      const body = updateUserRoleSchema.parse(req.body)

      // Update user role
      const { data: role, error: updateError } = await supabase
        .from('user_roles')
        .update({ is_admin: body.isAdmin })
        .eq('user_id', body.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user role:', updateError)
        throw new Error(updateError.message)
      }

      const response = {
        success: true
      }

      return res.status(200).json(response)
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
  },
  { isUserAdmin: true }
)