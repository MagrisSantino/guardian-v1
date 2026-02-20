import { createBrowserClient } from '@supabase/ssr'

// Usamos createBrowserClient para que la sesión se guarde en Cookies y el Middleware la detecte
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)