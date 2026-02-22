import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Agregamos la configuración para la App Móvil
export const viewport: Viewport = {
  themeColor: "#0f172a", // Color de la barra superior del celular
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Evita que el celular haga zoom al tocar inputs
};

export const metadata: Metadata = {
  title: "Guardian - Gestión de Salud",
  description: "Ecosistema profesional para médicos y clínicas en Córdoba",
  manifest: "/manifest.json", // Archivo que le dice al celu cómo instalar la app
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Guardian",
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
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}