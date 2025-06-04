import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { UsersWithRolesApiResponse } from '@/lib/types/auth'
import type { ErrorResponse } from '@/lib/types/api'
import { usersWithRolesResponseSchema } from '@/lib/types/auth'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<UsersWithRolesApiResponse>
  ) {
    if (req.method !== 'GET') {
      const errorResponse: ErrorResponse = {
        error: 'Method not allowed'
      }
      return res.status(405).json(errorResponse)
    }

    try {
      const supabase = await getSupabaseClient(req.headers.authorization)

      // Fetch all users with admin status from user_roles table
      const { data: roleData, error: roleFetchError } = await supabase
        .from('user_roles')
        .select('user_id, is_admin')

      if (roleFetchError) {
        console.error('Error fetching roles:', roleFetchError)
        throw new Error(roleFetchError.message)
      }

      // If no users with roles, return empty array
      if (!roleData || roleData.length === 0) {
        return res.status(200).json({ users: [] })
      }

      // Get all users from auth.users
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

      if (usersError) {
        console.error('Error fetching users:', usersError)
        throw new Error(usersError.message)
      }

      // Fetch team members to check for associations
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('is_active', true)

      if (teamMembersError) {
        console.error('Error fetching team members:', teamMembersError)
        throw new Error(teamMembersError.message)
      }

      // Create a set of user IDs that are associated with team members
      const teamMemberUserIds = new Set(teamMembers?.map(member => member.user_id) || [])

      // Combine user data with their admin status and filter out unassociated temp users
      const usersWithRoles = users.users
        .filter(user => {
          // Include user if:
          // 1. Not a temp user OR
          // 2. Is a temp user but is associated with a team member
          return !user.email?.startsWith('temp_') || 
                 !user.email?.endsWith('@placeholder.com') || 
                 teamMemberUserIds.has(user.id)
        })
        .map(user => {
          const userRole = roleData?.find(r => r.user_id === user.id)
          return {
            id: user.id,
            email: user.email || null,
            is_admin: userRole?.is_admin || false,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || null,
            user_metadata: {
              full_name: user.user_metadata?.full_name,
              disabled: user.user_metadata?.disabled
            }
          }
        })

      const response = { users: usersWithRoles }
      usersWithRolesResponseSchema.parse(response)
      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in users-with-roles handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 