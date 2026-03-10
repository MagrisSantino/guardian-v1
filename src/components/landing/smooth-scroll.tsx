"use client"

import { type ReactNode } from "react"
import { ReactLenis } from "lenis/react" // <-- Cambiamos la importación acá

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root>
      {children}
    </ReactLenis>
  )
}