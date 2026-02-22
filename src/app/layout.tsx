import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita zoom accidental en inputs en celular
};

export const metadata: Metadata = {
  title: "Guardian - Red Médica",
  description: "Ecosistema profesional para médicos y clínicas en Córdoba",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Guardian",
  },
  // ACÁ AGREGAMOS EL ÍCONO PARA APPLE
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
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 selection:bg-blue-200`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}