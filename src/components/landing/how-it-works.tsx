import { UserPlus, Search, Handshake } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Creá tu Perfil",
    description:
      "Registrate gratis, cargá tu matrícula, especialidades y años de experiencia para validar tu identidad.",
  },
  {
    number: "02",
    icon: Search,
    title: "Explorá o Publicá",
    description:
      "Las clínicas publican sus necesidades. Los médicos filtran por valor, fecha y especialidad desde su Bolsa de Trabajo.",
  },
  {
    number: "03",
    icon: Handshake,
    title: "Match y Calificación",
    description:
      "La clínica selecciona al mejor candidato basándose en sus estrellas. Al finalizar, ambos se evalúan mutuamente.",
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-navy py-16 sm:py-20 lg:py-36"
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,.4) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute top-0 left-1/4 hidden sm:block">
        <div className="h-[300px] w-[300px] rounded-full bg-primary/15 blur-[100px] lg:h-[500px] lg:w-[500px] lg:blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
            <span className="text-xs font-semibold tracking-wide text-primary-foreground/80 uppercase">
              Proceso
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-primary-foreground sm:text-3xl lg:text-5xl text-balance">
            ¿Cómo funciona Guardian?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/50 sm:mt-5 sm:text-lg">
            Tres simples pasos para revolucionar tu forma de trabajar.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-12 sm:mt-16 lg:mt-20">
          {/* Connecting line (desktop) */}
          <div className="absolute top-24 left-[20%] right-[20%] hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block" />

          {/* Vertical connector (mobile + tablet) */}
          <div className="absolute top-0 bottom-0 left-[31px] w-px bg-gradient-to-b from-primary/30 via-primary/20 to-transparent sm:left-[39px] lg:hidden" />

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-6">
            {steps.map((step) => (
              <div key={step.number} className="group relative lg:text-center">
                {/* Mobile layout: horizontal step */}
                <div className="flex gap-5 lg:flex-col lg:items-center lg:gap-0">
                  {/* Step number */}
                  <div className="relative z-10 flex-shrink-0 lg:mb-8">
                    <div className="relative flex h-14 w-14 items-center justify-center sm:h-16 sm:w-16 lg:mx-auto">
                      {/* Glow ring */}
                      <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl transition-all group-hover:bg-primary/30 sm:rounded-2xl" />
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-primary/30 bg-navy-light shadow-lg shadow-primary/10 transition-all group-hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/20 sm:h-16 sm:w-16 sm:rounded-2xl">
                        <span className="bg-gradient-to-b from-primary-foreground to-primary-foreground/70 bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl">
                          {step.number}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1 lg:pt-0">
                    {/* Icon */}
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10 sm:mb-5 sm:h-14 sm:w-14 sm:rounded-xl lg:mx-auto">
                      <step.icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                    </div>

                    <h3 className="text-lg font-bold text-primary-foreground sm:text-xl">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-primary-foreground/50 sm:mt-3 lg:mx-auto">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
