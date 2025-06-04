import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import type { AdminCreateUserApiResponse } from '@/lib/types/admin'
import { adminCreateUserRequestSchema, adminCreateUserResponseSchema } from '@/lib/types/admin'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<AdminCreateUserApiResponse>
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
      const createRequest = adminCreateUserRequestSchema.parse(req.body)
      const { email, password, metadata } = createRequest

      // Create user with Supabase Admin API
      const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata
      })

      if (createError) {
        console.error('Error creating user:', createError)
        throw new Error(createError.message)
      }

      if (!user) {
        throw new Error('User creation succeeded but no user data returned')
      }

      const response = {
        user: {
          id: user.user.id,
          email: user.user.email || null,
          created_at: user.user.created_at,
          user_metadata: user.user.user_metadata
        }
      }

      adminCreateUserResponseSchema.parse(response)
      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in create-user handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 