import type { NextApiRequest, NextApiResponse } from 'next'
import type { GoogleOAuthApiResponse, ErrorResponse, GoogleOAuthRequest } from '@/lib/types/auth'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { googleOAuthRequestSchema, googleOAuthResponseSchema } from '@/lib/types/auth'
import { OAuthResponse } from '@supabase/supabase-js'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GoogleOAuthApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      error: 'Method not allowed'
    }
    return res.status(405).json(errorResponse)
  }

  try {
    // The google OAuth endpoint does not require an existing session/authorization header.
    // It's used to initiate a new login flow.
    const supabase = getSupabaseClient()

    // Validate request body
    const parsedBody: GoogleOAuthRequest = googleOAuthRequestSchema.parse(req.body)
    const teamId = parsedBody.team_id;

    // Build the redirect URL carefully to prevent open redirect vulnerabilities.
    // Ensure NEXT_PUBLIC_APP_URL is correctly set and trusted.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
        console.error('Error: NEXT_PUBLIC_APP_URL is not set.');
        throw new Error('Application URL is not configured.');
    }
    const redirectToUrl = new URL('/login', appUrl);
    if (teamId) {
      redirectToUrl.searchParams.set('team_id', teamId);
    }

    const oauthResponse: OAuthResponse = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectToUrl.toString(),
        // queryParams can be used if additional static params are needed for the provider
        // For dynamic params like team_id, including them in redirectTo is standard
      }
    });

    if (oauthResponse.error) {
      console.error('Error initiating Google OAuth:', oauthResponse.error)
      throw new Error(oauthResponse.error.message)
    }

    if (!oauthResponse.data.url) {
        console.error('Google OAuth error: No URL returned from Supabase.');
        throw new Error('Failed to get OAuth URL.');
    }

    const responseData = { url: oauthResponse.data.url };
    googleOAuthResponseSchema.parse(responseData);
    
    return res.status(200).json(responseData)
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        error: error.message
      }
      // ZodError would imply a 400 bad request (malformed team_id etc.)
      return res.status(error.name === 'ZodError' ? 400 : 500).json(errorResponse) 
    }
    const errorResponse: ErrorResponse = {
      error: 'An unknown error occurred'
    }
    console.error('Error in Google OAuth handler:', error)
    return res.status(500).json(errorResponse)
  }
} 