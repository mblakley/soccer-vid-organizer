import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { UsersApiResponse, ErrorResponse } from '@/lib/types/auth'
import { usersResponseSchema } from '@/lib/types/auth'

export default async function handler(
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
} 