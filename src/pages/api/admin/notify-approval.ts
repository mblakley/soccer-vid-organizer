import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { sendTeamNotificationEmail } from '@/lib/emailClient'
import type { NotifyApprovalApiResponse } from '@/lib/types/admin'
import type { ErrorResponse } from '@/lib/types/api'
import {
  notifyApprovalRequestSchema,
  notifyApprovalResponseSchema
} from '@/lib/types/admin'
import { withApiAuth } from '@/lib/auth'

export default withApiAuth(
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<NotifyApprovalApiResponse>
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
      const { email, team_name, team_id } = notifyApprovalRequestSchema.parse(req.body)

      // Send notification email
      const result = await sendTeamNotificationEmail(
        email,
        team_name,
        team_id
      )

      const response = { 
        message: 'Notification email sent successfully',
        messageId: result.messageId
      }
      notifyApprovalResponseSchema.parse(response)
      return res.status(200).json(response)
    } catch (error) {
      if (error instanceof Error) {
        const errorResponse: ErrorResponse = {
          error: error.message
        }
        return res.status(400).json(errorResponse)
      }
      console.error('Error in notify-approval handler:', error)
      const errorResponse: ErrorResponse = {
        error: 'An unknown error occurred'
      }
      return res.status(500).json(errorResponse)
    }
  },
  { isUserAdmin: true }
) 