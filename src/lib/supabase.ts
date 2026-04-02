import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

// Cliente singleton — sesión guardada en cookies para que el middleware la lea.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

/**
 * createBrowserClient fuerza flowType='pkce'. Con PKCE, el link de confirmación
 * lleva ?code= que solo puede canjearse en el navegador original (el code_verifier
 * está en sus cookies). Si se abre el mail en otro dispositivo, falla.
 *
 * Cambiando a 'implicit' el signup/resetPasswordForEmail no envían code_challenge
 * a GoTrue, así que el mail redirige con #access_token=... o ?token_hash=...,
 * ambos formatos que funcionan desde cualquier dispositivo.
 *
 * La mutación es segura: ocurre antes de que initialize() lea flowType,
 * ya que la adquisición del lock (Web Locks API o lockNoOp) siempre cede
 * el hilo de JS antes de ejecutar _initialize().
 */
;(supabase.auth as unknown as { flowType: string }).flowType = 'implicit'
