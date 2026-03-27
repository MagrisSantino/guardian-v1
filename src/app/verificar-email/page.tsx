'use client'

import Link from 'next/link'
import { ArrowLeft, MailCheck } from 'lucide-react'

export default function VerificarEmailPage() {
  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #94a3b8 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[120px]" />
        <div className="absolute -top-20 right-0 h-[400px] w-[400px] rounded-full bg-blue-300/8 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 h-[450px] w-[450px] rounded-full bg-blue-500/6 blur-[130px]" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
        <div className="w-full max-w-lg">
          <div className="relative rounded-3xl bg-white shadow-2xl shadow-blue-900/5 border border-slate-100/80 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500" />
            <div className="px-8 py-10 md:px-10">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50">
                <MailCheck className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-center text-2xl font-bold text-slate-900 tracking-tight">
                ¡Casi listo!
              </h1>
              <p className="mt-3 text-center text-sm text-slate-600 leading-relaxed">
                Hemos enviado un enlace de confirmación a tu correo. Por favor,
                hacé clic en el enlace para activar tu cuenta. No olvides
                revisar la carpeta de Spam.
              </p>
              <Link
                href="/login"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-blue-700/30 active:scale-[0.98]"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
