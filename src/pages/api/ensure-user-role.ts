import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { EnsureUserRoleApiResponse } from '@/lib/types/auth'
import {
  ensureUserRoleRequestSchema,
  ensureUserRoleResponseSchema
} from '@/lib/types/auth'
import { ErrorResponse } from '@/lib/types/api'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnsureUserRoleApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)

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

    // Validate request body
    const { userId } = ensureUserRoleRequestSchema.parse(req.body)

    // Verify the user is requesting their own role
    if (user.id !== userId) {
      const errorResponse: ErrorResponse = {
        error: 'Forbidden: You can only ensure your own user role'
      }
      return res.status(403).json(errorResponse)
    }

    // Call the ensure_user_role function
    // Note: Supabase client for rpc calls should be authenticated as the user,
    // or use service_role key if admin privileges are required for the rpc call itself.
    // The current setup uses the user's authenticated client.
    const { data, error: rpcError } = await supabase.rpc('ensure_user_role', {
      user_id_param: userId
    })

    if (rpcError) {
      console.error('Error calling ensure_user_role:', rpcError)
      throw new Error(rpcError.message)
    }

    const response = { success: true, data }
    ensureUserRoleResponseSchema.parse(response) // Validate response
    return res.status(200).json(response)
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      return res.status(400).json(errorResponse)
    }
    console.error('Error in ensure-user-role handler:', error)
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    return res.status(500).json(errorResponse)
  }
} 