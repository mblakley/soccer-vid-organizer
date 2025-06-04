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
    supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
  }
  return supabaseBrowserClient;
};

// Function to get a Supabase client for API routes
export async function getSupabaseClient(authHeader?: string) {
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is missing. Check .env vars.');
  }

  // Create a client to verify the user's token
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await tempClient.auth.getUser(token);
  
  if (error || !user) {
    console.error('Error verifying user token:', error);
    throw new Error('Invalid or expired token');
  }

  console.log('API request initiated by user:', user.id, user.email);

  // Return the admin client for database operations
  return getSupabaseAdminClient();
}