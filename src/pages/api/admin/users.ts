import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import { UsersApiResponse, usersResponseSchema } from '@/lib/types/auth'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<UsersApiResponse>
  ) {
    if (req.method !== 'GET') {
      const errorResponse: ErrorResponse = {
        error: 'Method not allowed'
      }
      return res.status(405).json(errorResponse)
    }

    try {
      const supabase = await getSupabaseClient(req.headers.authorization)

      // Get all users from auth.users
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
      
      if (usersError) {
        console.error('Error fetching users:', usersError)
        throw new Error(usersError.message)
      }

      const response = {
        users: users.map(user => ({
          id: user.id,
          email: user.email || null,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at || null,
          user_metadata: {
            full_name: user.user_metadata?.full_name,
            disabled: user.user_metadata?.disabled
          }
        }))
      }

      usersResponseSchema.parse(response)
      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in users handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
)