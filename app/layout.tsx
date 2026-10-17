import type { Metadata } from "next";
import { Inter, Outfit, Cairo } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/dictionaries";

import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "D-PHARMA - Gestion Intelligente d'Officine Pharmaceutique",
  description: "Logiciel SaaS complet pour pharmacies : point de vente, gestion des stocks et péremptions, commandes grossistes et trésorerie avec mode hors-ligne.",
  manifest: "/manifest.json"
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${cairo.variable} h-full antialiased`}>
      <body className={`min-h-full flex flex-col`}>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
