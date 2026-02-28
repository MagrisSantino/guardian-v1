import { Heart } from "lucide-react"

export function Purpose() {
  return (
    <section id="purpose" className="relative py-16 sm:py-20 lg:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5">
            <Heart className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-wide text-primary uppercase">
              Nuestro Propósito
            </span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-5xl text-balance">
            Tecnología al servicio de la salud
          </h2>

          <div className="relative mt-8 sm:mt-10">
            {/* Quote marks deco */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-6xl font-serif text-primary/10 select-none leading-none sm:-top-6 sm:text-8xl">&quot;</div>
            <p className="relative text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl lg:leading-relaxed text-pretty">
              En Argentina, conseguir cobertura médica de urgencia suele ser un
              proceso caótico y desgastante. Guardian nace para profesionalizar
              esta conexión. Queremos que el foco de las instituciones esté en
              salvar vidas, no en buscar reemplazos, y que los médicos sean
              valorados justamente por su responsabilidad y trato humano.
            </p>
          </div>

          <div className="mx-auto mt-8 h-px w-16 bg-gradient-to-r from-transparent via-primary/40 to-transparent sm:mt-12 sm:w-24" />

          <p className="mt-8 text-sm font-bold tracking-widest text-primary uppercase">
            Tecnología al servicio de la salud.
          </p>
        </div>
      </div>
    </section>
  )
}
