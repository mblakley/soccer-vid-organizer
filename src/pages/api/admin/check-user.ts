import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import type { CheckUserApiResponse, CheckUserResponse } from '@/lib/types/admin'
import { checkUserRequestSchema, checkUserResponseSchema } from '@/lib/types/admin'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<CheckUserApiResponse>
  ) {
    if (req.method !== 'POST') {
      const errorResponse: ErrorResponse = { error: 'Method not allowed' }
      res.setHeader('Allow', ['POST'])
      return res.status(405).json(errorResponse)
    }

    try {
      const { email, teamId } = checkUserRequestSchema.parse(req.body)
      
      const supabase = await getSupabaseClient(req.headers.authorization)
      
      const { data: usersResponse, error: listUsersError } = await supabase.auth.admin.listUsers()
      
      if (listUsersError) {
        console.error('Error fetching users:', listUsersError)
        throw new Error(`Failed to fetch users: ${listUsersError.message}`)
      }

      const existingUser = usersResponse.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      
      let responseData: CheckUserResponse
      if (existingUser) {
        // Check if user is already a member of the team
        const { data: teamMember, error: teamMemberError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId)
          .eq('user_id', existingUser.id)
          .single()

        if (teamMemberError && teamMemberError.code !== 'PGRST116') {
          console.error('Error checking team membership:', teamMemberError)
          throw new Error(`Failed to check team membership: ${teamMemberError.message}`)
        }

        responseData = {
          exists: true,
          isTeamMember: !!teamMember,
          user: {
            id: existingUser.id,
            name: existingUser.user_metadata?.full_name || 'Unknown',
            email: existingUser.email || 'No email'
          }
        }
      } else {
        responseData = {
          exists: false,
          isTeamMember: false
        }
      }

      checkUserResponseSchema.parse(responseData)
      return res.status(200).json(responseData)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in check-user handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 