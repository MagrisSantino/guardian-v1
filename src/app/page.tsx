import Link from 'next/link'
import { ArrowRight, ShieldCheck, CalendarDays, Star, Zap, Clock, UserCheck } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50 selection:bg-blue-200">
      
      {/* 1. HERO SECTION (Encabezado principal) */}
      <section className="relative px-6 pt-24 pb-32 md:pt-36 md:pb-40 flex flex-col items-center text-center overflow-hidden">
        
        {/* --- MAGIA DEL FONDO --- */}
        {/* Imagen de fondo fotográfica (Hospital moderno/Médicos) */}
        <div className="absolute inset-0 -z-30 bg-[url('https://images.unsplash.com/photo-1551076805-e18690c5e561?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-fixed opacity-60"></div>
        
        {/* Capa de desenfoque y brillo (para que el texto negro se lea perfecto) */}
        <div className="absolute inset-0 -z-20 bg-slate-50/70 backdrop-blur-[3px]"></div>
        
        {/* Degradado para que se fusione perfectamente con la sección de abajo */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-slate-50/60 to-slate-50"></div>
        
        {/* Tu fondo decorativo azul sutil */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/20 rounded-full blur-3xl -z-10"></div>
        {/* ----------------------- */}

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-8 shadow-sm backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          La Red Médica #1 de Córdoba
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 max-w-4xl leading-[1.1] drop-shadow-sm">
          Conectamos talento médico con <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">oportunidades reales</span>
        </h1>
        
        <p className="mt-8 text-lg md:text-xl text-slate-700 max-w-2xl leading-relaxed font-semibold drop-shadow-sm">
          Guardian es el ecosistema inteligente que simplifica la cobertura de guardias. Sin intermediarios, sin demoras y con un sistema de reputación que premia la excelencia.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-md sm:max-w-none justify-center">
          <Link href="/registro" className="px-8 py-4 bg-slate-900 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 shadow-xl hover:shadow-blue-900/20 group">
            Crear mi Cuenta Libre
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login" className="px-8 py-4 bg-white/90 backdrop-blur-sm border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white rounded-xl font-bold transition-all text-center shadow-sm">
            Iniciar Sesión
          </Link>
        </div>
      </section>

      {/* 2. ESTADÍSTICAS RÁPIDAS (Banda de confianza) */}
      <section className="border-y border-slate-200 bg-white relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-100">
          <div className="text-center px-4">
            <p className="text-4xl font-black text-slate-900">0%</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Comisiones</p>
          </div>
          <div className="text-center px-4">
            <p className="text-4xl font-black text-slate-900">+500</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Guardias Cubiertas</p>
          </div>
          <div className="text-center px-4">
            <p className="text-4xl font-black text-slate-900">24/7</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Disponibilidad</p>
          </div>
          <div className="text-center px-4">
            <p className="text-4xl font-black text-slate-900">4.9</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Calificación Promedio</p>
          </div>
        </div>
      </section>

      {/* 3. CARACTERÍSTICAS (Los Recuadros) */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900">Todo lo que necesitas en un solo lugar</h2>
          <p className="mt-4 text-slate-500 text-lg">Herramientas diseñadas específicamente para la eficiencia del sector salud.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-shadow group">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Conexión Instantánea</h3>
            <p className="text-slate-600 leading-relaxed">Olvidate de los grupos de WhatsApp desorganizados. Postulate a guardias o encontrá médicos con un solo clic.</p>
          </div>
          {/* Card 2 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-shadow group">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Perfiles Verificados</h3>
            <p className="text-slate-600 leading-relaxed">Validamos las matrículas (MP/MN) de todos los profesionales para garantizar la máxima seguridad legal a las instituciones.</p>
          </div>
          {/* Card 3 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-shadow group">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Ecosistema de Confianza</h3>
            <p className="text-slate-600 leading-relaxed">El primer sistema de reputación bidireccional. Médicos y clínicas se califican mutuamente tras cada guardia finalizada.</p>
          </div>
          {/* Card 4 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-shadow group">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Agenda Inteligente</h3>
            <p className="text-slate-600 leading-relaxed">Visualizá tus guardias disponibles, postulaciones pendientes y turnos confirmados en un calendario codificado por colores.</p>
          </div>
          {/* Card 5 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-shadow group">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Alertas en Tiempo Real</h3>
            <p className="text-slate-600 leading-relaxed">Recibí notificaciones directas cuando te asignan una guardia, hay una vacante urgente o si alguien cancela a último momento.</p>
          </div>
          {/* Card 6 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-shadow group">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Gestión de Ausencias</h3>
            <p className="text-slate-600 leading-relaxed">Sistema de penalizaciones transparente para reducir el ausentismo y garantizar que las instituciones siempre estén cubiertas.</p>
          </div>
        </div>
      </section>

      {/* 4. SECCIÓN CÓMO FUNCIONA */}
      <section className="bg-slate-900 text-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black">¿Cómo funciona Guardian?</h2>
            <p className="mt-4 text-slate-400 text-lg">Tres simples pasos para revolucionar tu forma de trabajar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Línea conectora (solo visible en desktop) */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-slate-800 -z-0"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-black shadow-[0_0_30px_rgba(37,99,235,0.5)] border-4 border-slate-900 mb-6">1</div>
              <h3 className="text-xl font-bold mb-3">Creá tu Perfil</h3>
              <p className="text-slate-400 leading-relaxed">Registrate gratis, cargá tu matrícula, especialidades y años de experiencia para validar tu identidad.</p>
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-black shadow-[0_0_30px_rgba(37,99,235,0.5)] border-4 border-slate-900 mb-6">2</div>
              <h3 className="text-xl font-bold mb-3">Explorá o Publicá</h3>
              <p className="text-slate-400 leading-relaxed">Las clínicas publican sus necesidades. Los médicos filtran por valor, fecha y especialidad desde su Bolsa de Trabajo.</p>
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-black shadow-[0_0_30px_rgba(37,99,235,0.5)] border-4 border-slate-900 mb-6">3</div>
              <h3 className="text-xl font-bold mb-3">Match y Calificación</h3>
              <p className="text-slate-400 leading-relaxed">La clínica selecciona al mejor candidato basándose en sus estrellas. Al finalizar, ambos se evalúan mutuamente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. NUESTRO PROPÓSITO (Identidad) */}
      <section className="py-24 px-6 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">Nuestro Propósito</h2>
        <p className="text-xl text-slate-600 leading-relaxed font-medium mb-8">
          En Argentina, conseguir cobertura médica de urgencia suele ser un proceso caótico y desgastante. Guardian nace para profesionalizar esta conexión. Queremos que el foco de las instituciones esté en salvar vidas, no en buscar reemplazos, y que los médicos sean valorados justamente por su responsabilidad y trato humano.
        </p>
        <p className="text-blue-600 font-bold text-lg">Tecnología al servicio de la salud.</p>
      </section>

      {/* 6. BOTTOM CTA (Llamado a la acción final) */}
      <section className="bg-blue-50 py-24 px-6 text-center border-t border-blue-100">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">¿Listo para evolucionar tu gestión?</h2>
        <p className="text-slate-600 text-lg mb-10 max-w-2xl mx-auto">
          Unite a la comunidad médica más moderna hoy mismo. Es 100% gratis para profesionales de la salud.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/registro" className="px-10 py-4 bg-slate-900 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xl hover:shadow-blue-900/20 text-lg">
            Comenzar Ahora
          </Link>
          <Link href="/login" className="px-10 py-4 bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 rounded-xl font-bold transition-all shadow-sm text-lg">
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* 7. FOOTER SENCILLO */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-6 text-center border-t border-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-black tracking-tight text-white">Guardian</span>
          </div>
          <p className="text-sm">© 2026 Guardian. Plataforma de Salud. Todos los derechos reservados.</p>
          <div className="flex gap-4 text-sm font-medium">
            <a href="#" className="hover:text-white transition-colors">Soporte</a>
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
          </div>
        </div>
      </footer>

    </main>
  );
}