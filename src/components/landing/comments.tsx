import { MessageCircle, Lock, Star } from "lucide-react"

const testimonials = [
  {
    quote:
      "Por fin una plataforma seria para cubrir guardias. Sin grupos de WhatsApp ni llamadas perdidas. Guardian cumple.",
    author: "Dra. María L.",
    role: "Médica general",
    rating: 5,
  },
  {
    quote:
      "Como clínica nos simplificó mucho la búsqueda de reemplazos. Los perfiles verificados nos dan tranquilidad.",
    author: "Clínica Sanatorio del Sur",
    role: "Institución",
    rating: 5,
  },
  {
    quote:
      "La calificación mutua hace que todos se comprometan. Se nota la diferencia con otros sistemas.",
    author: "Dr. Pablo R.",
    role: "Emergentólogo",
    rating: 5,
  },
]

export function Comments() {
  return (
    <section
      id="comments"
      className="relative overflow-hidden bg-navy py-16 sm:py-20 lg:py-36"
    >
      {/* Background pattern - mismo que HowItWorks */}
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
            <MessageCircle className="h-3.5 w-3.5 text-primary-foreground/80" />
            <span className="text-xs font-semibold tracking-wide text-primary-foreground/80 uppercase">
              Comentarios
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-primary-foreground sm:text-3xl lg:text-5xl text-balance">
            Tu voz importa
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/50 sm:mt-5 sm:text-lg text-pretty">
            Dejanos tu comentario o sugerencias para seguir mejorando. En
            Guardian lo que más nos importa es estar al servicio de la salud y
            de sus profesionales.
          </p>
        </div>

        {/* Testimonios aprobados */}
        <div className="relative mt-12 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-6">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="group relative overflow-hidden rounded-xl border border-primary/20 bg-navy-light p-5 shadow-lg shadow-primary/5 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 sm:rounded-2xl sm:p-6"
            >
              <div className="mb-3 flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-primary-foreground/80 text-pretty sm:text-base">
                &quot;{t.quote}&quot;
              </p>
              <p className="mt-4 text-xs font-semibold text-primary-foreground sm:text-sm">
                {t.author}
              </p>
              <p className="text-xs text-primary-foreground/50">{t.role}</p>
            </div>
          ))}
        </div>

        {/* Bloque protegido / CTA */}
        <div className="relative mx-auto mt-12 max-w-2xl overflow-hidden rounded-2xl border border-primary/20 bg-navy-light p-6 shadow-xl shadow-primary/5 sm:mt-16 sm:p-8 lg:mt-20 lg:p-10">
          <div className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div className="relative pr-12 sm:pr-14">
            <p className="text-center text-base leading-relaxed text-primary-foreground/90 text-pretty sm:text-lg">
              Para dejar un comentario o sugerencia debes ser un usuario
              verificado de Guardian.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
              <a
                href="/registro"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] hover:shadow-xl sm:w-auto"
              >
                Crear cuenta
              </a>
              <a
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 px-6 py-3 text-sm font-semibold text-primary-foreground/90 backdrop-blur-sm transition-all hover:bg-primary-foreground/10 sm:w-auto"
              >
                Iniciar sesión
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
