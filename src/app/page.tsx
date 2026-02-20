import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
      <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-blue-500">
        Guardian
      </h1>
      <p className="mt-6 text-xl text-slate-400 max-w-lg">
        El estándar profesional para la gestión de guardias médicas y talento en Córdoba.
      </p>
      
      <div className="mt-12 flex flex-col md:flex-row gap-4 w-full max-w-md justify-center">
        <Link 
          href="/login" 
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all text-center w-full md:w-auto shadow-lg shadow-blue-900/20"
        >
          Iniciar Sesión
        </Link>

        <Link 
          href="/registro" 
          className="px-8 py-3 bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 rounded-xl font-bold transition-all text-center w-full md:w-auto"
        >
          Crear Cuenta
        </Link>
      </div>
    </main>
  );
}