import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppNavbarWrapper from "@/components/AppNavbarWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#1a1f4b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita zoom accidental en inputs en celular
};

export const metadata: Metadata = {
  title: "Guardian - Plataforma de Guardias Médicas",
  description:
    "Conectamos talento médico con oportunidades reales. El ecosistema inteligente que simplifica la cobertura de guardias sin intermediarios.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Guardian",
  },
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-512.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground selection:bg-primary/20`}>
        <AppNavbarWrapper />
        {children}
      </body>
    </html>
  );
}