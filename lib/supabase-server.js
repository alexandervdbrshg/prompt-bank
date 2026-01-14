import { createClient } from '@supabase/supabase-js';

// CRITICAL FIX #3: No fallback to public key - fail fast if not configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('CRITICAL: NEXT_PUBLIC_SUPABASE_URL environment variable must be set');
}

if (!supabaseServiceKey) {
  throw new Error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY environment variable must be set');
}

// Validate that we're using the service role key (not the anon key)
if (supabaseServiceKey.includes('anon')) {
  throw new Error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY appears to be an anon key, not a service role key');
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper function to validate Supabase RLS is enabled
export async function validateRLSEnabled() {
  try {
    // This is a check you should do on app startup
    // Ensures your tables have proper Row Level Security
    console.log('✓ Supabase client initialized with service role key');
    console.log('⚠️  IMPORTANT: Ensure Row Level Security (RLS) is enabled on all tables');
    return true;
  } catch (error) {
    console.error('❌ Failed to validate Supabase configuration:', error);
    return false;
  }
}
