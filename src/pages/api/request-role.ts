import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[API] request-role: Starting handler');
  
  if (req.method !== 'POST') {
    console.log('[API] request-role: Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[API] request-role: Missing/invalid auth header');
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    // Extract the token
    const token = authHeader.split(' ')[1]
    console.log('[API] request-role: Got auth token');

    // Create a Supabase client with the user's token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    console.log('[API] request-role: Created supabase client');
    
    // Get the user info using the authenticated client
    const { data: userData, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !userData.user) {
      console.log('[API] request-role: Auth error:', userError);
      return res.status(401).json({ error: 'Not authenticated' })
    }
    
    console.log('[API] request-role: User authenticated:', userData.user.id);
    
    const { requestedRole, teamId, playerName } = req.body
    console.log('[API] request-role: Request body:', { requestedRole, teamId, playerName });
    
    if (!requestedRole) {
      console.log('[API] request-role: Missing requested role');
      return res.status(400).json({ error: 'Missing requested role' })
    }
    
    // Validate the role is one of the allowed values
    const validRoles = ['coach', 'player', 'parent', 'manager']
    if (!validRoles.includes(requestedRole)) {
      console.log('[API] request-role: Invalid role:', requestedRole);
      return res.status(400).json({ error: 'Invalid role requested' })
    }

    // Validate player name is provided for parent role
    if (requestedRole === 'parent' && (!playerName || !playerName.trim())) {
      console.log('[API] request-role: Missing player name for parent role');
      return res.status(400).json({ error: 'Player\'s name is required for parent role requests' })
    }

    // Initialize Supabase admin client for more privileged operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    console.log('[API] request-role: Created admin client');
    
    // Handle team-specific role request
    if (teamId) {
      // First check if the team exists
      console.log('[API] request-role: Checking if team exists:', teamId);
      const { data: team, error: teamError } = await supabaseAdmin
        .from('teams')
        .select('id, name')
        .eq('id', teamId)
        .single()
      
      if (teamError) {
        console.error('[API] request-role: Error finding team:', teamError);
        return res.status(404).json({ error: 'Team not found' })
      }
      
      console.log('[API] request-role: Team found:', team.name);
      
      // Check if user is already a member of the team
      console.log('[API] request-role: Checking team membership');
      const { data: existingMember, error: memberError } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userData.user.id)
        .eq('is_active', true)
        .maybeSingle()
      
      if (memberError && memberError.code !== 'PGRST116') { // PGRST116 is not found
        console.error('[API] request-role: Error checking team membership:', memberError);
        return res.status(500).json({ error: 'Failed to check team membership' })
      }
      
      // If user is not a team member, create a request to join the team
      if (!existingMember) {
        console.log('[API] request-role: User is not a team member, creating join request');
        
        // Check if a pending request already exists
        const { data: existingRequest, error: existingRequestError } = await supabaseAdmin
          .from('team_member_requests')
          .select('*')
          .eq('team_id', teamId)
          .eq('user_id', userData.user.id)
          .eq('status', 'pending')
          .maybeSingle();
        
        if (existingRequest) {
          // If request exists, update it to include the new role (if it's not already included)
          console.log('[API] request-role: Existing request found, updating it');
          
          const updatedRoles = [...new Set([...existingRequest.requested_roles, requestedRole])];
          
          // Add additional_info for parent role if provided
          const additionalInfo = {...(existingRequest.additional_info || {})};
          if (requestedRole === 'parent' && playerName) {
            additionalInfo.playerName = playerName.trim();
          }
          
          const { data: updatedRequest, error: updateError } = await supabaseAdmin
            .from('team_member_requests')
            .update({ 
              requested_roles: updatedRoles,
              additional_info: additionalInfo,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRequest.id)
            .select();
            
          if (updateError) {
            console.error('[API] request-role: Error updating team join request:', updateError);
            return res.status(500).json({ error: 'Failed to update team join request' });
          }
          
          return res.status(200).json({ 
            success: true, 
            message: `Your request has been updated to include the "${requestedRole}" role`
          });
        }
        
        // Prepare additional_info for parent role
        const additionalInfo: Record<string, any> = {};
        if (requestedRole === 'parent' && playerName) {
          additionalInfo.playerName = playerName.trim();
        }
        
        const requestData = {
          team_id: teamId,
          user_id: userData.user.id,
          requested_roles: [requestedRole],
          additional_info: Object.keys(additionalInfo).length > 0 ? additionalInfo : null,
          status: 'pending'
        };
        
        console.log('[API] request-role: Inserting request with data:', requestData);
        
        const { data: request, error: requestError } = await supabaseAdmin
          .from('team_member_requests')
          .insert([requestData])
          .select()
        
        if (requestError) {
          // If it's a duplicate, return a more helpful message
          if (requestError.code === '23505') { // Unique violation
            console.log('[API] request-role: Duplicate request detected');
            return res.status(409).json({ 
              error: 'You already have a pending request to join this team' 
            })
          }
          
          console.error('[API] request-role: Error creating team join request:', requestError);
          return res.status(500).json({ error: 'Failed to create team join request' })
        }
        
        console.log('[API] request-role: Request created successfully:', request);
        
        return res.status(200).json({ 
          success: true, 
          message: `Request to join team with role "${requestedRole}" submitted for approval` 
        })
      }
      
      // User is already a member, check if they already have the role
      const { data: existingRole, error: roleError } = await supabaseAdmin
        .from('team_member_roles')
        .select('id')
        .eq('team_member_id', existingMember.id)
        .eq('role', requestedRole)
        .maybeSingle()
      
      if (roleError && roleError.code !== 'PGRST116') { // PGRST116 is not found
        console.error('Error checking existing role:', roleError)
        return res.status(500).json({ error: 'Failed to check existing role' })
      }
      
      if (existingRole) {
        return res.status(409).json({ 
          error: `You already have the "${requestedRole}" role in this team` 
        })
      }
      
      // Check for existing role request
      const { data: existingRoleRequest, error: existingRoleRequestError } = await supabaseAdmin
        .from('team_member_role_requests')
        .select('id')
        .eq('team_member_id', existingMember.id)
        .eq('requested_role', requestedRole)
        .eq('status', 'pending')
        .maybeSingle();
        
      if (existingRoleRequest) {
        return res.status(409).json({ 
          error: `You already have a pending request for the "${requestedRole}" role in this team` 
        });
      }
      
      // Prepare additional_info for parent role
      const additionalInfo: Record<string, any> = {};
      if (requestedRole === 'parent' && playerName) {
        additionalInfo.playerName = playerName.trim();
      }
      
      // Create a role request for the existing team member
      const { data: roleRequest, error: roleRequestError } = await supabaseAdmin
        .from('team_member_role_requests')
        .insert([{
          team_member_id: existingMember.id,
          requested_role: requestedRole,
          additional_info: Object.keys(additionalInfo).length > 0 ? additionalInfo : null,
          status: 'pending'
        }])
        .select()
        .single()
      
      if (roleRequestError) {
        // If it's a duplicate, return a more helpful message
        if (roleRequestError.code === '23505') { // Unique violation
          return res.status(409).json({ 
            error: `You already have a pending request for the "${requestedRole}" role in this team` 
          })
        }
        
        console.error('Error creating role request:', roleRequestError)
        return res.status(500).json({ error: 'Failed to create role request' })
      }
      
      return res.status(200).json({ 
        success: true, 
        message: `Role "${requestedRole}" request submitted for approval` 
      })
    }
    else {
      // This section would handle global roles (if needed)
      // Currently we're not using global roles, so return an error
      console.log('[API] request-role: No team ID provided');
      return res.status(400).json({ error: 'Team ID is required' })
    }
  } catch (error: any) {
    console.error('[API] request-role: Unhandled error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' })
  }
} 