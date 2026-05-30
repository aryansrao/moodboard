import { createBrowserClient } from '@supabase/ssr'

// Shared browser Supabase client — safe in both Server and Client Components.
// Does NOT import next/headers, so it can be used anywhere.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
