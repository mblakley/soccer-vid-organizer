import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Starting /api/reviews/creator-names handler')
    
    const { teamMemberIds } = req.body

    if (!Array.isArray(teamMemberIds)) {
      return res.status(400).json({ error: 'teamMemberIds must be an array' })
    }

    console.log('Received teamMemberIds:', teamMemberIds)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      })
      throw new Error('Missing Supabase environment variables')
    }

    // Initialize Supabase client with admin privileges
    console.log('Initializing Supabase client')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // First get team_members records to get user_ids
    console.log('Fetching team members...')
    const { data: teamMembers, error: teamError } = await supabaseAdmin
      .from('team_members')
      .select('id, user_id')
      .in('id', teamMemberIds)

    if (teamError) {
      console.error('Error fetching team members:', teamError)
      throw new Error(`Failed to fetch team members: ${teamError.message}`)
    }

    console.log('Team members found:', teamMembers)

    // Create a map of team_member_id to user_id
    const teamMemberToUserMap: Record<string, string> = {}
    teamMembers?.forEach(member => {
      teamMemberToUserMap[member.id] = member.user_id
    })

    // Get unique user IDs
    const userIds = [...new Set(Object.values(teamMemberToUserMap))]
    console.log('Unique user IDs:', userIds)

    // Get user names from auth API
    console.log('Fetching users from auth API...')
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    console.log('Users found:', users?.length)

    // Create a map of user_id to full_name
    const userToNameMap: Record<string, string> = {}
    users?.forEach(user => {
      if (userIds.includes(user.id)) {
        userToNameMap[user.id] = user.user_metadata?.full_name || 'Unknown'
      }
    })

    // Create final map of team_member_id to full_name
    const nameMap: Record<string, string> = {}
    Object.entries(teamMemberToUserMap).forEach(([teamMemberId, userId]) => {
      nameMap[teamMemberId] = userToNameMap[userId] || 'Unknown'
    })

    console.log('Final name map:', nameMap)
    res.status(200).json(nameMap)
  } catch (error: any) {
    console.error('Error in creator-names API:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
} 