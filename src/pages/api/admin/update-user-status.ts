import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import type { UpdateUserStatusApiResponse } from '@/lib/types/users'
import { updateUserStatusSchema } from '@/lib/types/users'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<UpdateUserStatusApiResponse>
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
      const body = updateUserStatusSchema.parse(req.body)

      // Update user metadata
      const { data: user, error: updateError } = await supabase.auth.admin.updateUserById(
        body.id,
        { user_metadata: { disabled: body.disabled } }
      )

      if (updateError) {
        console.error('Error updating user status:', updateError)
        throw new Error(updateError.message)
      }

      const response = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          user_metadata: user.user_metadata
        }
      }

      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in update-user-status handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 