import Link from "next/link"
import { Shield, Instagram, Linkedin, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col items-center gap-5 text-center sm:gap-6 md:flex-row md:justify-between md:text-left">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Guardian
            </span>
          </Link>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground sm:text-sm">
            2026 Guardian. Plataforma de Salud. Todos los derechos reservados.
          </p>

          {/* Links legales + Redes */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8 md:gap-10">
            <div className="flex items-center gap-5 sm:gap-6">
              <a
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
              >
                Soporte
              </a>
              <a
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
              >
                Términos
              </a>
              <a
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
              >
                Privacidad
              </a>
            </div>
            <div className="flex items-center gap-4" aria-label="Redes sociales">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:shadow-md"
                title="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:shadow-md"
                title="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:shadow-md"
                title="X (Twitter)"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
