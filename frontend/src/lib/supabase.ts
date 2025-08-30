import { createClient } from "@supabase/supabase-js";

// Client-side Supabase client (for browser usage) - lazy initialization
let supabaseClient: ReturnType<typeof createClient> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    if (!supabaseClient) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase environment variables are not configured");
      }

      supabaseClient = createClient(supabaseUrl, supabaseKey);
    }
    return supabaseClient[prop as keyof typeof supabaseClient];
  },
});

// Server-side Supabase client (for API routes with admin privileges)
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey);
};
