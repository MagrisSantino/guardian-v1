import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

// Configuramos la tipografía Inter
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Guardian - Gestión de Salud",
  description: "Ecosistema profesional para médicos y clínicas en Córdoba",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        // Inyectamos la variable de la fuente y activamos el antialiasing para que se vea suave
        className={`${inter.variable} font-sans antialiased bg-slate-950`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}