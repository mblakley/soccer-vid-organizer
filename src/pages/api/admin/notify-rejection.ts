import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { sendTeamNotificationEmail } from '@/lib/emailClient'
import type { NotifyRejectionApiResponse } from '@/lib/types/admin'
import type { ErrorResponse } from '@/lib/types/api'
import {
  notifyRejectionRequestSchema,
  notifyRejectionResponseSchema
} from '@/lib/types/admin'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<NotifyRejectionApiResponse>
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
      const { email, teamName, role, reason } = notifyRejectionRequestSchema.parse(req.body)

      // Send notification email
      await sendTeamNotificationEmail({
        to: email,
        teamName,
        role,
        type: 'rejection',
        reason
      })

      const response = { success: true }
      notifyRejectionResponseSchema.parse(response)
      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in notify-rejection handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 