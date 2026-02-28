"use client"

import { BadgePercent, ShieldCheck, Clock, Star } from "lucide-react"

const stats = [
  {
    value: "0%",
    label: "Comisiones",
    description: "Sin costos ocultos",
    icon: BadgePercent,
  },
  {
    value: "+500",
    label: "Guardias Cubiertas",
    description: "Y sigue creciendo",
    icon: ShieldCheck,
  },
  {
    value: "24/7",
    label: "Disponibilidad",
    description: "Siempre activos",
    icon: Clock,
  },
  {
    value: "4.9",
    label: "Calificación Promedio",
    description: "Excelencia médica",
    icon: Star,
  },
]

export function Stats() {
  return (
    <section className="relative -mt-12 z-10 mx-auto max-w-6xl px-4 sm:-mt-16 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-lg shadow-foreground/[0.03] transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/[0.06] sm:rounded-2xl sm:p-6"
          >
            <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-primary/[0.04] transition-all group-hover:bg-primary/[0.08] sm:h-24 sm:w-24 sm:translate-x-6 sm:-translate-y-6" />
            <div className="relative">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 sm:mb-3 sm:h-10 sm:w-10 sm:rounded-xl">
                <stat.icon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <p className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-foreground/80 sm:mt-1 sm:text-sm">
                {stat.label}
              </p>
              <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                {stat.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
