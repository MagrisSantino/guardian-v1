import { handleAuthCallback } from '../auth-callback-logic'

/** Alias del flujo de email de Supabase (docs usan /auth/confirm). Misma lógica que /auth/callback. */
export async function GET(request: Request) {
  return handleAuthCallback(request)
}
