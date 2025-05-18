import { NextApiRequest, NextApiResponse } from 'next'
import { sendTeamNotificationEmail } from '@/lib/emailClient'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, team_id, team_name } = req.body

  if (!email || !team_id || !team_name) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const result = await sendTeamNotificationEmail(email, team_name, team_id)
    return res.status(200).json({ message: 'Notification sent successfully', messageId: result.messageId })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'An error occurred' })
  }
} 