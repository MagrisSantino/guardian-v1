"use client"

import {
  ArrowRight,
  Calendar,
  Star,
  Bell,
  CheckCircle2,
  Clock,
  User,
} from "lucide-react"

function FloatingCard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-2xl border border-foreground/[0.06] bg-card/80 p-4 shadow-xl shadow-primary/5 backdrop-blur-md ${className ?? ""}`}
    >
      {children}
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-navy pt-24">
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[300px] w-[300px] rounded-full bg-primary/20 blur-[80px] sm:h-[450px] sm:w-[450px] sm:blur-[100px] lg:h-[600px] lg:w-[600px] lg:blur-[120px]" />
      </div>
      <div className="absolute right-0 bottom-0 hidden sm:block">
        <div className="h-[250px] w-[250px] rounded-full bg-trust-blue-light/10 blur-[80px] lg:h-[400px] lg:w-[400px] lg:blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 pb-20 pt-16 sm:pb-24 sm:pt-20 lg:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left: Copy */}
          <div className="relative z-10 mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            {/* Badge */}
            <div className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 sm:px-4 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-wide text-primary-foreground/80 uppercase">
                La red médica #1 de Córdoba
              </span>
            </div>

            <h1 className="text-3xl leading-[1.1] font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl text-balance">
              <span className="text-primary-foreground">
                Conectamos talento{" "}
              </span>
              <span className="text-primary-foreground">médico con </span>
              <span
                className="bg-gradient-to-r from-[#60a5fa] via-[#818cf8] to-[#a78bfa] bg-clip-text text-transparent"
              >
                oportunidades reales
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/60 sm:mt-6 sm:text-lg lg:mx-0">
              Guardian es el ecosistema inteligente que simplifica la cobertura
              de guardias. Sin intermediarios, sin demoras y con un sistema de
              reputación que premia la excelencia.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:gap-4 lg:justify-start">
              <a
                href="/registro"
                className="group relative z-10 cursor-pointer inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary/40 sm:w-auto"
              >
                Crear mi Cuenta Libre
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="/login"
                className="relative z-10 cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 px-7 py-3.5 text-sm font-semibold text-primary-foreground/90 backdrop-blur-sm transition-all hover:border-primary-foreground/20 hover:bg-primary-foreground/10 sm:w-auto"
              >
                Iniciar Sesión
              </a>
            </div>

            <div className="mt-8 flex items-center justify-center gap-4 sm:mt-10 sm:gap-6 lg:justify-start">
              <div className="flex -space-x-2">
                {[
                  "bg-blue-400",
                  "bg-emerald-400",
                  "bg-amber-400",
                  "bg-rose-400",
                ].map((bg, i) => (
                  <div
                    key={i}
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${bg} ring-2 ring-navy text-[10px] font-bold text-foreground sm:h-8 sm:w-8`}
                  >
                    <User className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-primary-foreground/50 sm:text-sm">
                <span className="font-semibold text-primary-foreground/80">
                  +500
                </span>{" "}
                profesionales ya confían en Guardian
              </p>
            </div>
          </div>

          {/* Right: Floating UI Mockup */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto w-full max-w-md">
              {/* Main dashboard card */}
              <FloatingCard className="relative z-10 !p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tus Guardias
                    </p>
                    <p className="mt-1 text-2xl font-bold text-card-foreground">
                      Marzo 2026
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                </div>

                {/* Calendar row mockup */}
                <div className="grid grid-cols-7 gap-1.5">
                  {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                    <div
                      key={i}
                      className="py-1 text-center text-[10px] font-semibold text-muted-foreground uppercase"
                    >
                      {d}
                    </div>
                  ))}
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                    const isBooked = [3, 7, 12, 15, 21, 25].includes(day)
                    const isPending = [5, 18].includes(day)
                    return (
                      <div
                        key={day}
                        className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                          isBooked
                            ? "bg-primary text-primary-foreground"
                            : isPending
                              ? "bg-amber-500/15 text-amber-600"
                              : "text-card-foreground/60 hover:bg-secondary"
                        }`}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
              </FloatingCard>

              {/* Floating notification */}
              <FloatingCard className="absolute -top-4 -right-8 z-20 !p-3 animate-[float_6s_ease-in-out_infinite]">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-card-foreground">
                      Guardia Confirmada
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Hospital Central - 20hs
                    </p>
                  </div>
                </div>
              </FloatingCard>

              {/* Floating rating */}
              <FloatingCard className="absolute -bottom-6 -left-10 z-20 !p-3 animate-[float_5s_ease-in-out_0.5s_infinite]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-card-foreground">
                      4.9 Calificación
                    </p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className="h-2.5 w-2.5 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </FloatingCard>

              {/* Floating alert */}
              <FloatingCard className="absolute top-1/2 -right-14 z-20 !p-3 animate-[float_7s_ease-in-out_1s_infinite]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-card-foreground">
                      Nueva Vacante
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      Hace 2 min
                    </div>
                  </div>
                </div>
              </FloatingCard>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </section>
  )
}
