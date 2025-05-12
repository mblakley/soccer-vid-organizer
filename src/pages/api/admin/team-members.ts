import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { team_id, user_id, role } = req.body

      if (!team_id || !user_id || !role) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables')
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      // Add team member
      const { data: member, error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert([{ team_id, user_id, role }])
        .select()
        .single()

      if (memberError) {
        throw memberError
      }

      res.status(200).json(member)
    } catch (error: any) {
      console.error('Error adding team member:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, role } = req.body

      if (!id || !role) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables')
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      // Update team member role
      const { data: member, error: memberError } = await supabaseAdmin
        .from('team_members')
        .update({ role })
        .eq('id', id)
        .select()
        .single()

      if (memberError) {
        throw memberError
      }

      res.status(200).json(member)
    } catch (error: any) {
      console.error('Error updating team member:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Missing team member ID' })
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables')
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      // Remove team member
      const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .delete()
        .eq('id', id)

      if (memberError) {
        throw memberError
      }

      res.status(200).json({ success: true })
    } catch (error: any) {
      console.error('Error removing team member:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
} 