import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-24">
      <h1 className="text-6xl font-bold tracking-tighter text-blue-500">
        Guardian
      </h1>
      <p className="mt-4 text-xl text-slate-400">
        El ecosistema profesional para la salud en Córdoba.
      </p>
      
      <div className="mt-10 flex flex-col md:flex-row gap-4">
        {/* Botón para Médicos: va al registro/perfil */}
        <Link 
          href="/registro" 
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition-all text-center"
        >
          Soy Médico
        </Link>

        {/* Botón para Clínicas: va a publicar guardia */}
        <Link 
          href="/publicar" 
          className="px-8 py-3 bg-white text-black hover:bg-slate-200 rounded-full font-semibold transition-all text-center"
        >
          Soy Clínica (Publicar)
        </Link>
      </div>

      <Link href="/dashboard" className="mt-8 text-slate-500 hover:text-blue-400 underline decoration-slate-700">
        Ver tablero de guardias activas
      </Link>
    </main>
  );
}