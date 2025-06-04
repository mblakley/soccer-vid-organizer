import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import type { InviteUserApiResponse } from '@/lib/types/admin'
import { inviteUserRequestSchema, inviteUserResponseSchema } from '@/lib/types/admin'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<InviteUserApiResponse>
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
      const { email, team_id, team_name } = inviteUserRequestSchema.parse(req.body)

      // Create a temporary user with a placeholder email
      const tempEmail = `temp_${Date.now()}@placeholder.com`
      const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        email_confirm: true,
        user_metadata: {
          invited_email: email,
          invited_team_id: team_id,
          invited_team_name: team_name
        }
      })

      if (createError) {
        console.error('Error creating temporary user:', createError)
        throw new Error(createError.message)
      }

      if (!user) {
        throw new Error('User creation succeeded but no user data returned')
      }

      // Create a team member request
      const { error: requestError } = await supabase
        .from('team_member_requests')
        .insert({
          team_id: team_id,
          user_id: user.user.id,
          status: 'pending'
        })

      if (requestError) {
        console.error('Error creating team member request:', requestError)
        throw new Error(requestError.message)
      }

      const response = {
        message: 'User invited successfully'
      }

      inviteUserResponseSchema.parse(response)
      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in invite-user handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 