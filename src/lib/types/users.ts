import { User as SupabaseUser } from '@supabase/supabase-js';
import { ErrorResponse } from './api';
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  app_metadata: z.record(z.unknown()),
  user_metadata: z.record(z.unknown()),
  aud: z.string(),
  confirmation_sent_at: z.string().datetime().optional(),
  recovery_sent_at: z.string().datetime().optional(),
  email_change_sent_at: z.string().datetime().optional(),
  new_email: z.string().email().optional(),
  new_phone: z.string().optional(),
  invited_at: z.string().datetime().optional(),
  action_link: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  created_at: z.string().datetime(),
  confirmed_at: z.string().datetime().optional(),
  email_confirmed_at: z.string().datetime().optional(),
  phone_confirmed_at: z.string().datetime().optional(),
  last_sign_in_at: z.string().datetime().optional(),
  role: z.string().optional(),
  updated_at: z.string().datetime().optional(),
  identities: z.array(z.unknown()).optional(),
  is_anonymous: z.boolean().optional(),
  is_sso_user: z.boolean().optional(),
  factors: z.array(z.unknown()).optional()
});

export type User = SupabaseUser;

export interface UserResponse {
  data: User;
  error?: ErrorResponse;
}

export interface UsersResponse {
  data: User[];
  error?: ErrorResponse;
}

export type UserApiResponse = UserResponse | ErrorResponse;
export type UsersApiResponse = UsersResponse | ErrorResponse; 