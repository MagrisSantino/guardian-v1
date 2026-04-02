import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppNavbarWrapper from "@/components/AppNavbarWrapper";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
    icon: [
      { url: "/icon-48.png",  sizes: "48x48",   type: "image/png" },
      { url: "/icon-96.png",  sizes: "96x96",   type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-180.png",
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
        <ServiceWorkerRegister />
        <AppNavbarWrapper />
        {children}
      </body>
    </html>
  );
}