import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import type { TeamRequestsApiResponse, TeamRequest } from '@/lib/types/teams'
import { teamRequestsResponseSchema } from '@/lib/types/teams'
import type {
  ProcessTeamRequestApiResponse,
  ApproveTeamResponse,
  RejectTeamResponse
} from '@/lib/types/admin'
import {
  processTeamRequestSchema,
  approveTeamResponseSchema,
  rejectTeamResponseSchema
} from '@/lib/types/admin'
import { withApiAuth } from '@/lib/auth'

const PENDING_TEAM_ID_FOR_NEW_REQUESTS = '00000000-0000-0000-0000-000000000000' // The placeholder ID

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<TeamRequestsApiResponse | ProcessTeamRequestApiResponse>
  ) {
    const supabaseAdmin = await getSupabaseClient(req.headers.authorization)

    if (req.method === 'GET') {
      try {
        const { data, error } = await supabaseAdmin
          .from('team_requests')
          .select('*, user:users(email, user_metadata->>full_name)')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching team requests:', error)
          throw new Error(error.message)
        }

        const response = { requests: data || [] }
        teamRequestsResponseSchema.parse(response)
        return res.status(200).json(response)
      } catch (error) {
        if (error instanceof Error) {
          const errorResponse: ErrorResponse = {
            error: error.message
          }
          return res.status(400).json(errorResponse)
        }
        console.error('Error in team-requests handler:', error)
        const errorResponse: ErrorResponse = {
          error: 'An unknown error occurred'
        }
        return res.status(500).json(errorResponse)
      }
    }

    if (req.method === 'POST') {
      try {
        const { id, action, review_notes } = processTeamRequestSchema.parse(req.body)

        // Get the request details
        const { data: request, error: requestError } = await supabaseAdmin
          .from('team_requests')
          .select('*')
          .eq('id', id)
          .single()

        if (requestError) {
          console.error('Error fetching team request:', requestError)
          throw new Error(requestError.message)
        }

        if (!request) {
          throw new Error('Team request not found')
        }

        if (request.status !== 'pending') {
          throw new Error('Team request is not pending')
        }

        if (action === 'approve') {
          // Create team member record
          const { data: team, error: memberError } = await supabaseAdmin
            .from('team_members')
            .insert({
              team_id: request.team_id,
              user_id: request.user_id,
              role: request.requested_roles[0], // Use first requested role
              is_active: true
            })
            .select()
            .single()

          if (memberError) {
            console.error('Error creating team member:', memberError)
            throw new Error(memberError.message)
          }

          // Update request status
          const { error: updateError } = await supabaseAdmin
            .from('team_requests')
            .update({
              status: 'approved',
              reviewed_by: (req as any).user.id,
              reviewed_at: new Date().toISOString(),
              review_notes
            })
            .eq('id', id)

          if (updateError) {
            console.error('Error updating team request:', updateError)
            throw new Error(updateError.message)
          }

          const response: ApproveTeamResponse = { success: true, team }
          approveTeamResponseSchema.parse(response)
          return res.status(200).json(response)
        }

        if (action === 'reject') {
          // Update request status
          const { error: updateError } = await supabaseAdmin
            .from('team_requests')
            .update({
              status: 'rejected',
              reviewed_by: (req as any).user.id,
              reviewed_at: new Date().toISOString(),
              review_notes
            })
            .eq('id', id)

          if (updateError) {
            console.error('Error updating team request:', updateError)
            throw new Error(updateError.message)
          }

          const response: RejectTeamResponse = { success: true }
          rejectTeamResponseSchema.parse(response)
          return res.status(200).json(response)
        }

        throw new Error('Invalid action')
      } catch (error) {
        if (error instanceof Error) {
          const errorResponse: ErrorResponse = {
            error: error.message
          }
          return res.status(400).json(errorResponse)
        }
        console.error('Error in team-requests handler:', error)
        const errorResponse: ErrorResponse = {
          error: 'An unknown error occurred'
        }
        return res.status(500).json(errorResponse)
      }
    }

    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  },
  { isUserAdmin: true }
) 