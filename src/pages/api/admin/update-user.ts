import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import type { UpdateUserApiResponse } from '@/lib/types/users'
import { updateUserSchema } from '@/lib/types/users'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<UpdateUserApiResponse>
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
      const body = updateUserSchema.parse(req.body)

      // Update user metadata
      const { data: user, error: updateError } = await supabase.auth.admin.updateUserById(
        body.id,
        { user_metadata: body.metadata }
      )

      if (updateError) {
        console.error('Error updating user:', updateError)
        throw new Error(updateError.message)
      }

      const response = {
        user: {
          id: user.user.id,
          email: user.user.email || '',
          created_at: user.user.created_at,
          user_metadata: user.user.user_metadata
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
      console.error('Error in update-user handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 