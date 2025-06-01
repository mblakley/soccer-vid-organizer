import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/auth'
import type { AdminCreateUserApiResponse } from '@/lib/types/admin'
import { adminCreateUserRequestSchema, adminCreateUserResponseSchema } from '@/lib/types/admin'
import { z } from 'zod'
import { AdminUserAttributes } from '@supabase/supabase-js'

// Placeholder for admin check - replace with your actual implementation
async function ensureAdmin(req: NextApiRequest): Promise<{ user: any; error?: ErrorResponse }> {
  const supabaseUserClient = getSupabaseClient(req.headers.authorization);
  const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    return { user: null, error: { error: 'Unauthorized' } };
  }
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) { 
      return { user: null, error: { error: 'Forbidden: Not an admin' } };
  }
  return { user };
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<AdminCreateUserApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    res.setHeader('Allow', ['POST']);
    return res.status(405).json(errorResponse);
  }

  const adminCheck = await ensureAdmin(req);
  if (adminCheck.error || !adminCheck.user) {
    return res.status(adminCheck.error?.error === 'Unauthorized' ? 401 : 403).json(adminCheck.error!);
  }

  try {
    const { email, password, display_name, metadata } = adminCreateUserRequestSchema.parse(req.body);
    
    const supabaseAdmin = getSupabaseClient(); // Uses service role key

    const userAttributes: AdminUserAttributes = {
      email,
      password,
      email_confirm: true, // Automatically confirm email for admin-created users
      user_metadata: {
        ...metadata, // Spread any additional metadata
        full_name: display_name
      }
    };

    const { data, error: createUserError } = await supabaseAdmin.auth.admin.createUser(userAttributes);

    if (createUserError) {
      console.error('Error creating user via admin:', createUserError);
      // Handle specific errors, e.g., user already exists
      if (createUserError.message.includes('User already exists')) {
        const errResp: ErrorResponse = { error: 'User with this email already exists' };
        return res.status(409).json(errResp); // 409 Conflict
      }
      throw new Error(`Failed to create user: ${createUserError.message}`);
    }
    
    if (!data || !data.user) {
        console.error('Admin user creation error: User data not returned after creation.');
        throw new Error('User creation failed: no user data returned from Supabase.');
    }

    const responseData = { user: data.user };
    adminCreateUserResponseSchema.parse(responseData); // Validate response
    
    return res.status(201).json(responseData);

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { 
        error: 'Invalid request body',
        // issues: error.issues 
      };
      return res.status(400).json(errorResponse);
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      // Check if status was already set (e.g., for 409)
      return res.status(res.statusCode && res.statusCode !== 200 ? res.statusCode : 500).json(errorResponse);
    }
    console.error('Error in admin/create-user API:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown internal server error occurred' };
    return res.status(500).json(errorResponse);
  }
} 