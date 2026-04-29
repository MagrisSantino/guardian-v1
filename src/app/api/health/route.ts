import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const start = Date.now()
  try {
    const admin = createSupabaseAdmin()
    const { error } = await admin.from('accounts').select('id').limit(1).maybeSingle()
    if (error) {
      return NextResponse.json(
        { ok: false, db: 'error', message: error.message, latency_ms: Date.now() - start },
        { status: 503 },
      )
    }
    return NextResponse.json({ ok: true, db: 'ok', latency_ms: Date.now() - start })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, db: 'error', message: msg, latency_ms: Date.now() - start }, { status: 503 })
  }
}
