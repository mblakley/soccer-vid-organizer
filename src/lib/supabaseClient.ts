import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Client for server-side operations (using service role key - DO NOT EXPOSE TO CLIENT)
let supabaseAdminClient: SupabaseClient | null = null;

const getSupabaseAdminClient = () => {
  if (!supabaseAdminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      // This error should ideally only occur on the server if env vars are missing
      throw new Error('Supabase URL or Service Role Key is missing for Admin Client. Check server environment variables.');
    }
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdminClient;
};

// Client for client-side browser operations (using anon public key)
let supabaseBrowserClient: SupabaseClient | null = null;

export const getSupabaseBrowserClient = () => {
  if (!supabaseBrowserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL or Anon Key is missing. Check your .env.local file for NEXT_PUBLIC_ variables.');
    }
    supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseBrowserClient;
};


// Function to get a Supabase client, primarily for server-side use or specific scenarios
// If authHeader is provided, it creates a new client instance with that auth context (usually for server-side handling of user context).
// If no authHeader, it returns the admin client (intended for server-side admin tasks).
export function getSupabaseClient(authHeader?: string) {
  if (authHeader) {
    // For server-side API routes handling an authenticated user's request
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL or Anon Key is missing for user-context client. Check .env vars.');
    }
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      },
      auth: {
        autoRefreshToken: false, 
        persistSession: false
      }
    });
  }
  // For trusted server-side admin operations - ensures service key is loaded on demand server-side
  return getSupabaseAdminClient();
}