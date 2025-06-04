import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import type { DisableUserApiResponse } from '@/lib/types/admin'
import { disableUserRequestSchema, disableUserResponseSchema } from '@/lib/types/admin'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<DisableUserApiResponse>
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
      const disableRequest = disableUserRequestSchema.parse(req.body)
      const { id, disabled } = disableRequest

      // Update user metadata to set disabled status
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        id,
        {
          user_metadata: { disabled }
        }
      )

      if (updateError) {
        console.error('Error updating user:', updateError)
        throw new Error(updateError.message)
      }

      const response = { success: true }
      disableUserResponseSchema.parse(response)
      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in disable-user handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 