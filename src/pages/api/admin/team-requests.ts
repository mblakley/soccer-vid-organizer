import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables')
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      // Fetch all team requests with user details
      const { data: requests, error: requestsError } = await supabaseAdmin
        .from('team_requests')
        .select(`
          *,
          users (
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError

      res.status(200).json(requests)
    } catch (error: any) {
      console.error('Error fetching team requests:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, action, review_notes } = req.body

      if (!id || !action) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables')
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      if (action === 'approve') {
        // Start a transaction
        const { data: request, error: requestError } = await supabaseAdmin
          .from('team_requests')
          .select('*')
          .eq('id', id)
          .single()

        if (requestError) throw requestError

        // Create the new team
        const { data: team, error: teamError } = await supabaseAdmin
          .from('teams')
          .insert([{
            name: request.team_name,
            description: request.description
          }])
          .select()
          .single()

        if (teamError) throw teamError

        // Update all team members who requested this team name
        const { error: updateError } = await supabaseAdmin
          .from('team_members')
          .update({ team_id: team.id })
          .eq('team_id', '00000000-0000-0000-0000-000000000000')
          .in('user_id', (
            supabaseAdmin
              .from('team_requests')
              .select('user_id')
              .eq('team_name', request.team_name)
              .eq('status', 'pending')
          ))

        if (updateError) throw updateError

        // Update all related team requests
        const { error: requestsUpdateError } = await supabaseAdmin
          .from('team_requests')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: req.body.reviewer_id,
            review_notes
          })
          .eq('team_name', request.team_name)
          .eq('status', 'pending')

        if (requestsUpdateError) throw requestsUpdateError

        res.status(200).json({ success: true, team })
      } else if (action === 'reject') {
        const { error: updateError } = await supabaseAdmin
          .from('team_requests')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: req.body.reviewer_id,
            review_notes
          })
          .eq('id', id)

        if (updateError) throw updateError

        res.status(200).json({ success: true })
      } else {
        res.status(400).json({ error: 'Invalid action' })
      }
    } catch (error: any) {
      console.error('Error processing team request:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
} 