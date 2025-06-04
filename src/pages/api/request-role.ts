import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type {
  RequestRoleApiResponse
} from '@/lib/types/teams' // Updated import path
import {
  requestRoleSchema,
  requestRoleResponseSchema
} from '@/lib/types/teams' // Updated import path
import { ErrorResponse } from '@/lib/types/api'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RequestRoleApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('Error getting user:', userError)
      throw new Error(userError.message) // This will be caught by the outer catch block
    }

    if (!user) {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized'
      }
      return res.status(401).json(errorResponse)
    }

    const { requestedRole, teamId, playerName } = requestRoleSchema.parse(
      req.body
    )

    // Check if user already has a role request for this team
    // Note: Using the user's authenticated client for this check.
    // If admin privileges are needed to see all requests, this would need to change.
    const { data: existingRequest, error: checkError } = await supabase
      .from('team_member_requests') // Assuming this is the correct table name
      .select('id')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .maybeSingle() // Use maybeSingle to avoid error if no request exists

    if (checkError) {
      console.error('Error checking existing request:', checkError)
      throw new Error(checkError.message)
    }

    if (existingRequest) {
      const errorResponse: ErrorResponse = {
        error: 'You already have a pending role request for this team'
      }
      return res.status(400).json(errorResponse)
    }

    // Create the role request
    const { data: roleRequest, error: createError } = await supabase
      .from('team_member_requests') // Assuming this is the correct table name
      .insert({
        user_id: user.id,
        team_id: teamId,
        requested_roles: [requestedRole], // Assuming requested_roles is an array
        status: 'pending',
        additional_info: playerName ? { playerName } : undefined, // Store playerName in additional_info
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating role request:', createError)
      throw new Error(createError.message)
    }

    const response = { success: true, roleRequest }
    requestRoleResponseSchema.parse(response) // Validate response
    return res.status(200).json(response)
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's a Zod validation error
      if (error.name === 'ZodError') {
        const errorResponse: ErrorResponse = {
          error: 'Invalid request body',
          // issues: (error as any).issues // Optionally include Zod issues
        };
        return res.status(400).json(errorResponse);
      }
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      return res.status(400).json(errorResponse)
    }
    console.error('Error in request-role handler:', error)
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    return res.status(500).json(errorResponse)
  }
} 