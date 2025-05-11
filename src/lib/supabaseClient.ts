import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Default client without auth header
export const supabase = createClient(supabaseUrl, supabaseKey);

// Function to get a client with custom auth header
export function getSupabaseClient(authHeader?: string) {
  if (!authHeader) {
    return supabase;
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
}