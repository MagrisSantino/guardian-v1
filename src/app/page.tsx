import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-slate-900">
        Guardian
      </h1>
      <p className="mt-6 text-lg text-slate-500 max-w-lg leading-relaxed">
        Sistema integral de gestión de guardias médicas. Controla tus turnos y visualiza tus objetivos en tiempo real.
      </p>
      
      <div className="mt-10 flex flex-col md:flex-row gap-4 w-full max-w-md justify-center">
        <Link 
          href="/login" 
          className="px-8 py-3.5 bg-slate-900 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-center w-full md:w-auto shadow-lg hover:shadow-blue-200"
        >
          Iniciar Sesión
        </Link>

        <Link 
          href="/registro" 
          className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-all text-center w-full md:w-auto shadow-sm"
        >
          Crear Cuenta
        </Link>
      </div>
    </main>
  );
}