import {
  Zap,
  ShieldCheck,
  Star,
  CalendarDays,
  Bell,
  UserX,
} from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Conexión Instantánea",
    description:
      "Olvidate de los grupos de WhatsApp desorganizados. Postulate a guardias y encontrá médicos con un solo clic.",
    span: "lg:col-span-2",
  },
  {
    icon: ShieldCheck,
    title: "Perfiles Verificados",
    description:
      "Validamos las matrículas (MP/MN) de todos los profesionales para garantizar la máxima seguridad legal a las instituciones.",
    span: "lg:col-span-1",
  },
  {
    icon: Star,
    title: "Ecosistema de Confianza",
    description:
      "El primer sistema de reputación bidireccional. Médicos y clínicas se califican mutuamente tras cada guardia finalizada.",
    span: "lg:col-span-1",
  },
  {
    icon: CalendarDays,
    title: "Agenda Inteligente",
    description:
      "Visualizá tus guardias disponibles, postulaciones pendientes y turnos confirmados en un calendario codificado por colores.",
    span: "lg:col-span-1",
  },
  {
    icon: Bell,
    title: "Alertas en Tiempo Real",
    description:
      "Recibí notificaciones directas cuando te asignan una guardia, hay una vacante urgente o si alguien cancela a último momento.",
    span: "lg:col-span-1",
  },
  {
    icon: UserX,
    title: "Gestión de Ausencias",
    description:
      "Sistema de penalizaciones transparente para reducir el ausentismo y garantizar que las instituciones siempre estén cubiertas.",
    span: "lg:col-span-2",
  },
]

export function Features() {
  return (
    <section id="features" className="relative py-16 sm:py-20 lg:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5">
            <span className="text-xs font-semibold tracking-wide text-primary uppercase">
              Funcionalidades
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-5xl text-balance">
            Todo lo que necesitás en un solo lugar
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg text-pretty">
            Herramientas diseñadas específicamente para la eficiencia del sector
            salud.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/[0.06] sm:rounded-2xl sm:p-7 ${feature.span}`}
            >
              {/* Glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10 transition-all group-hover:bg-primary/15 group-hover:ring-primary/20 group-hover:shadow-lg group-hover:shadow-primary/10 sm:mb-5 sm:h-12 sm:w-12 sm:rounded-xl">
                  <feature.icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-base font-bold text-foreground sm:text-lg">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
