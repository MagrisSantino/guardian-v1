import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

// Sesión en cookies para el middleware (SSR).
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// createBrowserClient fuerza flowType "pkce"; con PKCE el enlace de confirmación trae ?code= y el
// intercambio exige el code_verifier guardado en **ese mismo navegador**. Si el usuario se registra
// en la PC y abre el mail en el celular, falla. Con "implicit" no se manda code_challenge al
// signup/recover y el mail redirige con token_hash en query, que /auth/callback resuelve en servidor.
;(supabase.auth as unknown as { flowType: 'implicit' | 'pkce' }).flowType = 'implicit'