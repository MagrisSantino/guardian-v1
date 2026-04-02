'use client'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l18 18M8.288 8.288A7.501 7.501 0 0019.5 12M4.929 4.929A10.003 10.003 0 0019.07 19.07M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        <div className="mb-1 flex items-center justify-center gap-2">
          <span className="text-2xl font-black tracking-tight text-blue-600">Guardian</span>
        </div>
        <h1 className="mt-3 text-lg font-bold text-slate-900">Sin conexión</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          No hay internet disponible en este momento. Revisá tu conexión y volvé a intentarlo.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
        >
          Reintentar
        </button>
      </div>
    </main>
  )
}
