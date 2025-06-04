import type { NextApiRequest, NextApiResponse } from 'next'
import { AdminUserAttributes } from '@supabase/supabase-js'
import type { SignupRequest, SignupApiResponse } from '@/lib/types/auth'
import { signupSchema, signupResponseSchema } from '@/lib/types/auth'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { Team } from '@/lib/types/teams'
import { v4 as uuidv4 } from 'uuid'
import { withApiAuth } from '@/lib/auth'
import { ErrorResponse } from '@/lib/types/api'

async function signupHandler(
  req: NextApiRequest,
  res: NextApiResponse<SignupApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    const signupRequest: SignupRequest = signupSchema.parse(req.body)

    const userAttributes: AdminUserAttributes = {
      email: signupRequest.email,
      password: signupRequest.password,
      email_confirm: true,
      user_metadata: {
        display_name: signupRequest.full_name
      }
    }

    const supabaseClient = await getSupabaseClient()

    const { data, error: signUpError } = await supabaseClient.auth.admin.createUser(userAttributes)

    if (signUpError) {
      console.error('Error signing up:', signUpError)
      throw new Error(signUpError.message)
    }
    
    if (!data || !data.user) {
        console.error('Signup error: User data not returned after creation.');
        throw new Error('User creation failed: no user data returned.');
    }

    const createdUser = data.user;
    let finalTeamId = signupRequest.team_id;
    let teamJustCreated = false;

    if (signupRequest.new_team_name) {
      const newTeam: Omit<Team, 'created_at' | 'updated_at' | 'member_count' | 'additional_info' | 'age_group' | 'club_affiliation' | 'gender' | 'season'> = {
        id: uuidv4(),
        name: signupRequest.new_team_name,
      };

      const { data: newTeamData, error: newTeamError } = await supabaseClient
        .from('teams')
        .insert(newTeam)
        .select()
        .single();

      if (newTeamError) {
        console.error('Error creating new team:', newTeamError);
        throw new Error(`User signed up, but failed to create new team: ${newTeamError.message}`);
      }
      finalTeamId = newTeamData.id;
      teamJustCreated = true;
      console.log(`New team created with ID: ${finalTeamId}`);
    }

    if (finalTeamId && signupRequest.role) {
      const roleToRequest = teamJustCreated ? (signupRequest.role || 'admin') : signupRequest.role;

      const { error: requestError } = await supabaseClient
        .from('team_member_requests')
        .insert({
          user_id: createdUser.id,
          team_id: finalTeamId,
          requested_roles: [roleToRequest],
          status: 'pending'
        })

      if (requestError) {
        console.error('Error creating team member request:', requestError)
        throw new Error(`User signed up, but failed to create team member request: ${requestError.message}`)
      }
      console.log(`Team member request created for user ${createdUser.id} and team ${finalTeamId} with role ${roleToRequest}`);
    }

    const responseData = { user: createdUser };
    signupResponseSchema.parse(responseData);
    
    return res.status(200).json(responseData)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    const statusCode = error instanceof Error && error.name === 'ZodError' ? 400 : 500;

    console.error('Error in signup handler:', error);
    const errorResponse: ErrorResponse = { error: message };
    return res.status(statusCode).json(errorResponse);
  }
}

// Wrap the handler with withApiAuth, but allow unauthenticated access since this is a signup endpoint
export default withApiAuth(signupHandler, { allowUnauthenticated: true }) 