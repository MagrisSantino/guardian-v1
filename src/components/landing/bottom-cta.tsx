import { ArrowRight } from "lucide-react"

export function BottomCTA() {
  return (
    <section className="relative px-4 pb-16 sm:px-6 sm:pb-20 lg:pb-36">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl bg-navy p-8 sm:rounded-3xl sm:p-12 lg:p-20">
        {/* Background effects */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute top-0 right-0 hidden sm:block">
          <div className="h-[300px] w-[300px] -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/20 blur-[80px] lg:h-[400px] lg:w-[400px] lg:blur-[100px]" />
        </div>
        <div className="absolute bottom-0 left-0 hidden sm:block">
          <div className="h-[200px] w-[200px] translate-y-1/2 -translate-x-1/2 rounded-full bg-trust-blue-light/15 blur-[60px] lg:h-[300px] lg:w-[300px] lg:blur-[80px]" />
        </div>

        <div className="relative text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-5xl text-balance">
            <span className="text-primary-foreground">
              ¿Listo para evolucionar{" "}
            </span>
            <span className="bg-gradient-to-r from-[#60a5fa] via-[#818cf8] to-[#a78bfa] bg-clip-text text-transparent">
              tu gestión?
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-primary-foreground/55 sm:mt-6 sm:text-lg">
            Unite a la comunidad médica más moderna hoy mismo. Es 100% gratis
            para profesionales de la salud.
          </p>

          <div className="relative z-10 mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href="/registro"
              className="cursor-pointer group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary/40 sm:w-auto sm:py-4"
            >
              Comenzar Ahora
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="/login"
              className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 px-8 py-3.5 text-sm font-semibold text-primary-foreground/90 backdrop-blur-sm transition-all hover:border-primary-foreground/20 hover:bg-primary-foreground/10 sm:w-auto sm:py-4"
            >
              Ya tengo cuenta
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
