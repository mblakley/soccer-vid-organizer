import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import {
  type AddTeamMemberApiResponse,
  addTeamMemberRequestSchema,
  addTeamMemberResponseSchema,
  type UpdateTeamMemberApiResponse,
  updateTeamMemberRequestSchema,
  updateTeamMemberResponseSchema,
  type RemoveTeamMemberApiResponse,
  removeTeamMemberRequestSchema,
  removeTeamMemberResponseSchema
} from '@/lib/types/admin'
// import { teamMemberSchema } from '@/lib/types/teams'; // Import if you have a specific teamMemberSchema for responses
import { z } from 'zod'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<AddTeamMemberApiResponse | UpdateTeamMemberApiResponse | RemoveTeamMemberApiResponse | ErrorResponse>
  ) {
    const supabaseAdmin = await getSupabaseClient(req.headers.authorization)

    try {
      if (req.method === 'POST') {
        const { team_id, user_id, role } = addTeamMemberRequestSchema.parse(req.body)

        const { data, error } = await supabaseAdmin
          .from('team_members')
          .insert({
            team_id,
            user_id,
            role,
            is_active: true
          })
          .select()
          .single()

        if (error) {
          console.error('Error adding team member:', error)
          throw new Error(error.message)
        }

        const response = { member: data }
        addTeamMemberResponseSchema.parse(response)
        return res.status(200).json(response)
      }

      if (req.method === 'PUT') {
        const { id, role } = updateTeamMemberRequestSchema.parse(req.body)

        const { data, error } = await supabaseAdmin
          .from('team_members')
          .update({ role, updated_at: new Date().toISOString() })
          .match({ id })
          .select()
          .single()

        if (error) {
          console.error('Error updating team member:', error)
          throw new Error(error.message)
        }

        const response = { member: data }
        updateTeamMemberResponseSchema.parse(response)
        return res.status(200).json(response)
      }

      if (req.method === 'DELETE') {
        const { id } = removeTeamMemberRequestSchema.parse(req.body)

        const { error } = await supabaseAdmin
          .from('team_members')
          .delete()
          .match({ id })

        if (error) {
          console.error('Error removing team member:', error)
          throw new Error(error.message)
        }

        const response = { success: true }
        removeTeamMemberResponseSchema.parse(response)
        return res.status(200).json(response)
      }

      const errorResponse: ErrorResponse = {
        error: 'Method not allowed'
      }
      return res.status(405).json(errorResponse)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in team-members handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 