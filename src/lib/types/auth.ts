import { z } from 'zod';
import type { User as SupabaseUser, Subscription, Session } from '@supabase/supabase-js'

// Schema for signup request body
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['admin', 'coach', 'player']).optional(),
  team_id: z.string().uuid('Invalid team ID').optional(),
  new_team_name: z.string().min(1, 'New team name is required if creating a new team').optional(),
  new_team_description: z.string().optional(),
});

// Type inferred from the schema
export type SignupRequest = {
  email: string;
  password: string;
  full_name: string;
  role?: 'admin' | 'coach' | 'player';
  team_id?: string;
  new_team_name?: string;
  new_team_description?: string;
};

// Schema for signup response
export const signupResponseSchema = z.object({
  user: z.any(), // Using z.any() for the Supabase user object returned by auth.admin.createUser
  error: z.string().optional() // Keep error optional as per original SignupResponse
});

export type SignupResponse = z.infer<typeof signupResponseSchema>;
export type SignupApiResponse = SignupResponse | ErrorResponse;

export const authSessionResponseSchema = z.object({
  session: z.any() // Supabase Session object can be complex
});

export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
export type AuthSessionApiResponse = AuthSessionResponse | ErrorResponse;

export interface AuthUserResponse {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
    };
  };
}

export interface ErrorResponse {
  error: string;
}

export interface AuthSubscriptionResponse {
  subscription?: Subscription;
  error?: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthResetPasswordRequest {
  email: string;
}

export interface UserResponse {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  userError?: {
    message: string;
  };
}

export const getUserResponseSchema = z.object({
  user: z.any() // Using z.any() for the Supabase user object for now
});

export type GetUserResponse = z.infer<typeof getUserResponseSchema>;
export type GetUserApiResponse = GetUserResponse | ErrorResponse;

export const signoutResponseSchema = z.object({
  success: z.boolean()
});

export type SignoutResponse = z.infer<typeof signoutResponseSchema>;
export type SignoutApiResponse = SignoutResponse | ErrorResponse;

export const updateUserRoleSchema = z.object({
  id: z.string().uuid(),
  isAdmin: z.boolean()
})

export type UpdateUserRoleRequest = z.infer<typeof updateUserRoleSchema>

export type UpdateUserRoleResponse = {
  success?: boolean
  error?: string
}

export type UpdateUserRoleApiResponse = UpdateUserRoleResponse | ErrorResponse 

export const userWithRoleSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  is_admin: z.boolean(),
  created_at: z.string(),
  last_sign_in_at: z.string().nullable(),
  user_metadata: z.object({
    full_name: z.string().optional(),
    disabled: z.boolean().optional()
  }).optional()
})

export const usersWithRolesResponseSchema = z.object({
  users: z.array(userWithRoleSchema),
  error: z.string().optional()
})

export type UserWithRole = z.infer<typeof userWithRoleSchema>

export type UsersWithRolesResponse = {
  users: UserWithRole[]
  error?: string
}

export type UsersWithRolesApiResponse = UsersWithRolesResponse | ErrorResponse 

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  created_at: z.string(),
  last_sign_in_at: z.string().nullable(),
  user_metadata: z.object({
    full_name: z.string().optional(),
    disabled: z.boolean().optional()
  }).optional()
})

export const usersResponseSchema = z.object({
  users: z.array(userSchema),
  error: z.string().optional()
})

export type User = z.infer<typeof userSchema>

export type UsersResponse = {
  users: User[]
  error?: string
}

export type UsersApiResponse = UsersResponse | ErrorResponse 

export const ensureUserRoleRequestSchema = z.object({
  userId: z.string().uuid()
})

export const ensureUserRoleResponseSchema = z.object({
  success: z.boolean(),
  data: z.any() // Adjust this if the shape of 'data' is known
})

export type EnsureUserRoleRequest = z.infer<typeof ensureUserRoleRequestSchema>
export type EnsureUserRoleResponse = z.infer<typeof ensureUserRoleResponseSchema>
export type EnsureUserRoleApiResponse = EnsureUserRoleResponse | ErrorResponse 

export const googleOAuthRequestSchema = z.object({
  team_id: z.string().uuid().optional()
});

export const googleOAuthResponseSchema = z.object({
  url: z.string().url() // Expecting a URL string
});

// Adjust GoogleOAuthResponse to use the schema if it wasn't already
export type GoogleOAuthRequest = z.infer<typeof googleOAuthRequestSchema>;
export type GoogleOAuthResponse = z.infer<typeof googleOAuthResponseSchema>;
export type GoogleOAuthApiResponse = GoogleOAuthResponse | ErrorResponse; // Added for consistency 